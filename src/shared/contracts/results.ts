// Implemented from ROUND3 Revision 1; no business routes or approval implied.
import type {
  DecimalString,
  DependencyId,
  LocalDate,
  MemberId,
  ProjectId,
  Revision,
  TaskId,
  TaskStatus,
} from './identifiers.js';
import type {
  DatedReadContext,
  DependencyEdge,
  DependencyView,
  ProjectView,
  TaskSnapshot,
} from './source.js';
import type { Failure } from './errors.js';

export interface SavedChange {
  projectId: ProjectId;
  revision: Revision;
  changeKind: string;
  affectedTaskIds: TaskId[];
  changedFields: string[];
}

export interface MutationResult<T> {
  ok: true;
  projectId: ProjectId;
  revision: Revision;
  value: T;
  savedChange: SavedChange;
}

export interface ProjectReadResult<T> {
  ok: true;
  projectId: ProjectId;
  revision: Revision;
  value: T;
}

export interface DashboardInput {
  context: DatedReadContext;
  dependencies: DependencyResultView;
  schedule: ScheduleResultView;
}

export interface ProjectListResult {
  ok: true;
  items: ProjectView[];
}

export interface MemberDepartureValue {
  memberId: MemberId;
  active: false;
  unassignedTaskIds: TaskId[];
}

export interface TaskDeletionValue {
  taskId: TaskId;
  deleted: true;
}

export interface DependencyRemovalValue {
  dependencyId: DependencyId;
  removed: true;
}

export interface DependencyListValue {
  dependencyView: DependencyResultView;
  links: readonly DependencyView[] | null;
}

export interface DependencyValidationValue {
  valid: true;
  sourceRevision: Revision;
}

export interface ProgressSummaryValue {
  progress: ProgressResult;
  rawStatusCounts: Record<TaskStatus, number>;
}

export interface DependencySourceSnapshot {
  availability: Availability;
  links: readonly DependencyView[] | null;
  reasonCode?: DependencyUnavailableReason | 'FEATURE_NOT_ENABLED';
}

export interface DependencyResultView {
  availability: Availability;
  sourceRevision: Revision;
  edges: DependencyEdge[] | null;
  reasonCode?: DependencyUnavailableReason | 'FEATURE_NOT_ENABLED';
}

export interface TaskTiming {
  taskId: TaskId;
  ES: DecimalString;
  EF: DecimalString;
  LS: DecimalString;
  LF: DecimalString;
  totalFloat: DecimalString;
}

export interface DurationInputDiagnostic {
  taskId: TaskId;
  field: 'durationDays';
  issue: 'MISSING' | 'NON_NUMERIC' | 'NON_FINITE' | 'NON_POSITIVE';
  message: string;
}

export interface ScheduleResultView {
  availability: Availability;
  sourceRevision: Revision;
  reasonCode?: ScheduleUnavailableReason | 'FEATURE_NOT_ENABLED';
  durationDays: DecimalString | null;
  timings: TaskTiming[] | null;
  criticalTaskIds: TaskId[] | null;
  estimatedProjectFinish: LocalDate | null;
  finishReasonCode?: 'MISSING_PLANNED_START' | 'DATE_MAPPING_UNRESOLVED';
  diagnostics: DurationInputDiagnostic[] | null;
}

export interface ProgressResult {
  availability: 'VALID' | 'NO_TASKS';
  sourceRevision: Revision;
  totalTasks: number;
  completedTasks: number;
  percentage: number | null;
}

export interface IncompletePrerequisiteView {
  taskId: TaskId;
  name: string;
  rawStatus: TaskStatus;
}

export interface BlockedResult {
  availability: Availability;
  sourceRevision: Revision;
  blockedTaskIds: TaskId[] | null;
  byTaskId: Record<TaskId, { incompletePrerequisites: IncompletePrerequisiteView[] }> | null;
  reasonCode?: DependencyUnavailableReason | 'FEATURE_NOT_ENABLED';
}

export interface TaskDisplayView {
  task: TaskSnapshot;
  rawStatus: TaskStatus;
  isBlocked: boolean | null;
  incompletePrerequisites: IncompletePrerequisiteView[] | null;
  isCritical: boolean | null;
}

export interface AssignedTasksResult {
  availability: 'VALID' | 'NO_TASKS';
  sourceRevision: Revision;
  items: TaskDisplayView[];
}

export interface OverdueResult {
  availability: 'VALID' | 'NO_TASKS';
  sourceRevision: Revision;
  asOfDate: LocalDate;
  overdueTaskIds: TaskId[];
  notEvaluatedTaskIds: TaskId[];
  items: { taskId: TaskId; daysOverdue: number }[];
  reasons: { taskId: TaskId; message: string }[];
}

export interface WarningItem {
  type: WarningType;
  taskId: TaskId | null;
  message: string;
  prerequisiteIds: TaskId[] | null;
  daysOverdue: number | null;
}

export interface WarningEvaluation {
  availability: Availability;
  reasonCode?: ScheduleUnavailableReason | 'FEATURE_NOT_ENABLED';
  explanation?: string; // missing dates/unconfirmed D-04, not a rival top-level error code
}

export interface ScheduleWarningResult {
  availability: Availability;
  sourceRevision: Revision;
  items: WarningItem[] | null;
  evaluationByType: Record<WarningType, WarningEvaluation> | null;
  reasonCode?: 'FEATURE_NOT_ENABLED';
}

export interface DashboardSummary {
  projectId: ProjectId;
  name: string;
  revision: Revision;
  asOfDate: LocalDate;
  progress: ProgressResult;
  rawStatusCounts: Record<TaskStatus, number>;
  blockedResult: BlockedResult;
  assignedTasks: AssignedTasksResult;
  overdueResult: OverdueResult;
  schedule: ScheduleResultView;
  warnings: ScheduleWarningResult;
  notices: { capability: string; message: string }[];
}

export interface CriticalPathsResult {
  availability: Availability;
  sourceRevision: Revision;
  paths: TaskId[][] | null;
  complete: boolean;
  nextCursor: string | null;
  reasonCode?: ScheduleUnavailableReason | 'FEATURE_NOT_ENABLED';
}

export type Availability = 'VALID' | 'NO_TASKS' | 'NOT_ENABLED' | 'UNAVAILABLE';

export type DependencyUnavailableReason =
  'DEPENDENCY_INPUT_UNAVAILABLE' | 'INVALID_INPUT' | 'STALE_RESULT';

export type ScheduleUnavailableReason = DependencyUnavailableReason | 'CALCULATION_FAILED';

export type WarningType = 'OVERDUE_TASK' | 'BLOCKED_CRITICAL_TASK' | 'PROJECT_DEADLINE_CONFLICT';

export type DashboardResult = { ok: true; summary: DashboardSummary } | Failure;
