import { afterEach, describe, expect, it } from 'vitest';
import { asUserId } from '@group9/shared';
import { createOperationDispatcher } from '../../src/backend/application/operation-dispatcher.js';
import { createSourceUnitOfWork } from '../../src/backend/persistence/source-unit-of-work.js';
import { UnknownTransactionOutcomeError } from '../../src/backend/application/unit-of-work.js';
import { createHarnessFixture, openOwnedDisposable, revision, sourceState } from '../fixtures/g1-b2-disposable-database.js';
import { commandRole } from '../fixtures/g1-f203-command.js';

const fixtures: ReturnType<typeof createHarnessFixture>[] = [];
function fixture(options?: Parameters<typeof createHarnessFixture>[0]) {
  const f = createHarnessFixture(options);
  fixtures.push(f);
  return f;
}
afterEach(() => { for (const f of fixtures.splice(0)) f.close(); });

function rejected(action: () => unknown): Error & { code?: string } {
  let caught: unknown;
  try { action(); } catch (error) { caught = error; }
  expect(caught).toBeInstanceOf(Error);
  expect(caught).not.toHaveProperty('savedChange');
  expect(caught).not.toHaveProperty('ok', true);
  return caught as Error & { code?: string };
}

function expectHealthy(f: ReturnType<typeof createHarnessFixture>) {
  expect(f.sqlite.open).toBe(true);
  expect(f.sqlite.inTransaction).toBe(false);
}

const testAuthority = {
  resolveActor: () => asUserId('U1'),
  runtimePolicy: () => ({ f3Enabled: false, f4Enabled: false, f6Enabled: false, datePolicy: 'UNRESOLVED' as const }),
};

describe('F2-03 project-scoped member role changes in disposable SQLite', () => {
  it('promotes a member and returns only the actual committed role, timestamps and one Revision', () => {
    const f = fixture({ f3Enabled: false });
    const before = sourceState(f.sqlite);
    const result = f.dispatcher.dispatch(commandRole());
    const after = sourceState(f.sqlite);
    const target = (after.project_members as Record<string, unknown>[]).find((row) => row.member_id === 'M2')!;
    const previous = (before.project_members as Record<string, unknown>[]).find((row) => row.member_id === 'M2')!;
    expect(typeof target.updated_at).toBe('string');
    expect(target.updated_at).not.toBe(previous.updated_at);
    expect(Number.isNaN(Date.parse(target.updated_at as string))).toBe(false);
    expect(after).toEqual({
      ...before,
      project_members: (before.project_members as Record<string, unknown>[]).map((row) =>
        row.member_id === 'M2' ? { ...row, role: 'LEADER', updated_at: target.updated_at } : row),
      projects: (before.projects as Record<string, unknown>[]).map((row) =>
        row.project_id === 'P1' ? { ...row, revision: 2, updated_at: target.updated_at } : row),
    });
    expect(result).toEqual({
      ok: true, projectId: 'P1', revision: 2,
      value: { memberId: 'M2', role: 'LEADER', updatedAt: target.updated_at },
      savedChange: { projectId: 'P1', revision: 2, changeKind: 'F2-03', affectedTaskIds: [], changedFields: ['role'] },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.savedChange)).toBe(true);
    expect(f.uow.diagnostics()).toMatchObject([{ operationId: 'F2-03', outcome: 'COMMITTED' }]);
    expectHealthy(f);
  });

  it('demotes another active Leader while the caller remains an active Leader', () => {
    const f = fixture();
    f.dispatcher.dispatch(commandRole());
    const result = f.dispatcher.dispatch(commandRole('MEMBER', 'M2', 2));
    expect(result).toMatchObject({ revision: 3, value: { memberId: 'M2', role: 'MEMBER' } });
    expect(revision(f.sqlite)).toBe(3);
    expect(f.sqlite.prepare("SELECT member_id AS memberId FROM project_members WHERE project_id='P1' AND active=1 AND left_at IS NULL AND role='LEADER'").all()).toEqual([{ memberId: 'M1' }]);
  });

  it('allows a Leader to demote themself when another active Leader remains, without retaining Leader authority', () => {
    const f = fixture();
    f.dispatcher.dispatch(commandRole());
    const result = f.dispatcher.dispatch(commandRole('MEMBER', 'M1', 2));
    expect(result).toMatchObject({ revision: 3, value: { memberId: 'M1', role: 'MEMBER' } });
    const after = sourceState(f.sqlite);
    expect(f.sqlite.prepare("SELECT member_id AS memberId FROM project_members WHERE project_id='P1' AND active=1 AND left_at IS NULL AND role='LEADER'").all()).toEqual([{ memberId: 'M2' }]);
    expect(rejected(() => f.dispatcher.dispatch(commandRole('LEADER', 'M1', 3))).code).toBe('FORBIDDEN');
    expect(sourceState(f.sqlite)).toEqual(after);
  });

  it('rejects sole-Leader demotion even if an inactive local or active foreign Leader exists', () => {
    const f = fixture();
    f.sqlite.prepare("UPDATE project_members SET role='LEADER' WHERE project_id='P1' AND member_id='M3'").run();
    const before = sourceState(f.sqlite);
    expect(rejected(() => f.dispatcher.dispatch(commandRole('MEMBER', 'M1'))).code).toBe('LAST_LEADER');
    expect(sourceState(f.sqlite)).toEqual(before);
    expect(f.uow.diagnostics()).toMatchObject([{ operationId: 'F2-03', outcome: 'ROLLED_BACK' }]);
  });

  it.each([['MEMBER', 'M2'], ['LEADER', 'M1']] as const)('rejects same-role %s without any source or receipt change', (role, target) => {
    const f = fixture();
    const before = sourceState(f.sqlite);
    expect(rejected(() => f.dispatcher.dispatch(commandRole(role, target)))).toMatchObject({
      code: 'INVALID_INPUT',
      message: expect.stringMatching(/no (?:changes?|semantic source change)/i),
    });
    expect(sourceState(f.sqlite)).toEqual(before);
    expect(revision(f.sqlite)).toBe(1);
    expect(f.uow.diagnostics()).toMatchObject([{ operationId: 'F2-03', outcome: 'ROLLED_BACK' }]);
    expectHealthy(f);
  });

  it.each([
    ['U2', 'FORBIDDEN'],
    ['U3', 'INVALID_OR_INACCESSIBLE_PROJECT'],
    ['U4', 'INVALID_OR_INACCESSIBLE_PROJECT'],
    ['U404', 'INVALID_OR_INACCESSIBLE_PROJECT'],
  ])('rejects unauthorized actor %s before Revision, target, or no-op checks', (actorId, code) => {
    const f = fixture({ actorId });
    const before = sourceState(f.sqlite);
    expect(rejected(() => f.dispatcher.dispatch(commandRole('MEMBER', 'M2', 2))).code).toBe(code);
    expect(rejected(() => f.dispatcher.dispatch(commandRole('LEADER', 'missing'))).code).toBe(code);
    expect(sourceState(f.sqlite)).toEqual(before);
  });

  it('rejects missing, inactive and foreign targets with the same scoped error', () => {
    const f = fixture();
    const before = sourceState(f.sqlite);
    const errors = ['missing', 'M3', 'M4'].map((id) => rejected(() => f.dispatcher.dispatch(commandRole('LEADER', id))));
    for (const error of errors) expect(error.code).toBe('INVALID_OR_INACCESSIBLE_REFERENCE');
    expect(new Set(errors.map((error) => error.message)).size).toBe(1);
    expect(sourceState(f.sqlite)).toEqual(before);
  });

  it('rejects a stale Revision before comparing the role or resolving the target', () => {
    const f = fixture();
    const before = sourceState(f.sqlite);
    expect(rejected(() => f.dispatcher.dispatch(commandRole('MEMBER', 'M2', 2))).code).toBe('REVISION_CONFLICT');
    expect(rejected(() => f.dispatcher.dispatch(commandRole('MEMBER', 'missing', 2))).code).toBe('REVISION_CONFLICT');
    expect(sourceState(f.sqlite)).toEqual(before);
  });

  it('requires injected trusted authority and rejects actor claims in operation data', () => {
    const f = fixture({ actorId: 'U2' });
    const before = sourceState(f.sqlite);
    const noAuthority = createOperationDispatcher(createSourceUnitOfWork(f.sqlite));
    expect(rejected(() => noAuthority.dispatch(commandRole())).code).toBe('IDENTITY_NOT_CONFIGURED');
    expect(rejected(() => f.dispatcher.dispatch({ ...commandRole(), verifiedActorId: 'U1' })).code).toBe('INVALID_INPUT');
    expect(rejected(() => f.dispatcher.dispatch(commandRole())).code).toBe('FORBIDDEN');
    expect(sourceState(f.sqlite)).toEqual(before);
  });

  it('holds the SQLite write lock across the scoped mutation, then rejects the competing stale writer', () => {
    let overlapping: ReturnType<typeof createOperationDispatcher>;
    let competingError: unknown;
    let overlapAttempts = 0;
    const f = fixture({ hooks: () => ({ beforePersist: () => {
      overlapAttempts++;
      try { overlapping.dispatch(commandRole('LEADER', 'M3')); } catch (error) { competingError = error; }
    } }) });
    f.sqlite.prepare("UPDATE project_members SET active=1,left_at=NULL WHERE project_id='P1' AND member_id='M3'").run();
    const second = openOwnedDisposable(f.filename);
    try {
      overlapping = createOperationDispatcher(createSourceUnitOfWork(second, { authority: testAuthority }));
      expect(f.dispatcher.dispatch(commandRole()).revision).toBe(2);
      expect(overlapAttempts).toBe(1);
      expect(competingError).toMatchObject({ code: 'SQLITE_BUSY' });
      expect(competingError).not.toHaveProperty('savedChange');
      expect(rejected(() => overlapping.dispatch(commandRole('LEADER', 'M3'))).code).toBe('REVISION_CONFLICT');
      expect(revision(second)).toBe(2);
      expect(second.prepare("SELECT member_id AS memberId,role FROM project_members WHERE member_id IN ('M2','M3') ORDER BY member_id").all())
        .toEqual([{ memberId: 'M2', role: 'LEADER' }, { memberId: 'M3', role: 'MEMBER' }]);
    } finally { second.close(); }
  });

  it.each(['beforePersist', 'beforeCommit'] as const)('rolls back after a controlled %s fault, then accepts a fresh dispatch', (phase) => {
    let injectFailure = true;
    let snapshotAtFault: ReturnType<typeof sourceState> | undefined;
    const f = fixture({ hooks: (db) => ({ [phase]: () => {
      if (injectFailure) {
        snapshotAtFault = sourceState(db);
        throw new Error('Controlled role mutation fault');
      }
    } }) });
    const before = sourceState(f.sqlite);
    expect(rejected(() => f.dispatcher.dispatch(commandRole())).message).toContain('Controlled role mutation fault');
    if (phase === 'beforePersist') expect(snapshotAtFault).toEqual(before);
    else {
      expect(snapshotAtFault?.project_members).toContainEqual(expect.objectContaining({ member_id: 'M2', role: 'LEADER' }));
      expect(snapshotAtFault?.projects).toContainEqual(expect.objectContaining({ project_id: 'P1', revision: 2 }));
    }
    expect(sourceState(f.sqlite)).toEqual(before);
    expect(f.uow.diagnostics()).toMatchObject([{ outcome: 'ROLLED_BACK' }]);
    expectHealthy(f);
    injectFailure = false;
    expect(f.dispatcher.dispatch(commandRole()).revision).toBe(2);
  });

  it('rolls back a real SQLite write fault that occurs after changing the target row', () => {
    const f = fixture();
    const before = sourceState(f.sqlite);
    f.sqlite.exec(`
      CREATE TEMP TRIGGER role_write_fault AFTER UPDATE OF role ON project_members
      WHEN NEW.project_id = 'P1' AND NEW.member_id = 'M2'
      BEGIN SELECT RAISE(FAIL, 'Controlled SQLite role write fault'); END;
    `);
    expect(rejected(() => f.dispatcher.dispatch(commandRole())).message).toContain('Controlled SQLite role write fault');
    expect(sourceState(f.sqlite)).toEqual(before);
    expect(f.uow.diagnostics()).toMatchObject([{ outcome: 'ROLLED_BACK' }]);
    expectHealthy(f);
    f.sqlite.exec('DROP TRIGGER role_write_fault');
    expect(f.dispatcher.dispatch(commandRole()).revision).toBe(2);
  });

  it('rechecks the trusted caller before COMMIT even when the replacement actor is the promoted member', () => {
    let f: ReturnType<typeof createHarnessFixture>;
    f = fixture({ hooks: () => ({ beforeCommit: () => { f.state.actorId = 'U2'; } }) });
    const before = sourceState(f.sqlite);
    expect(rejected(() => f.dispatcher.dispatch(commandRole())).code).toBe('FORBIDDEN');
    expect(sourceState(f.sqlite)).toEqual(before);
    expect(f.uow.diagnostics()).toMatchObject([{ outcome: 'ROLLED_BACK' }]);
  });

  it('returns success only after COMMIT confirmation, and retains UNKNOWN if confirmation is lost', () => {
    let f: ReturnType<typeof createHarnessFixture>;
    let commitCalls = 0;
    f = fixture({ hooks: (db) => ({ commit: () => {
      expect(f.uow.diagnostics()).toEqual([]);
      commitCalls++;
      db.exec('COMMIT');
      throw new Error('Controlled role COMMIT acknowledgement loss');
    } }) });
    const error = rejected(() => f.dispatcher.dispatch(commandRole()));
    expect(error).toBeInstanceOf(UnknownTransactionOutcomeError);
    expect(error).toMatchObject({ code: 'UNKNOWN_TRANSACTION_OUTCOME', outcome: 'UNKNOWN' });
    expect(commitCalls).toBe(1);
    expect(f.sqlite.open).toBe(false);
    expect(f.uow.diagnostics()).toMatchObject([{ outcome: 'UNKNOWN' }]);
    const durable = openOwnedDisposable(f.filename, { readonly: true });
    try {
      expect(revision(durable)).toBe(2);
      expect(durable.prepare("SELECT role FROM project_members WHERE project_id='P1' AND member_id='M2'").get()).toEqual({ role: 'LEADER' });
    } finally { durable.close(); }
  });

  it('allows only the bound intent and closes the capability even after a caught input error', () => {
    let stage!: () => void;
    const f = fixture({ handlers: { 'F2-03': (capability) => {
      expect(Object.getPrototypeOf(capability)).toBeNull();
      expect(Object.isFrozen(capability)).toBe(true);
      expect(Reflect.ownKeys(capability)).toEqual(['stageTargetRole']);
      stage = (capability as { stageTargetRole(): void }).stageTargetRole;
      expect(rejected(() => Reflect.apply(stage, undefined, ['MEMBER'])).code).toBe('INVALID_INPUT');
    } } });
    const before = sourceState(f.sqlite);
    expect(rejected(() => f.dispatcher.dispatch(commandRole())).code).toBe('INVALID_INPUT');
    expect(rejected(() => stage()).code).toBe('TRANSACTION_CLOSED');
    expect(sourceState(f.sqlite)).toEqual(before);
  });

  it('rejects caller-selected callbacks and mutation plans without reopening generic run', () => {
    const f = fixture();
    const before = sourceState(f.sqlite);
    let called = false;
    const callback = () => { called = true; };
    expect(rejected(() => f.dispatcher.dispatch({ ...commandRole(), handler: callback })).code).toBe('INVALID_INPUT');
    expect(rejected(() => f.dispatcher.dispatch({ ...commandRole(), mutationPlan: { memberships: [] } })).code).toBe('INVALID_INPUT');
    const input = { verifiedActorId: asUserId('U1'), projectId: commandRole().projectId, expectedRevision: 1, authorize: callback };
    expect(rejected(() => f.uow.run(input, callback)).code).toBe('OPERATION_NOT_ENABLED');
    expect(called).toBe(false);
    expect(sourceState(f.sqlite)).toEqual(before);
  });
});
