import {
  asProjectId,
  asRevision,
  asTaskId,
  type MutationResult,
  type SavedChange,
} from '@group9/shared';
import { ENABLED_OPERATIONS } from './operation-capabilities.js';
import { SourceTransactionError, type CommittedOperation } from './unit-of-work.js';

const enabledOperations = new Set(ENABLED_OPERATIONS);

function invalidCommit(): SourceTransactionError {
  return new SourceTransactionError(
    'INVALID_INPUT',
    'Internal mutation results require confirmed-commit plain data.',
  );
}

function immutableValue(value: unknown, ancestors = new Set<object>()): unknown {
  if (value === null || value === undefined || typeof value === 'string' || typeof value === 'boolean')
    return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw invalidCommit();
    return value;
  }
  if (typeof value !== 'object' || ancestors.has(value)) throw invalidCommit();
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== null && prototype !== Object.prototype)
    throw invalidCommit();
  ancestors.add(value);
  try {
    const output: Record<string, unknown> | unknown[] = Array.isArray(value)
      ? new Array<unknown>(value.length)
      : (Object.create(null) as Record<string, unknown>);
    for (const key of Reflect.ownKeys(value)) {
      if (Array.isArray(value) && key === 'length') continue;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        typeof key !== 'string' ||
        descriptor === undefined ||
        !descriptor.enumerable ||
        !('value' in descriptor)
      )
        throw invalidCommit();
      Object.defineProperty(output, key, {
        value: immutableValue(descriptor.value, ancestors),
        enumerable: true,
        configurable: false,
        writable: false,
      });
    }
    return Object.freeze(output);
  } finally {
    ancestors.delete(value);
  }
}

/**
 * Internal trusted composition only, called after a definite COMMIT. The structural
 * marker is not proof of database provenance and cannot establish public authority.
 * UNKNOWN/failed/no-op outcomes have no successful result. No HTTP error mapping,
 * production recovery, event delivery or exactly-once service is implemented here.
 */
export function internalMutationResult<T>(
  committed: CommittedOperation<T>,
): Readonly<MutationResult<T>> {
  if (
    committed === null ||
    typeof committed !== 'object' ||
    committed.kind !== 'COMMITTED' ||
    !enabledOperations.has(committed.operationId) ||
    !Array.isArray(committed.affectedTaskIds) ||
    !Array.isArray(committed.changedFields) ||
    committed.changedFields.length === 0 ||
    committed.changedFields.some((field) => typeof field !== 'string' || field.length === 0)
  )
    throw invalidCommit();
  const projectId = asProjectId(committed.projectId);
  const revision = asRevision(committed.revision);
  const affectedTaskIds = committed.affectedTaskIds.map(asTaskId);
  const changedFields = [...committed.changedFields];
  Object.freeze(affectedTaskIds);
  Object.freeze(changedFields);
  const savedChange: SavedChange = {
    projectId,
    revision,
    changeKind: committed.operationId,
    affectedTaskIds,
    changedFields,
  };
  Object.freeze(savedChange);
  return Object.freeze({
    ok: true,
    projectId,
    revision,
    value: immutableValue(committed.value) as T,
    savedChange,
  });
}
