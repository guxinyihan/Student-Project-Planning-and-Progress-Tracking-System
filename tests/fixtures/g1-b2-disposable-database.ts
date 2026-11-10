import BetterSqlite3 from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { closeSync, existsSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { asDependencyId, asProjectId, asTaskId, asUserId } from '@group9/shared';
import { createSourceUnitOfWork } from '../../src/backend/persistence/source-unit-of-work.js';
import { createOperationDispatcher } from '../../src/backend/application/operation-dispatcher.js';
import type {
  EnabledOperation, InsertIntent, InternalCommand, OperationCapability, TransactionHooks,
} from '../../src/backend/application/unit-of-work.js';

export const isolatedSourceRoot = realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
export const disposableRoot = join(isolatedSourceRoot, 'evidence', 'g1-b2-tranche-a', 'test-databases');
const APPLICATION_ID = 0x47394131;
export const SEED_TIME = '2026-11-03T00:00:00.000Z';
export interface HarnessFixtureOptions {
  actorId?: string;
  f3Enabled?: boolean;
  handlers?: Partial<Record<EnabledOperation, (capability: OperationCapability, command: InternalCommand) => unknown>>;
  hooks?: (sqlite: BetterSqlite3.Database) => TransactionHooks;
  filename?: string;
  seed?: boolean;
}
function inside(root: string, target: string): boolean {
  const name = relative(root, target);
  return name !== '' && name !== '..' && !name.startsWith(`..${sep}`) && !isAbsolute(name);
}
function guardedFilename(filename: string, createParents: boolean): string {
  const full = resolve(filename);
  if (!inside(disposableRoot, full) || !full.endsWith('.sqlite'))
    throw new Error('Disposable fixture path must remain inside the approved test-databases directory.');
  let parent = isolatedSourceRoot;
  for (const component of relative(isolatedSourceRoot, dirname(full)).split(sep)) {
    parent = join(parent, component);
    if (!existsSync(parent)) {
      if (!createParents) throw new Error('Owned disposable database parent is missing.');
      mkdirSync(parent);
    }
    if (lstatSync(parent).isSymbolicLink() || !inside(isolatedSourceRoot, realpathSync(parent)))
      throw new Error('Disposable database parents must not be links or escape the isolated source.');
  }
  if (existsSync(full) && (lstatSync(full).isSymbolicLink() || !inside(disposableRoot, realpathSync(full))))
    throw new Error('Disposable database file must not be a link or escape the approved directory.');
  return full;
}
/** Reopen only an already owned fixture file; never accepts an arbitrary existing database. */
export function openOwnedDisposable(filename: string, options: { readonly?: boolean } = {}): BetterSqlite3.Database {
  const full = guardedFilename(filename, false);
  const probe = new BetterSqlite3(full, { readonly: true, fileMustExist: true });
  try {
    if (probe.pragma('application_id', { simple: true }) !== APPLICATION_ID)
      throw new Error('Unknown disposable database ownership.');
  } finally { probe.close(); }
  const db = new BetterSqlite3(full, { fileMustExist: true, readonly: options.readonly ?? false, timeout: 25 });
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 25');
  return db;
}
/** Test-only composition root. No business entrypoint imports this synthetic identity authority. */
export function createHarnessFixture(options: HarnessFixtureOptions = {}) {
  const filename = guardedFilename(options.filename ?? join(disposableRoot, `${randomUUID()}.sqlite`), true);
  closeSync(openSync(filename, 'wx'));
  const sqlite = new BetterSqlite3(filename, { fileMustExist: true, timeout: 25 });
  try {
    sqlite.pragma(`application_id = ${APPLICATION_ID}`);
    sqlite.pragma('foreign_keys = ON');
    sqlite.pragma('busy_timeout = 25');
    if (sqlite.pragma('foreign_keys', { simple: true }) !== 1) throw new Error('Foreign keys are required.');
    // Exact immutable baseline definitions only; no migration runner/history/upgrader is invoked.
    for (const name of ['0001_initial.sql', '0002_duration_nul_integrity.sql'])
      sqlite.exec(readFileSync(join(isolatedSourceRoot, 'src/backend/persistence/migrations', name), 'utf8'));
    if (options.seed !== false) sqlite.exec(`
      INSERT INTO users VALUES
        ('U1','Synthetic leader','${SEED_TIME}','${SEED_TIME}'),
        ('U2','Synthetic member','${SEED_TIME}','${SEED_TIME}'),
        ('U3','Synthetic inactive member','${SEED_TIME}','${SEED_TIME}'),
        ('U4','Other synthetic leader','${SEED_TIME}','${SEED_TIME}');
      INSERT INTO projects VALUES
        ('P1','Synthetic P1',NULL,NULL,NULL,NULL,1,'${SEED_TIME}','${SEED_TIME}'),
        ('P2','Synthetic P2',NULL,NULL,NULL,NULL,1,'${SEED_TIME}','${SEED_TIME}');
      INSERT INTO project_members VALUES
        ('M1','P1','U1','LEADER',1,NULL,'${SEED_TIME}','${SEED_TIME}'),
        ('M2','P1','U2','MEMBER',1,NULL,'${SEED_TIME}','${SEED_TIME}'),
        ('M3','P1','U3','MEMBER',0,'${SEED_TIME}','${SEED_TIME}','${SEED_TIME}'),
        ('M4','P2','U4','LEADER',1,NULL,'${SEED_TIME}','${SEED_TIME}');
      INSERT INTO tasks VALUES
        ('A','P1','Synthetic A','Preserve description','M1','0.10','2026-11-08','NOT_STARTED','${SEED_TIME}','${SEED_TIME}'),
        ('B','P1','Synthetic B',NULL,NULL,'2',NULL,'IN_PROGRESS','${SEED_TIME}','${SEED_TIME}'),
        ('C','P1','Synthetic C',NULL,NULL,NULL,NULL,'NOT_STARTED','${SEED_TIME}','${SEED_TIME}'),
        ('X','P2','Other task',NULL,'M4',NULL,NULL,'NOT_STARTED','${SEED_TIME}','${SEED_TIME}');
      INSERT INTO task_dependencies VALUES ('L1','P1','A','B','${SEED_TIME}');
      INSERT INTO progress_notes VALUES ('N1','P1','A','M3','Retained historical note','${SEED_TIME}');
    `);
    const state = { actorId: options.actorId ?? 'U1', f3Enabled: options.f3Enabled ?? true };
    const authority = {
      resolveActor: () => asUserId(state.actorId),
      runtimePolicy: () => Object.freeze({ f3Enabled: state.f3Enabled, f4Enabled: false, f6Enabled: false, datePolicy: 'UNRESOLVED' as const }),
    };
    const uow = createSourceUnitOfWork(sqlite, { authority, ...(options.hooks ? { hooks: options.hooks(sqlite) } : {}) });
    const dispatcher = createOperationDispatcher(uow, options.handlers ? { handlers: options.handlers } : {});
    return { sqlite, uow, dispatcher, state, filename, close: () => { if (sqlite.open) sqlite.close(); } };
  } catch (error) { if (sqlite.open) sqlite.close(); throw error; }
}
export function commandName(name = 'Renamed A', expectedRevision = 1, taskId = 'A', projectId = 'P1'): InternalCommand {
  return { operationId: 'F2-07', projectId: asProjectId(projectId), expectedRevision, payload: { taskId: asTaskId(taskId), name } };
}
export function commandInsert(id = 'L2', from = 'B', to = 'C', expectedRevision = 1, projectId = 'P1'): InternalCommand {
  return { operationId: 'F3-04', projectId: asProjectId(projectId), expectedRevision, payload: { dependencyId: asDependencyId(id), prerequisiteId: asTaskId(from), dependentId: asTaskId(to) } };
}
export function commandRemove(id = 'L1', expectedRevision = 1, projectId = 'P1'): InternalCommand {
  return { operationId: 'F3-05', projectId: asProjectId(projectId), expectedRevision, payload: { dependencyId: asDependencyId(id) } };
}
export function commandBatch(inserts: readonly InsertIntent[], removes: readonly string[], expectedRevision = 1, projectId = 'P1'): InternalCommand {
  return { operationId: 'F3-06', projectId: asProjectId(projectId), expectedRevision, payload: { inserts, removes: removes.map(asDependencyId) } };
}
export function sourceState(sqlite: BetterSqlite3.Database): Record<string, unknown[]> {
  return Object.fromEntries([
    ['users', 'user_id'], ['projects', 'project_id'], ['project_members', 'member_id'],
    ['tasks', 'task_id'], ['task_dependencies', 'dependency_id'], ['progress_notes', 'note_id'],
  ].map(([table, id]) => [table!, sqlite.prepare(`SELECT * FROM ${table} ORDER BY ${id}`).all()]));
}
export function revision(sqlite: BetterSqlite3.Database, projectId = 'P1'): number {
  return (sqlite.prepare('SELECT revision FROM projects WHERE project_id=?').get(projectId) as { revision: number }).revision;
}
