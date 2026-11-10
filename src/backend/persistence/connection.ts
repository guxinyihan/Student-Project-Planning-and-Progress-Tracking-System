import BetterSqlite3 from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { closeSync, existsSync, lstatSync, mkdirSync, openSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import * as schema from './schema.js';

export const G1_APPLICATION_ID = 0x47394631;
export interface FoundationDatabase {
  sqlite: BetterSqlite3.Database;
  orm: BetterSQLite3Database<typeof schema>;
  workspaceRoot: string;
  filename: string;
  close(): void;
}

function inside(root: string, target: string): boolean {
  const name = relative(root, target);
  return name !== '' && !name.startsWith(`..${sep}`) && name !== '..' && !isAbsolute(name);
}

/** Explicit local-only disposable path. Never opens arbitrary existing user data. */
export function openFoundationDatabase(options: {
  workspaceRoot: string;
  relativePath: string;
  mode: 'create-new' | 'open-owned';
}): FoundationDatabase {
  const workspaceRoot = realpathSync(options.workspaceRoot);
  if (
    !existsSync(join(workspaceRoot, '.git')) ||
    !existsSync(join(workspaceRoot, 'docs/round3/ROUND3_API_Contract.md'))
  ) {
    throw new Error('A verified Group 9 planning worktree is required.');
  }
  const permitted = join(workspaceRoot, 'work', 'g1-foundation');
  const filename = resolve(workspaceRoot, options.relativePath);
  if (!inside(permitted, filename) || !/\.sqlite$/.test(filename)) {
    throw new Error('Database path must be a disposable .sqlite file inside work/g1-foundation.');
  }
  // Resolve every existing/created parent so a directory link cannot escape the worktree.
  const parentParts = relative(workspaceRoot, resolve(filename, '..')).split(sep);
  let parent = workspaceRoot;
  for (const part of parentParts) {
    parent = join(parent, part);
    if (!existsSync(parent)) mkdirSync(parent);
    if (lstatSync(parent).isSymbolicLink())
      throw new Error('Database parent directories must not be links.');
    if (!inside(workspaceRoot, realpathSync(parent)))
      throw new Error('Database directory escapes the worktree.');
  }
  if (options.mode === 'create-new') {
    closeSync(openSync(filename, 'wx'));
  } else {
    if (!existsSync(filename) || !inside(permitted, realpathSync(filename)))
      throw new Error('Owned disposable database not found.');
    const probe = new BetterSqlite3(filename, { readonly: true, fileMustExist: true });
    try {
      if (probe.pragma('application_id', { simple: true }) !== G1_APPLICATION_ID)
        throw new Error('Unknown database ownership; refusing writable access.');
    } finally {
      probe.close();
    }
  }
  const sqlite = new BetterSqlite3(filename, { fileMustExist: true, timeout: 1000 });
  try {
    if (options.mode === 'create-new') sqlite.pragma(`application_id = ${G1_APPLICATION_ID}`);
    sqlite.pragma('foreign_keys = ON');
    sqlite.pragma('busy_timeout = 1000');
    if (sqlite.pragma('foreign_keys', { simple: true }) !== 1)
      throw new Error('SQLite foreign keys must be enabled.');
    return {
      sqlite,
      orm: drizzle(sqlite, { schema }),
      workspaceRoot,
      filename,
      close: () => {
        if (sqlite.open) sqlite.close();
      },
    };
  } catch (error) {
    sqlite.close();
    throw error;
  }
}
