import { afterEach, describe, expect, it } from 'vitest';
import { relative } from 'node:path';
import { asProjectId, asRevision, asUserId, asTaskId } from '@group9/shared';
import {
  openFoundationDatabase,
  type FoundationDatabase,
} from '../../src/backend/persistence/connection.js';
import { migrateFoundationDatabase } from '../../src/backend/persistence/migrate.js';
import { readAuthorizedSnapshot } from '../../src/backend/application/snapshot-reader.js';
import { SourceTransactionError } from '../../src/backend/application/unit-of-work.js';
import { createSourceUnitOfWork } from '../../src/backend/persistence/source-unit-of-work.js';
import {
  createSeededFoundationDatabase,
  foundationWorkspaceRoot,
} from '../fixtures/g1-database.js';

const opened: FoundationDatabase[] = [];
function fixture() {
  const db = createSeededFoundationDatabase();
  opened.push(db);
  return db;
}
const command = (revision = 1) => ({
  verifiedActorId: asUserId('U1'),
  projectId: asProjectId('P1'),
  expectedRevision: asRevision(revision),
  authorize: () => {
    /* Explicit synthetic authorization only. */
  },
});
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

  it('G1-T08 commits two synthetic source writes and increments one project revision exactly once', () => {
    const db = fixture();
    const result = createSourceUnitOfWork(db.sqlite).run(command(), (tx) => {
      tx.management.updateTaskName(asTaskId('A'), 'Changed A');
      tx.management.updateTaskName(asTaskId('B'), 'Changed B');
      return 'synthetic';
    });
    expect(result).toEqual({ value: 'synthetic', revision: 2 });
    expect(db.sqlite.prepare('SELECT revision FROM projects WHERE project_id=?').get('P1')).toEqual(
      { revision: 2 },
    );
    expect(db.sqlite.prepare('SELECT revision FROM projects WHERE project_id=?').get('P2')).toEqual(
      { revision: 1 },
    );
  });

  it('G1-T09 rejects conflicts and rolls back all source writes and revision on callback failure', () => {
    const db = fixture();
    expect(() => createSourceUnitOfWork(db.sqlite).run(command(2), () => 'never')).toThrow(
      'Project changed',
    );
    expect(() =>
      createSourceUnitOfWork(db.sqlite).run(command(), (tx) => {
        tx.management.updateTaskName(asTaskId('A'), 'Must roll back');
        throw new Error('synthetic injected failure');
      }),
    ).toThrow('synthetic injected failure');
    expect(db.sqlite.prepare('SELECT name FROM tasks WHERE task_id=?').get('A')).toEqual({
      name: 'Synthetic A',
    });
    expect(db.sqlite.prepare('SELECT revision FROM projects WHERE project_id=?').get('P1')).toEqual(
      { revision: 1 },
    );
    expect(db.sqlite.inTransaction).toBe(false);
  });

  it('G1-T09 rechecks active membership and injected operation authorization before writes', () => {
    const db = fixture();
    const denied = () => {
      throw new SourceTransactionError('PERMISSION_DENIED', 'Denied by synthetic policy.');
    };
    expect(() =>
      createSourceUnitOfWork(db.sqlite).run({ ...command(), authorize: denied }, () => 'never'),
    ).toThrow('Denied by synthetic policy');
    expect(() =>
      createSourceUnitOfWork(db.sqlite).run(
        { ...command(), verifiedActorId: asUserId('U2') },
        () => 'never',
      ),
    ).toThrow('Invalid or inaccessible project.');
    expect(() => createSourceUnitOfWork(db.sqlite).run(command(), () => 'no SQL')).toThrow(
      'No source changes',
    );
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
    let ran = false;
    expect(() =>
      createSourceUnitOfWork(db.sqlite).run(command(), () => {
        ran = true;
      }),
    ).toThrow('Invalid or inaccessible project.');
    expect(ran).toBe(false);
    expect(db.sqlite.prepare("SELECT revision FROM projects WHERE project_id='P1'").get()).toEqual({
      revision: 1,
    });
  });

  it('G1-T09 refuses source revision overflow and nested source transactions', () => {
    const db = fixture();
    db.sqlite
      .prepare("UPDATE projects SET revision=? WHERE project_id='P1'")
      .run(Number.MAX_SAFE_INTEGER);
    let ran = false;
    expect(() =>
      createSourceUnitOfWork(db.sqlite).run(command(Number.MAX_SAFE_INTEGER), () => {
        ran = true;
      }),
    ).toThrow('revision capacity reached');
    expect(ran).toBe(false);
    expect(db.sqlite.prepare("SELECT revision FROM projects WHERE project_id='P1'").get()).toEqual({
      revision: Number.MAX_SAFE_INTEGER,
    });
    expect(() =>
      db.sqlite.transaction(() =>
        createSourceUnitOfWork(db.sqlite).run(command(), () => undefined),
      )(),
    ).toThrow('Nested source transactions');
    expect(db.sqlite.inTransaction).toBe(false);
  });

  it('G1-T09 rejects asynchronous callbacks before executing their body and rolls back thenables', () => {
    const db = fixture();
    let ran = false;
    expect(() =>
      // @ts-expect-error Deliberate runtime misuse: the new public port rejects asynchronous callbacks.
      createSourceUnitOfWork(db.sqlite).run(command(), async () => {
        ran = true;
        return 'not allowed';
      }),
    ).toThrow('must be synchronous');
    expect(ran).toBe(false);
    expect(() =>
      // @ts-expect-error Deliberate runtime misuse: Promise returns are rejected statically and at runtime.
      createSourceUnitOfWork(db.sqlite).run(command(), (tx) => {
        tx.management.updateTaskName(asTaskId('A'), 'Must roll back');
        return Promise.resolve('not allowed');
      }),
    ).toThrow('must be synchronous');
    expect(db.sqlite.prepare('SELECT name FROM tasks WHERE task_id=?').get('A')).toEqual({
      name: 'Synthetic A',
    });
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
