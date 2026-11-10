import { asDependencyId, asProjectId, asRevision, asTaskId } from '@group9/shared';
import {
  SourceTransactionError,
  type EnabledOperation,
  type InsertIntent,
  type InternalCommand,
  type OperationCapability,
} from './unit-of-work.js';

export const OPERATION_CATALOG = Object.freeze([
  'F1-01', 'F1-02', 'F1-03', 'F1-04',
  'F2-01', 'F2-02', 'F2-03', 'F2-04', 'F2-05', 'F2-06', 'F2-07', 'F2-08', 'F2-09', 'F2-10', 'F2-11', 'F2-12',
  'F3-01', 'F3-02', 'F3-03', 'F3-04', 'F3-05', 'F3-06',
  'F456-01', 'F456-02', 'F456-03', 'F456-04', 'F456-05',
] as const);
export const ENABLED_OPERATIONS: readonly EnabledOperation[] = Object.freeze(['F2-07', 'F3-04', 'F3-05', 'F3-06']);
export const G1_A_EXTERNAL_API_EXPOSURE = false as const;
export const CAPABILITY_METHODS = Object.freeze({
  'F2-07': Object.freeze(['readTaskToUpdateFields', 'stageTaskAllowedFields']),
  'F3-04': Object.freeze(['stageDependencyInsert']),
  'F3-05': Object.freeze(['stageDependencyRemove']),
  'F3-06': Object.freeze(['stageDependencyInsert', 'stageDependencyRemove']),
});
export function invalid(message: string): never {
  throw new SourceTransactionError('INVALID_INPUT', message);
}
/** Reject accessors/symbols/extra fields before reading values or issuing any authority. */
export function record(value: unknown, allowed: readonly string[], required = allowed): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('Expected a plain data object.');
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) invalid('Expected a plain data object.');
  const out: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.includes(key)) invalid('Unexpected input field.');
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor)) invalid('Input accessors are not allowed.');
    out[key] = descriptor.value as unknown;
  }
  if (required.some((key) => !Object.hasOwn(out, key))) invalid('Missing required input field.');
  return out;
}
export function taskName(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) invalid('Task name must be nonempty.');
  return value;
}
function insert(value: unknown): InsertIntent {
  const p = record(value, ['dependencyId', 'prerequisiteId', 'dependentId']);
  return Object.freeze({ dependencyId: asDependencyId(p.dependencyId), prerequisiteId: asTaskId(p.prerequisiteId), dependentId: asTaskId(p.dependentId) });
}
function array(value: unknown): readonly unknown[] {
  if (!Array.isArray(value)) invalid('Expected an array of fixed intents.');
  // Read descriptors, not a caller-supplied iterator or element getter.
  const values: unknown[] = [];
  for (const key of Reflect.ownKeys(value)) {
    if (key === 'length') continue;
    if (typeof key !== 'string' || !/^(0|[1-9][0-9]*)$/.test(key)) invalid('Unexpected intent array property.');
    const d = Object.getOwnPropertyDescriptor(value, key);
    if (!d || !('value' in d)) invalid('Intent array accessors are not allowed.');
  }
  for (let i = 0; i < value.length; i++) {
    const d = Object.getOwnPropertyDescriptor(value, String(i));
    if (!d || !('value' in d)) invalid('Sparse intent arrays are not allowed.');
    values.push(d.value as unknown);
  }
  return values;
}
export function parseInternalCommand(value: unknown): InternalCommand {
  const p = record(value, ['operationId', 'projectId', 'expectedRevision', 'payload']);
  if (!ENABLED_OPERATIONS.includes(p.operationId as EnabledOperation))
    throw new SourceTransactionError('OPERATION_NOT_ENABLED', 'Operation is not enabled in G1-A.');
  const scope = { projectId: asProjectId(p.projectId), expectedRevision: asRevision(p.expectedRevision) };
  switch (p.operationId) {
    case 'F2-07': {
      const q = record(p.payload, ['taskId', 'name']);
      return Object.freeze({ ...scope, operationId: 'F2-07', payload: Object.freeze({ taskId: asTaskId(q.taskId), name: taskName(q.name) }) });
    }
    case 'F3-04': return Object.freeze({ ...scope, operationId: 'F3-04', payload: insert(p.payload) });
    case 'F3-05': {
      const q = record(p.payload, ['dependencyId']);
      return Object.freeze({ ...scope, operationId: 'F3-05', payload: Object.freeze({ dependencyId: asDependencyId(q.dependencyId) }) });
    }
    case 'F3-06': {
      const q = record(p.payload, ['inserts', 'removes']);
      const inserts = Object.freeze(array(q.inserts).map(insert));
      const removes = Object.freeze(array(q.removes).map(asDependencyId));
      if (inserts.length + removes.length === 0) invalid('A dependency batch must contain intents.');
      return Object.freeze({ ...scope, operationId: 'F3-06', payload: Object.freeze({ inserts, removes }) });
    }
    default: return invalid('Unsupported operation.');
  }
}
export function exactCapability(operation: EnabledOperation, methods: Record<string, (...args: unknown[]) => unknown>): OperationCapability {
  const out = Object.create(null) as Record<string, (...args: unknown[]) => unknown>;
  for (const method of CAPABILITY_METHODS[operation]) {
    const fn = methods[method];
    if (!fn) throw new Error('Missing private capability implementation.');
    Object.defineProperty(out, method, { value: fn, enumerable: true, writable: false, configurable: false });
  }
  return Object.freeze(out) as unknown as OperationCapability;
}
