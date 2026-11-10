import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openFoundationDatabase, type FoundationDatabase } from './connection.js';
import { migrateFoundationDatabase } from './migrate.js';

// Local source CLI only; no command-line path or arbitrary existing database input.
const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url));
const relativePath = 'work/g1-foundation/development/foundation.sqlite';
let database: FoundationDatabase | undefined;
try {
  database = openFoundationDatabase({
    workspaceRoot,
    relativePath,
    mode: existsSync(join(workspaceRoot, relativePath)) ? 'open-owned' : 'create-new',
  });
  const result = migrateFoundationDatabase(database);
  console.log(
    JSON.stringify({
      scope: 'disposable-development',
      filename: database.filename,
      ...result,
      sqliteVersion: database.sqlite.prepare('SELECT sqlite_version() AS version').get(),
    }),
  );
} catch {
  console.error(
    'G1_MIGRATION_FAILED: disposable development migration refused or failed; existing data was not replaced.',
  );
  process.exitCode = 1;
} finally {
  database?.close();
}
