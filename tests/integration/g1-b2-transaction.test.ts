import { afterEach, describe, expect, it } from 'vitest';
import { closeSync, openSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { asUserId } from '@group9/shared';
import { createSourceUnitOfWork } from '../../src/backend/persistence/source-unit-of-work.js';
import { createOperationDispatcher } from '../../src/backend/application/operation-dispatcher.js';
import type { TaskNameCapability } from '../../src/backend/application/unit-of-work.js';
import { commandName, createHarnessFixture, disposableRoot, isolatedSourceRoot, openOwnedDisposable, revision, sourceState } from '../fixtures/g1-b2-disposable-database.js';

const fixtures: ReturnType<typeof createHarnessFixture>[] = [];
const fixture = (options: Parameters<typeof createHarnessFixture>[0] = {}) => { const f = createHarnessFixture(options); fixtures.push(f); return f; };
afterEach(() => { for (const f of fixtures.splice(0)) f.close(); });
function errorOf(action: () => unknown): Error & { code?: string } {
  let caught: unknown;
  try { action(); } catch (error) { caught = error; }
  expect(caught).toBeInstanceOf(Error);
  expect(caught).not.toHaveProperty('savedChange'); expect(caught).not.toHaveProperty('ok', true);
  return caught as Error & { code?: string };
}
describe('G1-A disposable transaction/name/Revision acceptance', () => {
  it('initializes only the unchanged baseline tables/triggers, without a migration history or fake Git marker', () => {
    const f = fixture();
    const tables = f.sqlite.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
    expect(tables).toEqual(['progress_notes', 'project_members', 'projects', 'task_dependencies', 'tasks', 'users'].map((name) => ({ name })));
    expect(f.sqlite.prepare("SELECT name FROM sqlite_schema WHERE type='trigger' ORDER BY name").all()).toEqual([{ name: 'tasks_duration_no_nul_insert' }, { name: 'tasks_duration_no_nul_update' }]);
    expect(f.sqlite.pragma('foreign_keys', { simple: true })).toBe(1);
    const before = sourceState(f.sqlite);
    expect(() => f.sqlite.prepare('UPDATE tasks SET duration_days=? WHERE task_id=?').run('1\0bad', 'A')).toThrow();
    expect(sourceState(f.sqlite)).toEqual(before);
  });
  it('rejects escaping and existing fixture paths before opening arbitrary data', () => {
    const f = fixture();
    expect(() => createHarnessFixture({ filename: join(isolatedSourceRoot, 'outside.sqlite') })).toThrow();
    expect(() => createHarnessFixture({ filename: join(disposableRoot, '..', 'escape.sqlite') })).toThrow();
    expect(() => createHarnessFixture({ filename: f.filename })).toThrow();
    expect(() => openOwnedDisposable(join(isolatedSourceRoot, 'node_modules/@group9/backend/outside.sqlite'))).toThrow();
    const unknown = join(disposableRoot, `${randomUUID()}.sqlite`); closeSync(openSync(unknown, 'wx'));
    expect(() => openOwnedDisposable(unknown)).toThrow('ownership');
    expect(readFileSync(unknown)).toHaveLength(0);
  });
  it('changes only the task name/timestamps and one project Revision after confirmed COMMIT', () => {
    const f = fixture(); const before = sourceState(f.sqlite);
    const result = f.dispatcher.dispatch(commandName('Approved new name'));
    expect(result).toMatchObject({ ok: true, projectId: 'P1', revision: 2, value: { taskId: 'A', name: 'Approved new name' }, savedChange: { projectId: 'P1', revision: 2, changeKind: 'F2-07', affectedTaskIds: ['A'], changedFields: ['name'] } });
    const after = sourceState(f.sqlite);
    const oldTask = (before.tasks as Record<string, unknown>[]).find((t) => t.task_id === 'A')!;
    const newTask = (after.tasks as Record<string, unknown>[]).find((t) => t.task_id === 'A')!;
    expect(newTask).toEqual({ ...oldTask, name: 'Approved new name', updated_at: newTask.updated_at });
    expect(newTask.updated_at).not.toBe(oldTask.updated_at);
    for (const table of ['users', 'project_members', 'task_dependencies', 'progress_notes']) expect(after[table]).toEqual(before[table]);
    expect((after.projects as Record<string, unknown>[]).find((p) => p.project_id === 'P2')).toEqual((before.projects as Record<string, unknown>[]).find((p) => p.project_id === 'P2'));
    expect(Object.isFrozen(result)).toBe(true); expect(Object.isFrozen(result.savedChange)).toBe(true);
    expect(f.uow.diagnostics()).toMatchObject([{ outcome: 'COMMITTED' }]);
  });
  it('rejects same-name MAT-05 without changing any source/timestamp/Revision or emitting success', () => {
    const f = fixture(); const before = sourceState(f.sqlite);
    expect(errorOf(() => f.dispatcher.dispatch(commandName('Synthetic A')))).toMatchObject({ code: 'INVALID_INPUT' });
    expect(sourceState(f.sqlite)).toEqual(before); expect(f.sqlite.open).toBe(true); expect(f.sqlite.inTransaction).toBe(false);
    expect(f.uow.diagnostics()).toMatchObject([{ outcome: 'ROLLED_BACK' }]);
  });
  it('checks authorization and expected Revision before same-value no-op classification', () => {
    const member = fixture({ actorId: 'U2' });
    expect(errorOf(() => member.dispatcher.dispatch(commandName('Synthetic A'))).code).toBe('FORBIDDEN');
    const leader = fixture();
    expect(errorOf(() => leader.dispatcher.dispatch(commandName('Synthetic A', 2))).code).toBe('REVISION_CONFLICT');
  });
  it('rejects every non-name F2-07 field without side effects', () => {
    const f = fixture(); const before = sourceState(f.sqlite);
    for (const key of ['assigneeId', 'durationDays', 'taskDeadline', 'status', 'dependencies', 'projectId', 'priority', 'description'])
      expect(() => f.dispatcher.dispatch({ ...commandName(), payload: { taskId: 'A', name: 'Changed', [key]: null } })).toThrow();
    expect(sourceState(f.sqlite)).toEqual(before);
  });
  it('uses the same safe failure for missing and foreign-project task IDs', () => {
    const f = fixture(); const before = sourceState(f.sqlite);
    const missing = errorOf(() => f.dispatcher.dispatch(commandName('Changed', 1, 'missing')));
    const foreign = errorOf(() => f.dispatcher.dispatch(commandName('Changed', 1, 'X')));
    expect(foreign.code).toBe(missing.code); expect(foreign.message).toBe(missing.message); expect(sourceState(f.sqlite)).toEqual(before);
  });
  it.each(['U2', 'U3', 'U404'])('rejects current unauthorized actor %s without modifying source', (actorId) => {
    const f = fixture({ actorId }); const before = sourceState(f.sqlite);
    expect(() => f.dispatcher.dispatch(commandName())).toThrow(); expect(sourceState(f.sqlite)).toEqual(before);
  });
  it('reads membership from the protected transaction rather than a stale prior role', () => {
    const f = fixture(); f.sqlite.prepare("UPDATE project_members SET role='MEMBER' WHERE member_id='M1'").run();
    const before = sourceState(f.sqlite); expect(errorOf(() => f.dispatcher.dispatch(commandName())).code).toBe('FORBIDDEN'); expect(sourceState(f.sqlite)).toEqual(before);
  });
  it('rejects Revision overflow before any source mutation', () => {
    const f = fixture(); f.sqlite.prepare('UPDATE projects SET revision=? WHERE project_id=?').run(Number.MAX_SAFE_INTEGER, 'P1');
    const before = sourceState(f.sqlite); expect(errorOf(() => f.dispatcher.dispatch(commandName('Changed', Number.MAX_SAFE_INTEGER))).code).toBe('INVALID_INPUT'); expect(sourceState(f.sqlite)).toEqual(before);
  });
  it('detects A-to-B-to-A name cancellation as semantic net-zero', () => {
    const f = fixture({ handlers: { 'F2-07': (cap) => {
      const c = cap as TaskNameCapability; const old = c.readTaskToUpdateFields();
      c.stageTaskAllowedFields({ name: 'Temporary' }); c.stageTaskAllowedFields({ name: old.name });
    } } });
    const before = sourceState(f.sqlite); expect(errorOf(() => f.dispatcher.dispatch(commandName())).code).toBe('INVALID_INPUT'); expect(sourceState(f.sqlite)).toEqual(before);
  });
  it('commits several name stages once and constructs its result from the actual final source', () => {
    const f = fixture({ handlers: { 'F2-07': (cap) => {
      const c = cap as TaskNameCapability; c.stageTaskAllowedFields({ name: 'Intermediate' }); c.stageTaskAllowedFields({ name: 'Actual final name' });
    } } });
    const result = f.dispatcher.dispatch(commandName('Input is not a success assertion'));
    expect(result.value).toEqual({ taskId: 'A', name: 'Actual final name' }); expect(revision(f.sqlite)).toBe(2);
  });
  it('returns a frozen bound identity/name projection without leaking a full task row', () => {
    let projection: unknown;
    const f = fixture({ handlers: { 'F2-07': (cap) => {
      const c = cap as TaskNameCapability; projection = c.readTaskToUpdateFields(); expect(Reflect.ownKeys(projection as object).sort()).toEqual(['name', 'taskId']);
      expect(Object.isFrozen(projection)).toBe(true); c.stageTaskAllowedFields({ name: 'Changed' });
    } } });
    f.dispatcher.dispatch(commandName()); expect(projection).toEqual({ taskId: 'A', name: 'Synthetic A' });
  });
  it('invalidates retained capabilities after a successful transaction', () => {
    let retained!: TaskNameCapability;
    const f = fixture({ handlers: { 'F2-07': (cap) => { retained = cap as TaskNameCapability; retained.stageTaskAllowedFields({ name: 'Changed' }); } } });
    f.dispatcher.dispatch(commandName()); const after = sourceState(f.sqlite);
    expect(errorOf(() => retained.readTaskToUpdateFields()).code).toBe('TRANSACTION_CLOSED');
    expect(errorOf(() => retained.stageTaskAllowedFields({ name: 'Escaped' })).code).toBe('TRANSACTION_CLOSED'); expect(sourceState(f.sqlite)).toEqual(after);
  });
  it('keeps the whole transaction poisoned after a caught capability validation failure', () => {
    let retained!: TaskNameCapability;
    const f = fixture({ handlers: { 'F2-07': (cap) => {
      retained = cap as TaskNameCapability;
      try { retained.stageTaskAllowedFields({ name: 'Changed', status: 'COMPLETED' } as never); } catch { /* Caller cannot unpoison. */ }
      expect(() => retained.readTaskToUpdateFields()).toThrow();
    } } });
    const before = sourceState(f.sqlite); expect(() => f.dispatcher.dispatch(commandName())).toThrow(); expect(sourceState(f.sqlite)).toEqual(before);
    expect(errorOf(() => retained.stageTaskAllowedFields({ name: 'Escaped' })).code).toBe('TRANSACTION_CLOSED');
  });
  it('poisons the outer operation even when a re-entry exception is caught by its handler', () => {
    let f: ReturnType<typeof createHarnessFixture>;
    f = fixture({ handlers: { 'F2-07': (cap) => {
      try { f.dispatcher.dispatch(commandName('Nested')); } catch { /* Still poison outer transaction. */ }
      try { (cap as TaskNameCapability).stageTaskAllowedFields({ name: 'Outer' }); } catch { /* Lease is closed too. */ }
    } } });
    const before = sourceState(f.sqlite); expect(() => f.dispatcher.dispatch(commandName())).toThrow(); expect(sourceState(f.sqlite)).toEqual(before);
  });
  it('closes capabilities before examining a returned then getter', () => {
    let getterSawClosed = false;
    const f = fixture({ handlers: { 'F2-07': (cap) => {
      const c = cap as TaskNameCapability; c.stageTaskAllowedFields({ name: 'Changed' });
      return Object.defineProperty({}, 'then', { get() {
        try { c.stageTaskAllowedFields({ name: 'Getter escaped' }); } catch (error) { getterSawClosed = (error as { code?: string }).code === 'TRANSACTION_CLOSED'; }
        return undefined;
      } });
    } } });
    const before = sourceState(f.sqlite); expect(() => f.dispatcher.dispatch(commandName())).toThrow(); expect(getterSawClosed).toBe(true); expect(sourceState(f.sqlite)).toEqual(before);
  });
  it('rejects asynchronous handlers and denies their post-await capability use', async () => {
    let lateError: unknown;
    const f = fixture({ handlers: { 'F2-07': async (cap) => {
      await Promise.resolve();
      try { (cap as TaskNameCapability).stageTaskAllowedFields({ name: 'Late' }); } catch (error) { lateError = error; }
    } } });
    const before = sourceState(f.sqlite); expect(() => f.dispatcher.dispatch(commandName())).toThrow();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(lateError).toMatchObject({ code: 'TRANSACTION_CLOSED' }); expect(sourceState(f.sqlite)).toEqual(before);
  });
  it('rejects a handler-forged success value and leaked capability return', () => {
    for (const returned of ['fake', { ok: true, savedChange: { revision: 999 } }]) {
      const f = fixture({ handlers: { 'F2-07': (cap) => { (cap as TaskNameCapability).stageTaskAllowedFields({ name: 'Changed' }); return returned; } } });
      const before = sourceState(f.sqlite); expect(() => f.dispatcher.dispatch(commandName())).toThrow(); expect(sourceState(f.sqlite)).toEqual(before);
    }
    const f = fixture({ handlers: { 'F2-07': (cap) => cap } }); const before = sourceState(f.sqlite);
    expect(() => f.dispatcher.dispatch(commandName())).toThrow(); expect(sourceState(f.sqlite)).toEqual(before);
  });
  it.each(['beforePersist', 'beforeCommit'] as const)('fully rolls back an injected %s failure and keeps the healthy connection usable', (stage) => {
    let enabled = true;
    const f = fixture({ hooks: () => ({ [stage]: () => { if (enabled) throw new Error('Controlled pre-COMMIT fault'); } }) });
    const before = sourceState(f.sqlite); expect(() => f.dispatcher.dispatch(commandName())).toThrow('Controlled');
    expect(sourceState(f.sqlite)).toEqual(before); expect(f.sqlite.open).toBe(true); expect(f.sqlite.inTransaction).toBe(false);
    enabled = false; expect(f.dispatcher.dispatch(commandName()).revision).toBe(2);
  });
  it('rechecks the trusted actor before commit and rolls back an actor change', () => {
    let f: ReturnType<typeof createHarnessFixture>;
    f = fixture({ hooks: () => ({ beforeCommit: () => { f.state.actorId = 'U2'; } }) });
    const before = sourceState(f.sqlite); expect(() => f.dispatcher.dispatch(commandName())).toThrow(); expect(sourceState(f.sqlite)).toEqual(before);
  });
  it('does not let a caught re-entry in the final actor callback erase the outer poison', () => {
    const f = fixture(); let calls = 0; let uow: ReturnType<typeof createSourceUnitOfWork>;
    uow = createSourceUnitOfWork(f.sqlite, { authority: {
      resolveActor: () => {
        if (++calls === 2) { try { uow.run({ verifiedActorId: asUserId('U1'), projectId: 'P1' as never, expectedRevision: 1, authorize() {} }, () => undefined); } catch { /* Must remain poisoned. */ } }
        return asUserId('U1');
      },
      runtimePolicy: () => ({ f3Enabled: true, f4Enabled: false, f6Enabled: false, datePolicy: 'UNRESOLVED' }),
    } });
    const dispatcher = createOperationDispatcher(uow); const before = sourceState(f.sqlite);
    expect(() => dispatcher.dispatch(commandName())).toThrow(); expect(sourceState(f.sqlite)).toEqual(before); expect(calls).toBe(2);
  });
  it('serializes two real connections at the same expected Revision and denies a stale second writer', () => {
    const f = fixture(); const second = openOwnedDisposable(f.filename);
    try {
      const other = createOperationDispatcher(createSourceUnitOfWork(second, { authority: { resolveActor: () => asUserId('U1'), runtimePolicy: () => ({ f3Enabled: true, f4Enabled: false, f6Enabled: false, datePolicy: 'UNRESOLVED' }) } }));
      f.dispatcher.dispatch(commandName('First writer'));
      expect(errorOf(() => other.dispatch(commandName('Stale writer'))).code).toBe('REVISION_CONFLICT');
      expect(revision(second)).toBe(2); expect((second.prepare('SELECT name FROM tasks WHERE task_id=?').get('A') as { name: string }).name).toBe('First writer');
      expect(other.dispatch(commandName('Fresh writer', 2)).revision).toBe(3);
    } finally { second.close(); }
  });
  it('uses BEGIN IMMEDIATE to exclude an overlapping second writer while the first is finalizing', () => {
    let overlapping: ReturnType<typeof createOperationDispatcher>; let competingError: unknown;
    const f = fixture({ hooks: () => ({ beforePersist: () => {
      try { overlapping.dispatch(commandName('Competing writer')); } catch (error) { competingError = error; }
    } }) });
    const second = openOwnedDisposable(f.filename);
    try {
      overlapping = createOperationDispatcher(createSourceUnitOfWork(second, { authority: { resolveActor: () => asUserId('U1'), runtimePolicy: () => ({ f3Enabled: true, f4Enabled: false, f6Enabled: false, datePolicy: 'UNRESOLVED' }) } }));
      expect(f.dispatcher.dispatch(commandName('Lock owner')).revision).toBe(2);
      expect(competingError).toMatchObject({ code: 'SQLITE_BUSY' }); expect(revision(second)).toBe(2);
      expect((second.prepare('SELECT name FROM tasks WHERE task_id=?').get('A') as { name: string }).name).toBe('Lock owner');
    } finally { second.close(); }
  });
});
