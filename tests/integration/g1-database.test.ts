import { afterEach, describe, expect, it, vi } from 'vitest';
import { relative } from 'node:path';
import { asDependencyId, asProjectId, asRevision, asTaskId, asUserId } from '@group9/shared';
import {
  openFoundationDatabase,
  type FoundationDatabase,
} from '../../src/backend/persistence/connection.js';
import { migrateFoundationDatabase } from '../../src/backend/persistence/migrate.js';
import { createOperationDispatcher } from '../../src/backend/application/operation-dispatcher.js';
import { readAuthorizedSnapshot } from '../../src/backend/application/snapshot-reader.js';
import {
  SourceTransactionError,
  type TaskNameCapability,
} from '../../src/backend/application/unit-of-work.js';
import { createSourceUnitOfWork } from '../../src/backend/persistence/source-unit-of-work.js';
import {
  commandBatch,
  commandInsert,
  commandName,
  createHarnessFixture,
  revision,
  sourceState,
} from '../fixtures/g1-b2-disposable-database.js';
import {
  createSeededFoundationDatabase,
  foundationWorkspaceRoot,
} from '../fixtures/g1-database.js';

const opened: Pick<FoundationDatabase, 'close'>[] = [];
function fixture() {
  const db = createSeededFoundationDatabase();
  opened.push(db);
  return db;
}
function harness(options?: Parameters<typeof createHarnessFixture>[0]) {
  const db = createHarnessFixture(options);
  opened.push(db);
  return db;
}

function expectSourceError(action: () => unknown, code: string, message: string) {
  let failure: unknown;
  try {
    action();
  } catch (error) {
    failure = error;
  }
  expect(failure).toBeInstanceOf(SourceTransactionError);
  expect(failure).toMatchObject({ code, message: expect.stringContaining(message) });
  expect(failure).not.toHaveProperty('savedChange');
}

afterEach(() => {
  for (const db of opened.splice(0)) db.close();
});

describe('G1 disposable SQLite and revision foundation (not business acceptance)', () => {
  it('G1-T05 applies six STRICT source tables once and verifies migration checksum', () => {
    const db = fixture();
    expect(migrateFoundationDatabase(db).applied).toBe(false);
    expect(db.sqlite.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(db.sqlite.pragma('foreign_key_check')).toEqual([]);
    const tables = db.sqlite
      .prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name")
      .all();
    expect(tables).toEqual(
      [
        '_g1_migrations',
        'progress_notes',
        'project_members',
        'projects',
        'task_dependencies',
        'tasks',
        'users',
      ].map((name) => ({ name })),
    );
    expect(
      db.sqlite.prepare('SELECT project_timezone FROM projects WHERE project_id=?').get('P1'),
    ).toEqual({ project_timezone: null });
    db.sqlite.prepare('UPDATE _g1_migrations SET sha256=?').run('tampered');
    expect(() => migrateFoundationDatabase(db)).toThrow('Migration history or schema differs');
  });

  it('G1-T06 rejects missing and cross-project references, duplicate/self links and a fourth status', () => {
    const db = fixture();
    const failures = [
      "UPDATE project_members SET user_id='missing' WHERE member_id='M1'",
      "UPDATE tasks SET assignee_id='M3' WHERE task_id='A'",
      "INSERT INTO task_dependencies VALUES ('L2','P1','A','X','now')",
      "INSERT INTO task_dependencies VALUES ('L2','P1','A','A','now')",
      "INSERT INTO task_dependencies VALUES ('L2','P1','A','B','now')",
      "UPDATE progress_notes SET author_member_id='M3' WHERE note_id='N1'",
      "UPDATE progress_notes SET task_id='X' WHERE note_id='N1'",
      "UPDATE tasks SET status='BLOCKED' WHERE task_id='A'",
      "DELETE FROM tasks WHERE task_id='A'",
      "DELETE FROM project_members WHERE member_id='M2'",
    ];
    for (const sql of failures) expect(() => db.sqlite.exec(sql)).toThrow();
    expect(db.sqlite.prepare('SELECT count(*) AS count FROM tasks').get()).toEqual({ count: 3 });
    expect(db.sqlite.pragma('foreign_key_check')).toEqual([]);
  });

  it('G1-T06 rejects malformed/nonpositive decimal TEXT without binary casts', () => {
    const db = fixture();
    for (const value of [
      '0',
      '0.00',
      '-1',
      'NaN',
      'Infinity',
      '1e2',
      '01',
      '1..2',
      '.1',
      '1.',
      'abc',
      '',
    ]) {
      expect(() =>
        db.sqlite.prepare('UPDATE tasks SET duration_days=? WHERE task_id=?').run(value, 'A'),
      ).toThrow();
    }
    for (const value of ['0.000000000001', '2.50', null])
      db.sqlite.prepare('UPDATE tasks SET duration_days=? WHERE task_id=?').run(value, 'B');
  });

  it('G1-T07 preserves source 0.10 as TEXT through close/reopen and Drizzle mapping', () => {
    const db = fixture();
    const relativePath = relative(foundationWorkspaceRoot, db.filename);
    db.close();
    const reopened = openFoundationDatabase({
      workspaceRoot: foundationWorkspaceRoot,
      relativePath,
      mode: 'open-owned',
    });
    opened.push(reopened);
    expect(migrateFoundationDatabase(reopened).applied).toBe(false);
    expect(
      reopened.sqlite
        .prepare('SELECT duration_days,typeof(duration_days) AS storage FROM tasks WHERE task_id=?')
        .get('A'),
    ).toEqual({ duration_days: '0.10', storage: 'text' });
    expect(
      readAuthorizedSnapshot(reopened, asUserId('U1'), asProjectId('P1'), {
        f3Enabled: true,
      }).snapshot.tasks.find((t) => t.taskId === 'A')?.durationDays,
    ).toBe('0.10');
  });

  it('G1-T08 commits two bound dependency writes and increments one project revision exactly once', () => {
    const db = harness();
    const result = db.dispatcher.dispatch(
      commandBatch(
        [
          {
            dependencyId: asDependencyId('L2'),
            prerequisiteId: asTaskId('A'),
            dependentId: asTaskId('C'),
          },
          {
            dependencyId: asDependencyId('L3'),
            prerequisiteId: asTaskId('B'),
            dependentId: asTaskId('C'),
          },
        ],
        [],
      ),
    );
    expect(result).toEqual({
      ok: true,
      projectId: 'P1',
      revision: 2,
      value: { inserted: ['L2', 'L3'], removed: [] },
      savedChange: {
        projectId: 'P1',
        revision: 2,
        changeKind: 'F3-06',
        affectedTaskIds: ['A', 'B', 'C'],
        changedFields: ['dependencies'],
      },
    });
    expect(
      db.sqlite
        .prepare(
          'SELECT dependency_id, project_id, prerequisite_id, dependent_id FROM task_dependencies ORDER BY dependency_id',
        )
        .all(),
    ).toEqual([
      { dependency_id: 'L1', project_id: 'P1', prerequisite_id: 'A', dependent_id: 'B' },
      { dependency_id: 'L2', project_id: 'P1', prerequisite_id: 'A', dependent_id: 'C' },
      { dependency_id: 'L3', project_id: 'P1', prerequisite_id: 'B', dependent_id: 'C' },
    ]);
    expect(revision(db.sqlite, 'P1')).toBe(2);
    expect(revision(db.sqlite, 'P2')).toBe(1);
    expect(db.sqlite.inTransaction).toBe(false);
  });

  it('G1-T09 rejects conflicts and rolls back persisted source and revision on pre-COMMIT failure', () => {
    const failure = new Error('Synthetic pre-COMMIT failure');
    const db = harness({
      hooks: (sqlite) => ({
        beforeCommit: () => {
          expect(sqlite.inTransaction).toBe(true);
          expect(sqlite.prepare("SELECT name FROM tasks WHERE task_id='A'").get()).toEqual({
            name: 'Must roll back',
          });
          expect(revision(sqlite)).toBe(2);
          throw failure;
        },
      }),
    });
    const before = sourceState(db.sqlite);
    expectSourceError(
      () => db.dispatcher.dispatch(commandName('Must roll back', 2)),
      'REVISION_CONFLICT',
      'Project changed',
    );
    expect(sourceState(db.sqlite)).toEqual(before);
    expect(() => db.dispatcher.dispatch(commandName('Must roll back'))).toThrow(failure);
    expect(sourceState(db.sqlite)).toEqual(before);
    expect(db.uow.diagnostics()).toMatchObject([
      { outcome: 'ROLLED_BACK' },
      { outcome: 'ROLLED_BACK' },
    ]);
    expect(db.sqlite.inTransaction).toBe(false);
  });

  it('G1-T09 checks trusted policy and current membership before writes and rejects no-ops', () => {
    const db = harness({ f3Enabled: false });
    const before = sourceState(db.sqlite);
    expectSourceError(
      () => db.dispatcher.dispatch(commandInsert()),
      'FEATURE_NOT_ENABLED',
      'disabled by trusted application policy',
    );
    expect(sourceState(db.sqlite)).toEqual(before);

    db.state.actorId = 'U2';
    expectSourceError(
      () => db.dispatcher.dispatch(commandName()),
      'FORBIDDEN',
      'current project Leader',
    );
    expect(sourceState(db.sqlite)).toEqual(before);

    db.state.actorId = 'U3';
    expectSourceError(
      () => db.dispatcher.dispatch(commandName()),
      'INVALID_OR_INACCESSIBLE_PROJECT',
      'Invalid or inaccessible project.',
    );
    expect(sourceState(db.sqlite)).toEqual(before);

    db.state.actorId = 'U1';
    expectSourceError(
      () => db.dispatcher.dispatch(commandName('Synthetic A')),
      'INVALID_INPUT',
      'No semantic source change',
    );
    expect(sourceState(db.sqlite)).toEqual(before);
    expect(db.sqlite.inTransaction).toBe(false);
  });

  it('G1-T09 rejects an actor whose membership changed after an earlier authorized read', () => {
    const db = fixture();
    expect(
      readAuthorizedSnapshot(db, asUserId('U1'), asProjectId('P1'), { f3Enabled: true })
        .viewerMemberId,
    ).toBe('M1');
    // Synthetic local arrangement only: the membership business command is not implemented.
    db.sqlite
      .prepare(
        "UPDATE project_members SET active=0,left_at='2026-10-30T01:00:00Z' WHERE member_id='M1'",
      )
      .run();
    const before = sourceState(db.sqlite);
    const handler = vi.fn();
    const unitOfWork = createSourceUnitOfWork(db.sqlite, {
      authority: {
        resolveActor: () => asUserId('U1'),
        runtimePolicy: () => ({
          f3Enabled: true,
          f4Enabled: false,
          f6Enabled: false,
          datePolicy: 'UNRESOLVED',
        }),
      },
    });
    const dispatcher = createOperationDispatcher(unitOfWork, { handlers: { 'F2-07': handler } });
    expectSourceError(
      () => dispatcher.dispatch(commandName()),
      'INVALID_OR_INACCESSIBLE_PROJECT',
      'Invalid or inaccessible project.',
    );
    expect(handler).not.toHaveBeenCalled();
    expect(revision(db.sqlite)).toBe(1);
    expect(sourceState(db.sqlite)).toEqual(before);
    expect(db.sqlite.inTransaction).toBe(false);
  });

  it('G1-T09 refuses revision overflow and requires an independent source transaction', () => {
    const handler = vi.fn();
    const db = harness({ handlers: { 'F2-07': handler } });
    db.sqlite
      .prepare("UPDATE projects SET revision=? WHERE project_id='P1'")
      .run(Number.MAX_SAFE_INTEGER);
    const before = sourceState(db.sqlite);
    const command = commandName('Must not persist', Number.MAX_SAFE_INTEGER);
    expectSourceError(
      () => db.dispatcher.dispatch(command),
      'INVALID_INPUT',
      'revision capacity reached',
    );
    expect(revision(db.sqlite)).toBe(Number.MAX_SAFE_INTEGER);
    expect(sourceState(db.sqlite)).toEqual(before);
    db.sqlite.transaction(() => {
      expectSourceError(
        () => db.dispatcher.dispatch(command),
        'INVALID_INPUT',
        'An independent source transaction is required',
      );
      expect(db.sqlite.inTransaction).toBe(true);
    })();
    expect(handler).not.toHaveBeenCalled();
    expect(sourceState(db.sqlite)).toEqual(before);
    expect(db.sqlite.inTransaction).toBe(false);
  });

  it('G1-T09 rejects legacy grants and async handlers and rolls back staged thenables', () => {
    const db = harness({
      handlers: {
        'F2-07': (capability) => {
          (capability as TaskNameCapability).stageTaskAllowedFields({ name: 'Must roll back' });
          return Promise.resolve('not allowed');
        },
      },
    });
    const before = sourceState(db.sqlite);
    const authorize = vi.fn();
    const legacyWork = vi.fn(() => undefined);
    expectSourceError(
      () =>
        db.uow.run(
          {
            verifiedActorId: asUserId('U1'),
            projectId: asProjectId('P1'),
            expectedRevision: asRevision(1),
            authorize,
          },
          legacyWork,
        ),
      'OPERATION_NOT_ENABLED',
      'Generic callback/repository grants are disabled',
    );
    expect(authorize).not.toHaveBeenCalled();
    expect(legacyWork).not.toHaveBeenCalled();

    let asyncBodyRan = false;
    expectSourceError(
      () =>
        db.uow.execute(commandName(), async () => {
          asyncBodyRan = true;
        }),
      'INVALID_INPUT',
      'trusted synchronous handler',
    );
    expect(asyncBodyRan).toBe(false);

    expectSourceError(
      () => db.dispatcher.dispatch(commandName()),
      'INVALID_INPUT',
      'Source transaction work must be synchronous',
    );
    expect(sourceState(db.sqlite)).toEqual(before);
    expect(db.sqlite.inTransaction).toBe(false);
  });

  it('G1 coherent reader retains link IDs/historical authors without running F3 validation', () => {
    const db = fixture();
    const context = readAuthorizedSnapshot(db, asUserId('U1'), asProjectId('P1'), {
      f3Enabled: true,
    });
    expect(context.viewerMemberId).toBe('M1');
    expect(context.snapshot.revision).toBe(1);
    expect(context.snapshot.members.find((m) => m.memberId === 'M2')?.active).toBe(false);
    expect(context.snapshot.dependencySource).toEqual({
      availability: 'VALID',
      links: [{ dependencyId: 'L1', projectId: 'P1', prerequisiteId: 'A', dependentId: 'B' }],
    });
    expect(Object.isFrozen(context.snapshot.tasks[0])).toBe(true);
    expect(() =>
      readAuthorizedSnapshot(db, asUserId('U2'), asProjectId('P1'), { f3Enabled: true }),
    ).toThrow('Invalid or inaccessible project.');
    expect(
      readAuthorizedSnapshot(db, asUserId('U1'), asProjectId('P1'), { f3Enabled: false }).snapshot
        .dependencySource,
    ).toEqual({ availability: 'NOT_ENABLED', links: null, reasonCode: 'FEATURE_NOT_ENABLED' });
    db.sqlite.prepare("INSERT INTO task_dependencies VALUES ('L2','P1','B','A','now')").run();
    expect(
      readAuthorizedSnapshot(db, asUserId('U1'), asProjectId('P1'), { f3Enabled: true }).snapshot
        .dependencySource.availability,
    ).toBe('VALID');
    // Raw readability deliberately does not certify the cyclic graph; F3 is future work.
  });

  it('G1 reader distinguishes known-empty, enabled no-task and unreadable dependency sources', () => {
    const db = fixture();
    expect(
      readAuthorizedSnapshot(db, asUserId('U3'), asProjectId('P2'), { f3Enabled: true }).snapshot
        .dependencySource,
    ).toEqual({ availability: 'VALID', links: [] });
    db.sqlite.prepare("DELETE FROM tasks WHERE task_id='X'").run();
    expect(
      readAuthorizedSnapshot(db, asUserId('U3'), asProjectId('P2'), { f3Enabled: true }).snapshot
        .dependencySource,
    ).toEqual({ availability: 'NO_TASKS', links: [] });
    db.sqlite.exec('DROP TABLE task_dependencies');
    const unavailable = readAuthorizedSnapshot(db, asUserId('U1'), asProjectId('P1'), {
      f3Enabled: true,
    });
    expect(unavailable.snapshot.tasks).toHaveLength(2);
    expect(unavailable.snapshot.dependencySource).toEqual({
      availability: 'UNAVAILABLE',
      links: null,
      reasonCode: 'DEPENDENCY_INPUT_UNAVAILABLE',
    });
  });

  it('G1 connection refuses unknown/outside paths and never replaces an existing file', () => {
    const db = fixture();
    expect(() =>
      openFoundationDatabase({
        workspaceRoot: foundationWorkspaceRoot,
        relativePath: '../outside.sqlite',
        mode: 'create-new',
      }),
    ).toThrow('inside work/g1-foundation');
    expect(() =>
      openFoundationDatabase({
        workspaceRoot: foundationWorkspaceRoot,
        relativePath: relative(foundationWorkspaceRoot, db.filename),
        mode: 'create-new',
      }),
    ).toThrow();
    db.sqlite.pragma('application_id = 0');
    db.close();
    expect(() =>
      openFoundationDatabase({
        workspaceRoot: foundationWorkspaceRoot,
        relativePath: relative(foundationWorkspaceRoot, db.filename),
        mode: 'open-owned',
      }),
    ).toThrow('Unknown database ownership');
  });
});
