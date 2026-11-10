import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { G1_APPLICATION_ID, type FoundationDatabase } from './connection.js';
import { taskDurationNulIntegrity } from './schema.js';

const coreTables = [
  'users',
  'projects',
  'project_members',
  'tasks',
  'task_dependencies',
  'progress_notes',
];
const migrationFiles = ['0001_initial.sql', '0002_duration_nul_integrity.sql'] as const;

interface MigrationSource {
  version: number;
  text: string;
  sha256: string;
}
interface MigrationRow {
  version: number;
  sha256: string;
}
export interface FoundationMigrationResult {
  applied: boolean;
  /** Historical 0001 checksum retained for existing technical callers. */
  sha256: string;
  currentVersion: 2;
  appliedVersions: number[];
  migrations: MigrationRow[];
}

export class DurationIntegrityMigrationError extends Error {
  readonly code = 'INVALID_LEGACY_DURATION';
  constructor(readonly affectedTasks: readonly { taskId: string; projectId: string }[]) {
    super(
      `Invalid legacy task duration(s) found: ${JSON.stringify(affectedTasks)}. No records were repaired. Review these records and provide an explicit remediation plan before retrying migration 0002.`,
    );
    this.name = 'DurationIntegrityMigrationError';
  }
}

function verifyForeignKeys(database: FoundationDatabase): void {
  const violations: unknown = database.sqlite.pragma('foreign_key_check');
  if (!Array.isArray(violations) || violations.length !== 0) {
    throw new Error('Foreign-key integrity check failed.');
  }
}

function verifyStoredDurations(database: FoundationDatabase): void {
  const rows = database.sqlite
    .prepare(
      'SELECT task_id AS taskId,project_id AS projectId,duration_days AS duration FROM tasks',
    )
    .all() as { taskId: string; projectId: string; duration: unknown }[];
  const invalid = rows
    .filter(
      ({ duration }) =>
        duration !== null &&
        (typeof duration !== 'string' ||
          !/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(duration) ||
          !/[1-9]/.test(duration)),
    )
    .map(({ taskId, projectId }) => Object.freeze({ taskId, projectId }));
  // These are storage grammar/positivity checks, not the unapproved 24/18 input ceilings.
  if (invalid.length) throw new DurationIntegrityMigrationError(Object.freeze(invalid));
}

function normalizedSql(text: string): string {
  return text.replace(/\s+/g, ' ').trim().replace(/;$/, '');
}

function verifyNulTriggers(database: FoundationDatabase, migration: MigrationSource): void {
  const expected = migration.text.match(/CREATE TRIGGER\s+[a-z_]+[\s\S]*?END;/g);
  const names = [taskDurationNulIntegrity.insertTrigger, taskDurationNulIntegrity.updateTrigger];
  if (!expected || expected.length !== names.length)
    throw new Error('Migration 0002 trigger source is invalid.');
  for (const [index, name] of names.entries()) {
    const row = database.sqlite
      .prepare("SELECT sql FROM sqlite_schema WHERE type='trigger' AND name=? AND tbl_name='tasks'")
      .get(name) as { sql: string } | undefined;
    const source = expected[index];
    if (!row || !source || normalizedSql(row.sql) !== normalizedSql(source)) {
      throw new Error(
        'Migration history or schema differs: duration-integrity trigger missing or changed.',
      );
    }
  }
}

export function migrateFoundationDatabase(database: FoundationDatabase): FoundationMigrationResult {
  const { sqlite } = database;
  if (sqlite.inTransaction)
    throw new Error('Migrations require an independent disposable transaction.');
  if (sqlite.pragma('application_id', { simple: true }) !== G1_APPLICATION_ID)
    throw new Error('Unknown database ownership.');
  if (sqlite.pragma('foreign_keys', { simple: true }) !== 1)
    throw new Error('SQLite foreign keys must be enabled before migration.');
  const sources = migrationFiles.map((filename, index): MigrationSource => {
    const text = readFileSync(
      join(database.workspaceRoot, 'src/backend/persistence/migrations', filename),
      'utf8',
    );
    return { version: index + 1, text, sha256: createHash('sha256').update(text).digest('hex') };
  });
  const initial = sources[0];
  const integrity = sources[1];
  if (!initial || !integrity) throw new Error('Migration sources unavailable.');
  return sqlite
    .transaction(() => {
      const appliedVersions: number[] = [];
      const tables = sqlite
        .prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        .all() as { name: string }[];
      if (!tables.some((table) => table.name === '_g1_migrations')) {
        if (tables.length !== 0)
          throw new Error('Existing schema has no known migration history; refusing migration.');
        sqlite.exec(initial.text);
        sqlite.exec(
          'CREATE TABLE _g1_migrations(version INTEGER PRIMARY KEY NOT NULL,sha256 TEXT NOT NULL,applied_at TEXT NOT NULL) STRICT',
        );
        sqlite
          .prepare('INSERT INTO _g1_migrations VALUES (1,?,?)')
          .run(initial.sha256, new Date().toISOString());
        appliedVersions.push(1);
      } else if (
        tables.length !== 7 ||
        coreTables.some((name) => !tables.some((table) => table.name === name))
      ) {
        throw new Error('Migration history or schema differs; refusing automatic replacement.');
      }
      const rows = sqlite
        .prepare('SELECT version,sha256 FROM _g1_migrations ORDER BY version')
        .all() as MigrationRow[];
      if (
        rows.length < 1 ||
        rows.length > sources.length ||
        rows.some(
          (row, index) => row.version !== index + 1 || row.sha256 !== sources[index]?.sha256,
        )
      ) {
        throw new Error('Migration history or schema differs; refusing automatic replacement.');
      }
      verifyForeignKeys(database);
      // Inspect complete JS strings, including bytes after NUL, before any forward DDL.
      verifyStoredDurations(database);
      if (rows.length === 1) {
        sqlite.exec(integrity.text);
        sqlite
          .prepare('INSERT INTO _g1_migrations VALUES (2,?,?)')
          .run(integrity.sha256, new Date().toISOString());
        appliedVersions.push(2);
      }
      verifyNulTriggers(database, integrity);
      verifyForeignKeys(database);
      return {
        applied: appliedVersions.length !== 0,
        sha256: initial.sha256,
        currentVersion: 2 as const,
        appliedVersions,
        migrations: sources.map(({ version, sha256 }) => ({ version, sha256 })),
      };
    })
    .immediate();
}
