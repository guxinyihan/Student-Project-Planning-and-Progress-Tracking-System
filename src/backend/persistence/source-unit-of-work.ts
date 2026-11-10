import type BetterSqlite3 from 'better-sqlite3';
import { asDependencyId, asMemberId, asRevision, asTaskId, asUserId, type DependencyView, type TaskId } from '@group9/shared';
import { exactCapability, invalid, parseInternalCommand, record, taskName } from '../application/operation-capabilities.js';
import { SourceTransactionError, UnknownTransactionOutcomeError, type ActiveSourceMember, type CommittedOperation, type InternalCommand, type InternalMutationValue, type OperationCapability, type SourceUnitOfWork, type SourceUnitOfWorkOptions, type TransactionDiagnostic } from '../application/unit-of-work.js';
import { validateFinalCandidate } from './dependency-finalizer.js';
import { detectSemanticDelta, hasSemanticChanges } from './source-semantic-delta.js';

const quarantinedConnections = new WeakSet<object>();
const activeTransactions = new WeakMap<object, (error: unknown) => void>();
/** Examine then only after business-handler authority closes. Drain async rejections safely. */
function synchronous(value: unknown): void {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return;
  const then: unknown = Reflect.get(value, 'then');
  if (typeof then !== 'function') return;
  void new Promise<unknown>((resolve, reject) => {
    queueMicrotask(() => {
      try { Reflect.apply(then, value, [resolve, reject]); } catch (error) { reject(error); }
    });
  }).catch(() => undefined);
  invalid('Source transaction work must be synchronous.');
}
function fail(code: string, message: string): never { throw new SourceTransactionError(code, message); }
function zeroArguments(args: readonly unknown[]): void {
  if (args.length) invalid('This intent is already bound; extra arguments are forbidden.');
}

/** Private composition port: handlers never receive this coordinator, its connection or Finalizer. */
export function createSourceUnitOfWork(database: BetterSqlite3.Database, options?: SourceUnitOfWorkOptions): SourceUnitOfWork {
  const diagnostics: TransactionDiagnostic[] = [];
  const resolveActor = options?.authority.resolveActor;
  const runtimePolicy = options?.authority.runtimePolicy;
  const hooks = Object.freeze({ ...options?.hooks });
  function rejectReentry(): void {
    const poisonOuter = activeTransactions.get(database);
    if (poisonOuter) {
      const error = new SourceTransactionError('INVALID_INPUT', 'Nested source transactions are unsupported.');
      poisonOuter(error); throw error;
    }
  }
  return Object.freeze({
    run(): never {
      rejectReentry();
      return fail('OPERATION_NOT_ENABLED', 'Generic callback/repository grants are disabled; use the internal operation dispatcher.');
    },
    diagnostics: () => Object.freeze(diagnostics.map((item) => Object.freeze({ ...item }))),
    execute(rawCommand: InternalCommand, handler: (capability: OperationCapability) => unknown): CommittedOperation<InternalMutationValue> {
      rejectReentry();
      if (quarantinedConnections.has(database) || !database.open) fail('TRANSACTION_CLOSED', 'Transaction connection is unavailable.');
      if (database.inTransaction) fail('INVALID_INPUT', 'An independent source transaction is required.');
      if (!resolveActor || !runtimePolicy) fail('IDENTITY_NOT_CONFIGURED', 'Trusted internal authority is required.');
      if (typeof handler !== 'function' || handler.constructor.name === 'AsyncFunction') invalid('A trusted synchronous handler is required.');
      const command = parseInternalCommand(rawCommand);
      const f3 = command.operationId !== 'F2-07';
      let handlerActive = false;
      let hasPoison = false;
      let poisoned: unknown;
      let commitAttempted = false;
      const poison = (error: unknown): void => { hasPoison = true; poisoned = error; handlerActive = false; };
      const namesBefore = new Map<string, string>();
      const namesAfter = new Map<string, string>();
      let edgesBefore: readonly DependencyView[] = [];
      const edgeCandidate = new Map<string, DependencyView>();
      const checkPolicy = (): void => {
        if (!f3) return;
        const policy = runtimePolicy(); synchronous(policy);
        const p = record(policy, ['f3Enabled', 'f4Enabled', 'f6Enabled', 'datePolicy']);
        if (['f3Enabled', 'f4Enabled', 'f6Enabled'].some((key) => typeof p[key] !== 'boolean') ||
            !['UNRESOLVED', 'EXPLICIT_CANDIDATE_FIXTURE', 'AGREED_POLICY'].includes(p.datePolicy as string)) invalid('Trusted RuntimePolicy is invalid.');
        if (p.f3Enabled !== true) fail('FEATURE_NOT_ENABLED', 'F3 is disabled by trusted application policy.');
      };
      function guarded<T>(operation: () => T): T {
        if (!handlerActive) fail('TRANSACTION_CLOSED', 'Operation capability is inactive.');
        try { checkPolicy(); return operation(); } catch (error) { poison(error); throw error; }
      }
      function boundTaskName(): Readonly<{ taskId: TaskId; name: string }> {
        if (command.operationId !== 'F2-07') invalid('Task read capability is not granted.');
        const id = command.payload.taskId;
        if (!namesAfter.has(id)) {
          const row = database.prepare('SELECT name FROM tasks WHERE project_id=? AND task_id=?').get(command.projectId, id) as { name: string } | undefined;
          if (!row) fail('INVALID_OR_INACCESSIBLE_TASK', 'Invalid or inaccessible task.');
          namesBefore.set(id, row.name); namesAfter.set(id, row.name);
        }
        return Object.freeze({ taskId: id, name: namesAfter.get(id)! });
      }
      const insertAll = (): void => {
        const intents = command.operationId === 'F3-04' ? [command.payload] : command.operationId === 'F3-06' ? command.payload.inserts : [];
        for (const intent of intents) {
          if (edgeCandidate.has(intent.dependencyId)) fail('INVALID_OR_INACCESSIBLE_REFERENCE', 'Invalid or inaccessible dependency.');
          const existing = database.prepare('SELECT project_id AS projectId FROM task_dependencies WHERE dependency_id=?').get(intent.dependencyId) as { projectId: string } | undefined;
          if (existing && existing.projectId !== command.projectId) fail('INVALID_OR_INACCESSIBLE_REFERENCE', 'Invalid or inaccessible dependency.');
          edgeCandidate.set(intent.dependencyId, Object.freeze({ ...intent, projectId: command.projectId }));
        }
      };
      const removeAll = (): void => {
        const ids = command.operationId === 'F3-05' ? [command.payload.dependencyId] : command.operationId === 'F3-06' ? command.payload.removes : [];
        for (const id of ids) {
          if (!edgeCandidate.has(id)) fail('INVALID_OR_INACCESSIBLE_REFERENCE', 'Invalid or inaccessible dependency.');
          edgeCandidate.delete(id);
        }
      };
      database.exec('BEGIN IMMEDIATE');
      activeTransactions.set(database, poison);
      try {
        const actor = resolveActor(); synchronous(actor);
        const actorId = asUserId(actor);
        const member = database.prepare('SELECT member_id AS memberId,role FROM project_members WHERE project_id=? AND user_id=? AND active=1 AND left_at IS NULL').get(command.projectId, actorId) as ActiveSourceMember | undefined;
        if (!member) fail('INVALID_OR_INACCESSIBLE_PROJECT', 'Invalid or inaccessible project.');
        asMemberId(member.memberId);
        if (member.role !== 'LEADER') fail('FORBIDDEN', 'This operation requires the current project Leader.');
        const current = database.prepare('SELECT revision FROM projects WHERE project_id=?').get(command.projectId) as { revision: number } | undefined;
        if (!current || current.revision !== command.expectedRevision) fail('REVISION_CONFLICT', 'Project changed; reload before saving.');
        if (current.revision === Number.MAX_SAFE_INTEGER) invalid('Project revision capacity reached.');
        checkPolicy();
        if (f3) {
          edgesBefore = Object.freeze((database.prepare('SELECT dependency_id AS dependencyId,project_id AS projectId,prerequisite_id AS prerequisiteId,dependent_id AS dependentId FROM task_dependencies WHERE project_id=? ORDER BY dependency_id').all(command.projectId) as DependencyView[]).map((r) => Object.freeze({ ...r })));
          for (const edge of edgesBefore) edgeCandidate.set(edge.dependencyId, edge);
        } else boundTaskName();
        const capability = exactCapability(command.operationId, {
          readTaskToUpdateFields: (...args) => guarded(() => { zeroArguments(args); return boundTaskName(); }),
          stageTaskAllowedFields: (...args) => guarded(() => {
            if (args.length !== 1 || command.operationId !== 'F2-07') invalid('Only bound task-name input is allowed.');
            const input = record(args[0], ['name']); boundTaskName(); namesAfter.set(command.payload.taskId, taskName(input.name));
          }),
          stageDependencyInsert: (...args) => guarded(() => { zeroArguments(args); insertAll(); }),
          stageDependencyRemove: (...args) => guarded(() => { zeroArguments(args); removeAll(); }),
        });
        handlerActive = true;
        let returned: unknown;
        try { returned = handler(capability); } finally { handlerActive = false; }
        synchronous(returned);
        if (hasPoison) throw poisoned;
        if (returned !== undefined) invalid('Handlers stage intents only; results are constructed by the private coordinator.');
        checkPolicy();
        const finalEdges = Object.freeze([...edgeCandidate.values()]);
        if (f3) {
          const tasks = database.prepare('SELECT task_id AS taskId,project_id AS projectId FROM tasks WHERE project_id=? ORDER BY task_id').all(command.projectId) as { taskId: TaskId; projectId: InternalCommand['projectId'] }[];
          validateFinalCandidate(command.projectId, Object.freeze(tasks.map((t) => Object.freeze({ ...t }))), finalEdges);
        }
        const delta = detectSemanticDelta(namesBefore, namesAfter, edgesBefore, finalEdges);
        if (!hasSemanticChanges(delta)) invalid('No semantic source change; updatedAt and Revision remain unchanged.');
        synchronous(hooks.beforePersist?.());
        if (hasPoison) throw poisoned;
        const timestamp = new Date().toISOString();
        for (const removed of delta.removed) database.prepare('DELETE FROM task_dependencies WHERE project_id=? AND dependency_id=?').run(command.projectId, removed.dependencyId);
        for (const inserted of delta.inserted) database.prepare('INSERT INTO task_dependencies(dependency_id,project_id,prerequisite_id,dependent_id,created_at) VALUES (?,?,?,?,?)').run(inserted.dependencyId, command.projectId, inserted.prerequisiteId, inserted.dependentId, timestamp);
        for (const name of delta.taskNames) database.prepare('UPDATE tasks SET name=?,updated_at=? WHERE project_id=? AND task_id=?').run(name.afterName, timestamp, command.projectId, name.taskId);
        const updated = database.prepare('UPDATE projects SET revision=revision+1,updated_at=? WHERE project_id=? AND revision=?').run(timestamp, command.projectId, command.expectedRevision);
        if (updated.changes !== 1) fail('REVISION_CONFLICT', 'Project changed; reload before saving.');
        synchronous(hooks.beforeCommit?.());
        if (hasPoison) throw poisoned;
        checkPolicy();
        const finalActor = resolveActor(); synchronous(finalActor);
        if (asUserId(finalActor) !== actorId) fail('FORBIDDEN', 'Trusted actor changed during the operation.');
        if (!database.prepare("SELECT 1 FROM project_members WHERE project_id=? AND user_id=? AND active=1 AND left_at IS NULL AND role='LEADER'").get(command.projectId, actorId)) fail('FORBIDDEN', 'Current authorization no longer permits this operation.');
        if (hasPoison) throw poisoned;
        let value: InternalMutationValue;
        if (command.operationId === 'F2-07') value = Object.freeze({ taskId: command.payload.taskId, name: namesAfter.get(command.payload.taskId)! });
        else if (command.operationId === 'F3-04') value = Object.freeze({ dependencyId: command.payload.dependencyId, removed: false });
        else if (command.operationId === 'F3-05') value = Object.freeze({ dependencyId: command.payload.dependencyId, removed: true });
        else value = Object.freeze({ inserted: Object.freeze(delta.inserted.map((e) => asDependencyId(e.dependencyId))), removed: Object.freeze(delta.removed.map((e) => asDependencyId(e.dependencyId))) });
        const affected = new Set<TaskId>(delta.taskNames.map((t) => asTaskId(t.taskId)));
        for (const edge of [...delta.inserted, ...delta.removed]) { affected.add(asTaskId(edge.prerequisiteId)); affected.add(asTaskId(edge.dependentId)); }
        const receipt: CommittedOperation<InternalMutationValue> = Object.freeze({ kind: 'COMMITTED', projectId: command.projectId, operationId: command.operationId, revision: asRevision(current.revision + 1), value, changedFields: Object.freeze(f3 ? ['dependencies'] : ['name']), affectedTaskIds: Object.freeze([...affected].sort()) });
        commitAttempted = true;
        if (hooks.commit) synchronous(hooks.commit()); else database.exec('COMMIT');
        if (hasPoison) throw poisoned;
        if (database.inTransaction) throw new Error('COMMIT did not close the transaction.');
        diagnostics.push(Object.freeze({ operationId: command.operationId, projectId: command.projectId, outcome: 'COMMITTED', message: 'COMMIT returned successfully.' }));
        return receipt;
      } catch (error) {
        handlerActive = false;
        let rollbackConfirmed = false;
        let rollbackThrew = false;
        let rollbackFailed: unknown;
        if (database.open && database.inTransaction) {
          try {
            if (hooks.rollback) synchronous(hooks.rollback()); else database.exec('ROLLBACK');
            if (database.inTransaction) throw new Error('ROLLBACK did not close the transaction.');
            rollbackConfirmed = true;
          } catch (failure) { rollbackThrew = true; rollbackFailed = failure; }
        }
        if (!rollbackConfirmed) {
          quarantinedConnections.add(database);
          try { database.close(); } catch { /* Retain uncertainty; do not invent rollback. */ }
          const diagnostic: TransactionDiagnostic = Object.freeze({ operationId: command.operationId, projectId: command.projectId, outcome: 'UNKNOWN', message: `${commitAttempted ? 'COMMIT' : 'Transaction'} or rollback outcome is uncertain; diagnostics retained; no retry or success result.` });
          diagnostics.push(diagnostic);
          throw new UnknownTransactionOutcomeError(diagnostic.message, diagnostic, { cause: rollbackThrew ? new AggregateError([error, rollbackFailed], 'Transaction/rollback failure') : error });
        }
        diagnostics.push(Object.freeze({ operationId: command.operationId, projectId: command.projectId, outcome: 'ROLLED_BACK', message: rollbackConfirmed ? 'ROLLBACK confirmed; no source success result.' : 'Rejected before source mutation.' }));
        throw error;
      } finally {
        handlerActive = false;
        activeTransactions.delete(database);
      }
    },
  });
}
