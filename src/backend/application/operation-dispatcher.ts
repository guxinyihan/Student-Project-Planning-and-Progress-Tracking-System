import { internalMutationResult } from './mutation-result-adapter.js';
import { ENABLED_OPERATIONS, G1_A_EXTERNAL_API_EXPOSURE, parseInternalCommand, record } from './operation-capabilities.js';
import { type BatchCapability, type EnabledOperation, type InsertCapability, type InternalCommand, type OperationCapability, type RemoveCapability, type SourceUnitOfWork, type TaskNameCapability } from './unit-of-work.js';

export type InternalHandler = (capability: OperationCapability, command: InternalCommand) => unknown;
export interface DispatcherOptions {
  /** Trusted composition/test harness only; never command/request fields. */
  readonly handlers?: Partial<Record<EnabledOperation, InternalHandler>>;
}
const defaults: Readonly<Record<EnabledOperation, InternalHandler>> = Object.freeze({
  'F2-07': (cap, command) => {
    if (command.operationId !== 'F2-07') throw new Error('Dispatcher binding mismatch.');
    (cap as TaskNameCapability).stageTaskAllowedFields({ name: command.payload.name });
  },
  'F3-04': (cap) => { (cap as InsertCapability).stageDependencyInsert(); },
  'F3-05': (cap) => { (cap as RemoveCapability).stageDependencyRemove(); },
  'F3-06': (cap) => {
    (cap as BatchCapability).stageDependencyRemove();
    (cap as BatchCapability).stageDependencyInsert();
  },
});
/** Internal composition only. No HTTP/controller/API route is registered. */
export function createOperationDispatcher(unitOfWork: SourceUnitOfWork, options: DispatcherOptions = {}) {
  const configured = record(options, ['handlers'], []);
  const supplied = configured.handlers === undefined ? Object.create(null) as Record<string, unknown> : record(configured.handlers, ENABLED_OPERATIONS, []);
  const handlers: Record<string, InternalHandler> = Object.create(null) as Record<string, InternalHandler>;
  for (const id of ENABLED_OPERATIONS) {
    const candidate = supplied[id] ?? defaults[id];
    if (typeof candidate !== 'function') throw new TypeError('An internal handler must be callable.');
    handlers[id] = candidate as InternalHandler;
  }
  Object.freeze(handlers);
  return Object.freeze({
    externalApiExposure: G1_A_EXTERNAL_API_EXPOSURE,
    dispatch(input: unknown) {
      const command = parseInternalCommand(input);
      const handler = handlers[command.operationId];
      if (!handler) throw new Error('Missing fixed operation handler.');
      return internalMutationResult(unitOfWork.execute(command, (capability) => handler(capability, command)));
    },
  });
}
