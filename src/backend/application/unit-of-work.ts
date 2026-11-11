import type {
  DependencyId,
  DependencyView,
  MemberId,
  ProjectId,
  ProjectRole,
  Revision,
  TaskId,
  TaskSnapshot,
  UserId,
  RuntimePolicy,
} from '@group9/shared';

export class SourceTransactionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'SourceTransactionError';
  }
}
export interface ActiveSourceMember {
  readonly memberId: MemberId;
  readonly role: 'LEADER' | 'MEMBER';
}
/** Minimal candidate ports for technical foundation tests, not full F1/F2/F3 use cases. */
export interface ManagementRepository {
  getTask(taskId: TaskId): Readonly<TaskSnapshot>;
  updateTaskName(taskId: TaskId, name: string): Readonly<TaskSnapshot>;
}
export interface DependencyRepository {
  list(): readonly Readonly<DependencyView>[];
  add(
    input: Readonly<{ dependencyId: DependencyId; prerequisiteId: TaskId; dependentId: TaskId }>,
  ): Readonly<DependencyView>;
  remove(dependencyId: DependencyId): void;
}
export interface SourceTransaction {
  readonly management: ManagementRepository;
  readonly dependencies: DependencyRepository;
}
export interface SourceTransactionInput {
  readonly verifiedActorId: UserId;
  readonly projectId: ProjectId;
  readonly expectedRevision: Revision;
  authorize(member: ActiveSourceMember): void;
}
/** Reject PromiseLike return types; runtime checks remain mandatory for untyped callers. */
export type SynchronousWork<T> = (
  transaction: SourceTransaction,
) => T & ([Extract<T, { readonly then: unknown }>] extends [never] ? unknown : never);
export interface SourceUnitOfWork {
  run<T>(input: SourceTransactionInput, work: SynchronousWork<T>): { value: T; revision: Revision };
  /** Trusted composition/harness port only. Never supplied to business handlers or HTTP routes. */
  execute(command: InternalCommand, handler: (capability: OperationCapability) => unknown): CommittedOperation<InternalMutationValue>;
  diagnostics(): readonly TransactionDiagnostic[];
}

export type EnabledOperation = 'F2-03' | 'F2-07' | 'F3-04' | 'F3-05' | 'F3-06';
export interface InsertIntent {
  readonly dependencyId: DependencyId;
  readonly prerequisiteId: TaskId;
  readonly dependentId: TaskId;
}
interface CommandScope {
  readonly projectId: ProjectId;
  readonly expectedRevision: Revision;
}
export type InternalCommand = CommandScope & (
  | { readonly operationId: 'F2-03'; readonly payload: Readonly<{ memberId: MemberId; role: ProjectRole }> }
  | { readonly operationId: 'F2-07'; readonly payload: Readonly<{ taskId: TaskId; name: string }> }
  | { readonly operationId: 'F3-04'; readonly payload: InsertIntent }
  | { readonly operationId: 'F3-05'; readonly payload: Readonly<{ dependencyId: DependencyId }> }
  | { readonly operationId: 'F3-06'; readonly payload: Readonly<{ inserts: readonly InsertIntent[]; removes: readonly DependencyId[] }> }
);
export interface MemberRoleCapability {
  stageTargetRole(): void;
}
export interface TaskNameCapability {
  readTaskToUpdateFields(): Readonly<{ taskId: TaskId; name: string }>;
  stageTaskAllowedFields(input: Readonly<{ name: string }>): void;
}
export interface InsertCapability { stageDependencyInsert(): void }
export interface RemoveCapability { stageDependencyRemove(): void }
export type BatchCapability = InsertCapability & RemoveCapability;
export type OperationCapability = Readonly<MemberRoleCapability | TaskNameCapability | InsertCapability | RemoveCapability | BatchCapability>;
export interface InternalAuthority {
  /** Injected at the trusted composition root, not accepted in request/command data. */
  resolveActor(): UserId;
  runtimePolicy(): Readonly<RuntimePolicy>;
}
export interface TransactionHooks {
  /** Trusted disposable-harness fault injection only; no hook is exposed through a capability. */
  beforePersist?(): void;
  beforeCommit?(): void;
  commit?(): void;
  rollback?(): void;
}
export interface SourceUnitOfWorkOptions {
  readonly authority: InternalAuthority;
  readonly hooks?: TransactionHooks;
}
export interface CommittedOperation<T> {
  readonly kind: 'COMMITTED';
  readonly projectId: ProjectId;
  readonly revision: Revision;
  readonly operationId: EnabledOperation;
  readonly affectedTaskIds: readonly TaskId[];
  readonly changedFields: readonly string[];
  readonly value: T;
}
export interface MemberRoleChangeValue {
  readonly memberId: MemberId;
  readonly role: ProjectRole;
  readonly updatedAt: string;
}
export type InternalMutationValue =
  | MemberRoleChangeValue
  | Readonly<{ taskId: TaskId; name: string }>
  | Readonly<{ dependencyId: DependencyId; removed: boolean }>
  | Readonly<{ inserted: readonly DependencyId[]; removed: readonly DependencyId[] }>;
export interface TransactionDiagnostic {
  readonly operationId: string;
  readonly projectId: string;
  readonly outcome: 'COMMITTED' | 'ROLLED_BACK' | 'UNKNOWN';
  readonly message: string;
}
/** Internal outcome only: no public response enum, API mapping or production recovery service. */
export class UnknownTransactionOutcomeError extends Error {
  readonly code = 'UNKNOWN_TRANSACTION_OUTCOME';
  readonly outcome = 'UNKNOWN';
  constructor(message: string, readonly diagnostic: Readonly<TransactionDiagnostic>, options?: ErrorOptions) {
    super(message, options);
    this.name = 'UnknownTransactionOutcomeError';
  }
}
