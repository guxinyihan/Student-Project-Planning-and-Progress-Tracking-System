import { afterEach, describe, expect, it } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  openFoundationDatabase,
  type FoundationDatabase,
} from '../../src/backend/persistence/connection.js';
import {
  DurationIntegrityMigrationError,
  migrateFoundationDatabase,
} from '../../src/backend/persistence/migrate.js';
import { taskDurationNulIntegrity } from '../../src/backend/persistence/schema.js';
import {
  createSeededFoundationDatabase,
  foundationWorkspaceRoot,
} from '../fixtures/g1-database.js';

const INITIAL_SHA256 = '5ed95afcf360102803a4aaf98c32adcbbe096faac6ffa04a5e50336106a84b65';
const BAD = '0.10\u0000not-a-decimal';
const opened: FoundationDatabase[] = [];
const tables = [
  'users',
  'projects',
  'project_members',
  'tasks',
  'task_dependencies',
  'progress_notes',
];
function rows(db: FoundationDatabase) {
  // Fixed allowlisted table names in technical tests, never external SQL input.
  return tables.map((table) => db.sqlite.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all());
}
function journal(db: FoundationDatabase) {
  return db.sqlite.prepare('SELECT * FROM _g1_migrations ORDER BY version').all();
}
function triggers(db: FoundationDatabase) {
  return db.sqlite
    .prepare(
      "SELECT name,sql FROM sqlite_schema WHERE type='trigger' AND tbl_name='tasks' ORDER BY name",
    )
    .all();
}
function latest() {
  const db = createSeededFoundationDatabase();
  opened.push(db);
  return db;
}
function legacy() {
  const db = openFoundationDatabase({
    workspaceRoot: foundationWorkspaceRoot,
    relativePath: `work/g1-foundation/sql-remediation/${randomUUID()}.sqlite`,
    mode: 'create-new',
  });
  opened.push(db);
  const sql = readFileSync(
    join(foundationWorkspaceRoot, 'src/backend/persistence/migrations/0001_initial.sql'),
    'utf8',
  );
  db.sqlite
    .transaction(() => {
      db.sqlite.exec(sql);
      db.sqlite.exec(
        'CREATE TABLE _g1_migrations(version INTEGER PRIMARY KEY NOT NULL,sha256 TEXT NOT NULL,applied_at TEXT NOT NULL) STRICT',
      );
      db.sqlite
        .prepare('INSERT INTO _g1_migrations VALUES(1,?,?)')
        .run(createHash('sha256').update(sql).digest('hex'), new Date().toISOString());
      db.sqlite.exec(`
      INSERT INTO users VALUES('U1','Synthetic leader','now','now'),('U2','Retained author','now','now');
      INSERT INTO projects VALUES('P1','SQL synthetic project',NULL,NULL,NULL,NULL,1,'now','now');
      INSERT INTO project_members VALUES('M1','P1','U1','LEADER',1,NULL,'now','now'),('M2','P1','U2','MEMBER',0,'now','now','now');
      INSERT INTO tasks VALUES('A','P1','Task A',NULL,'M1','0.10',NULL,'COMPLETED','now','now'),('B','P1','Task B',NULL,NULL,'1.25',NULL,'IN_PROGRESS','now','now');
      INSERT INTO task_dependencies VALUES('L1','P1','A','B','now');
      INSERT INTO progress_notes VALUES('N1','P1','A','M2','Retained historical author','now');
    `);
    })
    .immediate();
  return db;
}
function insert(db: FoundationDatabase, duration: string | null) {
  return db.sqlite
    .prepare(
      "INSERT INTO tasks VALUES('NEW','P1','New Task',NULL,NULL,?,NULL,'NOT_STARTED','now','now')",
    )
    .run(duration);
}
function update(db: FoundationDatabase, duration: string | null) {
  return db.sqlite.prepare("UPDATE tasks SET duration_days=? WHERE task_id='A'").run(duration);
}
afterEach(() => {
  for (const db of opened.splice(0)) db.close();
});

describe('SQL-01 forward duration-integrity migration on owned disposable databases', () => {
  it('SQL01-T01 rejects a direct bound NUL INSERT without changing source or revision', () => {
    const db = latest();
    const before = rows(db);
    expect(() => insert(db, BAD)).toThrow('embedded NUL');
    expect(rows(db)).toEqual(before);
  });

  it('SQL01-T02 rejects a direct bound NUL UPDATE without changing source or revision', () => {
    const db = latest();
    const before = rows(db);
    expect(() => update(db, BAD)).toThrow('embedded NUL');
    expect(rows(db)).toEqual(before);
  });

  it('SQL01-T03 stores valid source 0.10 exactly as SQLite TEXT', () => {
    const db = latest();
    insert(db, '0.10');
    update(db, '0.10');
    expect(
      db.sqlite
        .prepare(
          "SELECT duration_days,typeof(duration_days) AS storage FROM tasks WHERE task_id='NEW'",
        )
        .get(),
    ).toEqual({ duration_days: '0.10', storage: 'text' });
  });

  it('SQL01-T04 accepts valid 1.25 for INSERT and UPDATE', () => {
    const db = latest();
    expect(insert(db, '1.25').changes).toBe(1);
    expect(update(db, '1.25').changes).toBe(1);
  });

  it('SQL01-T05 retains nullable unestimated durations', () => {
    const db = latest();
    insert(db, null);
    update(db, null);
    expect(db.sqlite.prepare("SELECT duration_days FROM tasks WHERE task_id='A'").get()).toEqual({
      duration_days: null,
    });
  });

  it('SQL01-T06 upgrades historical0001, preserving source, journal1, table SQL, indexes and foreign keys', () => {
    const db = legacy();
    const before = rows(db);
    const journal1 = journal(db)[0];
    const tableSql = db.sqlite
      .prepare("SELECT sql FROM sqlite_schema WHERE type='table' AND name='tasks'")
      .get();
    const indexes = db.sqlite
      .prepare("SELECT name,sql FROM sqlite_schema WHERE type='index' ORDER BY name")
      .all();
    const result = migrateFoundationDatabase(db);
    expect(result.appliedVersions).toEqual([2]);
    expect(result.currentVersion).toBe(2);
    expect(result.sha256).toBe(INITIAL_SHA256);
    expect(rows(db)).toEqual(before);
    expect(journal(db)[0]).toEqual(journal1);
    expect(journal(db)).toHaveLength(2);
    expect(
      db.sqlite.prepare("SELECT sql FROM sqlite_schema WHERE type='table' AND name='tasks'").get(),
    ).toEqual(tableSql);
    expect(
      db.sqlite
        .prepare("SELECT name,sql FROM sqlite_schema WHERE type='index' ORDER BY name")
        .all(),
    ).toEqual(indexes);
    expect(db.sqlite.pragma('foreign_key_check')).toEqual([]);
    expect(triggers(db)).toHaveLength(2);
    expect(() => insert(db, BAD)).toThrow('embedded NUL');
    expect(() => update(db, BAD)).toThrow('embedded NUL');
  });

  it('SQL01-T07 refuses invalid legacy data without row, journal, schema or file-byte changes', () => {
    const db = legacy();
    update(db, BAD); // The unmodified historical0001 CHECK actually accepts this value.
    const before = rows(db);
    const oldJournal = journal(db);
    const oldSchema = db.sqlite.prepare('SELECT * FROM sqlite_schema ORDER BY type,name').all();
    const oldBytes = readFileSync(db.filename);
    let error: unknown;
    try {
      migrateFoundationDatabase(db);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(DurationIntegrityMigrationError);
    expect((error as DurationIntegrityMigrationError).affectedTasks).toEqual([
      { taskId: 'A', projectId: 'P1' },
    ]);
    expect((error as Error).message).toContain('explicit remediation plan');
    expect(rows(db)).toEqual(before);
    expect(journal(db)).toEqual(oldJournal);
    expect(db.sqlite.prepare('SELECT * FROM sqlite_schema ORDER BY type,name').all()).toEqual(
      oldSchema,
    );
    expect(readFileSync(db.filename)).toEqual(oldBytes);
    expect(db.sqlite.inTransaction).toBe(false);
  });

  it('SQL01-T08 persists both guards after close/reopen and an idempotent repeat', () => {
    const db = legacy();
    migrateFoundationDatabase(db);
    const oldJournal = journal(db);
    const path = relative(foundationWorkspaceRoot, db.filename);
    db.close();
    const reopened = openFoundationDatabase({
      workspaceRoot: foundationWorkspaceRoot,
      relativePath: path,
      mode: 'open-owned',
    });
    opened.push(reopened);
    expect(migrateFoundationDatabase(reopened).applied).toBe(false);
    expect(journal(reopened)).toEqual(oldJournal);
    expect(() => insert(reopened, BAD)).toThrow('embedded NUL');
    expect(() => update(reopened, BAD)).toThrow('embedded NUL');
    expect(reopened.sqlite.pragma('foreign_key_check')).toEqual([]);
  });

  it('SQL01-T09 preserves the original0001 bytes/checksum while independently journaling0002', () => {
    const sql = readFileSync(
      join(foundationWorkspaceRoot, 'src/backend/persistence/migrations/0001_initial.sql'),
    );
    expect(createHash('sha256').update(sql).digest('hex')).toBe(INITIAL_SHA256);
    const db = latest();
    const result = migrateFoundationDatabase(db);
    const newSql = readFileSync(
      join(
        foundationWorkspaceRoot,
        'src/backend/persistence/migrations/0002_duration_nul_integrity.sql',
      ),
    );
    const newHash = createHash('sha256').update(newSql).digest('hex');
    expect(result.migrations).toEqual([
      { version: 1, sha256: INITIAL_SHA256 },
      { version: 2, sha256: newHash },
    ]);
    expect(journal(db)).toMatchObject([
      { version: 1, sha256: INITIAL_SHA256 },
      { version: 2, sha256: newHash },
    ]);
    expect(taskDurationNulIntegrity.predicate).toBe(
      'duration_days IS NULL OR instr(duration_days, char(0)) = 0',
    );
    expect(triggers(db)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: taskDurationNulIntegrity.insertTrigger }),
        expect.objectContaining({ name: taskDurationNulIntegrity.updateTrigger }),
      ]),
    );
  });

  it('SQL01-T10 rejects missing/changed guard definitions and tampered migration history on repeat', () => {
    const db = latest();
    db.sqlite.exec(`DROP TRIGGER ${taskDurationNulIntegrity.insertTrigger}`);
    expect(() => migrateFoundationDatabase(db)).toThrow('trigger missing or changed');
    expect(journal(db)).toHaveLength(2);
    const another = latest();
    another.sqlite.prepare('UPDATE _g1_migrations SET sha256=? WHERE version=2').run('tampered');
    expect(() => migrateFoundationDatabase(another)).toThrow('Migration history or schema differs');
  });

  it('SQL01-T11 rolls back forward trigger DDL when recording journal2 is injected to fail', () => {
    const db = legacy();
    db.sqlite.exec(
      "CREATE TRIGGER inject_journal_failure BEFORE INSERT ON _g1_migrations WHEN NEW.version=2 BEGIN SELECT RAISE(ABORT,'synthetic journal failure'); END;",
    );
    const before = rows(db);
    const oldJournal = journal(db);
    expect(() => migrateFoundationDatabase(db)).toThrow('synthetic journal failure');
    expect(rows(db)).toEqual(before);
    expect(journal(db)).toEqual(oldJournal);
    expect(triggers(db)).toEqual([]);
    expect(db.sqlite.inTransaction).toBe(false);
    expect(db.sqlite.pragma('foreign_key_check')).toEqual([]);
  });

  it('SQL01-T12 preflights all malformed legacy grammar without applying candidate resource ceilings', () => {
    const db = legacy();
    db.sqlite.pragma('ignore_check_constraints = ON');
    update(db, 'NaN');
    db.sqlite.pragma('ignore_check_constraints = OFF');
    expect(() => migrateFoundationDatabase(db)).toThrow(DurationIntegrityMigrationError);
    expect(journal(db)).toHaveLength(1);
    expect(triggers(db)).toEqual([]);
    const valid = legacy();
    update(valid, '123456789012345678901234567890.123456789012345678901');
    expect(migrateFoundationDatabase(valid).appliedVersions).toEqual([2]);
  });
});
