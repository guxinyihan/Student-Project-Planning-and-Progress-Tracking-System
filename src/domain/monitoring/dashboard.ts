import type {
  DependencyResultView,
  DependencyUnavailableReason,
  DashboardInput,
  DashboardResult,
  Failure,
  ProjectSnapshot,
  Revision,
  RuntimePolicy,
  ScheduleResultView,
  ScheduleUnavailableReason,
  UserId,
} from '@group9/shared';
import { calculateProgress } from './progress.js';
import { identifyBlockedTasks } from './blocked.js';
import { detectOverdueTasks, type DateEvaluationOptions } from './overdue.js';
import { getAssignedTasks, MonitoringAccessError } from './assigned.js';
import { composeWarnings } from './warnings.js';
import { assertCoherentSnapshot } from './common.js';

export type DashboardBuildOptions = DateEvaluationOptions;

function failure(code: string, message: string): Failure {
  return { ok: false, error: { code, message } };
}

function inaccessible(): Failure {
  return failure('INVALID_OR_INACCESSIBLE_PROJECT', 'Invalid or inaccessible project.');
}

function unavailableDependency(
  reasonCode: DependencyUnavailableReason,
  revision: Revision,
): DependencyResultView {
  return {
    availability: 'UNAVAILABLE',
    sourceRevision: revision,
    edges: null,
    reasonCode,
  };
}

function normalizedDependencyView(
  dependencies: DependencyResultView,
  revision: Revision,
  policy: RuntimePolicy,
): DependencyResultView {
  if (!policy.f3Enabled) {
    return {
      availability: 'NOT_ENABLED',
      sourceRevision: revision,
      edges: null,
      reasonCode: 'FEATURE_NOT_ENABLED',
    };
  }
  if (dependencies.sourceRevision !== revision) {
    return unavailableDependency('STALE_RESULT', revision);
  }
  if (dependencies.availability === 'NOT_ENABLED') {
    return {
      availability: 'NOT_ENABLED',
      sourceRevision: revision,
      edges: null,
      reasonCode: 'FEATURE_NOT_ENABLED',
    };
  }
  if (dependencies.availability === 'UNAVAILABLE') {
    return unavailableDependency(
      dependencies.reasonCode === 'FEATURE_NOT_ENABLED'
        ? 'DEPENDENCY_INPUT_UNAVAILABLE'
        : (dependencies.reasonCode ?? 'DEPENDENCY_INPUT_UNAVAILABLE'),
      revision,
    );
  }
  if (dependencies.edges === null) {
    return unavailableDependency('DEPENDENCY_INPUT_UNAVAILABLE', revision);
  }
  return dependencies;
}

function scheduleWithNulls(
  availability: 'NO_TASKS' | 'NOT_ENABLED' | 'UNAVAILABLE',
  revision: Revision,
  options: {
    reasonCode?: ScheduleUnavailableReason | 'FEATURE_NOT_ENABLED';
    diagnostics?: ScheduleResultView['diagnostics'];
  } = {},
): ScheduleResultView {
  const result: ScheduleResultView = {
    availability,
    sourceRevision: revision,
    durationDays: null,
    timings: null,
    criticalTaskIds: null,
    estimatedProjectFinish: null,
    diagnostics: options.diagnostics ?? null,
  };
  if (options.reasonCode) result.reasonCode = options.reasonCode;
  return result;
}

function normalizedScheduleView(
  schedule: ScheduleResultView,
  dependencies: DependencyResultView,
  tasksCount: number,
  revision: Revision,
  policy: RuntimePolicy,
): ScheduleResultView {
  if (!policy.f4Enabled) {
    return scheduleWithNulls('NOT_ENABLED', revision, { reasonCode: 'FEATURE_NOT_ENABLED' });
  }
  if (tasksCount > 0 && !policy.f3Enabled) {
    return scheduleWithNulls('UNAVAILABLE', revision, {
      reasonCode: 'DEPENDENCY_INPUT_UNAVAILABLE',
    });
  }
  if (schedule.sourceRevision !== revision) {
    return scheduleWithNulls('UNAVAILABLE', revision, { reasonCode: 'STALE_RESULT' });
  }

  if (schedule.availability === 'VALID') {
    if (tasksCount === 0) {
      return scheduleWithNulls('NO_TASKS', revision);
    }
    if (dependencies.availability !== 'VALID' || dependencies.edges === null) {
      return scheduleWithNulls('UNAVAILABLE', revision, {
        reasonCode: 'DEPENDENCY_INPUT_UNAVAILABLE',
      });
    }
    if (
      schedule.durationDays === null ||
      schedule.timings === null ||
      schedule.criticalTaskIds === null
    ) {
      return scheduleWithNulls('UNAVAILABLE', revision, { reasonCode: 'CALCULATION_FAILED' });
    }
    return schedule;
  }

  if (schedule.availability === 'NO_TASKS') {
    if (tasksCount > 0) {
      return scheduleWithNulls('UNAVAILABLE', revision, { reasonCode: 'CALCULATION_FAILED' });
    }
    return scheduleWithNulls('NO_TASKS', revision);
  }

  if (schedule.availability === 'NOT_ENABLED') {
    return scheduleWithNulls('NOT_ENABLED', revision, { reasonCode: 'FEATURE_NOT_ENABLED' });
  }

  return scheduleWithNulls('UNAVAILABLE', revision, {
    reasonCode: schedule.reasonCode ?? 'CALCULATION_FAILED',
    ...(schedule.diagnostics ? { diagnostics: schedule.diagnostics } : {}),
  });
}

function assertAuthorizedActor(snapshot: ProjectSnapshot, actorId: UserId, viewerId: string): void {
  const membership = snapshot.members.find(
    (member) =>
      member.projectId === snapshot.projectId &&
      member.memberId === viewerId &&
      member.active &&
      member.leftAt === null &&
      member.userId === actorId,
  );
  if (!membership) throw new MonitoringAccessError();
}

function collectNotices(
  snapshot: ProjectSnapshot,
  dependencies: DependencyResultView,
  schedule: ScheduleResultView,
  overdue: ReturnType<typeof detectOverdueTasks>,
  warnings: ReturnType<typeof composeWarnings>,
  policy: RuntimePolicy,
): { capability: string; message: string }[] {
  const notices: { capability: string; message: string }[] = [];
  const add = (capability: string, message: string) => {
    if (!notices.some((notice) => notice.capability === capability)) {
      notices.push({ capability, message });
    }
  };

  if (snapshot.tasks.length === 0) {
    add('tasks', 'No tasks yet. Completion is undefined, not 0%.');
  }
  if (dependencies.availability === 'NOT_ENABLED') {
    add('dependencies', 'Dependency tracking is not enabled; Blocked is unknown, not zero.');
  } else if (
    dependencies.availability === 'UNAVAILABLE' ||
    (dependencies.availability === 'NO_TASKS' && snapshot.tasks.length > 0)
  ) {
    add('dependencies', 'Dependency facts are unavailable; Blocked is unknown, not zero.');
  }
  if (schedule.availability === 'NOT_ENABLED') {
    add(
      'schedule',
      'Schedule analysis is not enabled; criticality and project finish are unknown.',
    );
  } else if (schedule.availability === 'UNAVAILABLE') {
    add(
      'schedule',
      'Schedule analysis is unavailable; criticality and project finish are unknown.',
    );
  }
  if (overdue.notEvaluatedTaskIds.length > 0) {
    add(
      'dates',
      `${overdue.notEvaluatedTaskIds.length} task date comparison(s) were not evaluated; missing dates are not proof of on-time work.`,
    );
  }
  if (!policy.f6Enabled) {
    add('warnings', 'Risk warnings (FR-15, Could Have) are not enabled.');
  } else if (
    warnings.evaluationByType &&
    Object.values(warnings.evaluationByType).some(
      (entry) => entry.availability === 'UNAVAILABLE' || entry.availability === 'NOT_ENABLED',
    )
  ) {
    add(
      'warnings',
      'One or more warning categories are unknown; an empty warning list is not a no-risk result.',
    );
  }
  return notices;
}

/**
 * MON-M0. Pure dashboard composition: no authentication, database read,
 * graph validation, CPM, clock lookup or source write happens here.
 */
export function buildDashboard(
  input: DashboardInput,
  policy: RuntimePolicy,
  options: DashboardBuildOptions = { projectTimeZone: null },
): DashboardResult {
  try {
    const snapshot = input.context.snapshot;
    assertAuthorizedActor(snapshot, input.context.actorId, input.context.viewerMemberId);
    assertCoherentSnapshot(snapshot);

    const revision = snapshot.revision;
    const dependencies = normalizedDependencyView(input.dependencies, revision, policy);

    // An untrusted dependency view cannot certify a current schedule.
    let schedule = normalizedScheduleView(
      input.schedule,
      dependencies,
      snapshot.tasks.length,
      revision,
      policy,
    );
    if (
      snapshot.tasks.length > 0 &&
      dependencies.availability !== 'VALID' &&
      schedule.availability === 'VALID'
    ) {
      schedule = scheduleWithNulls('UNAVAILABLE', revision, {
        reasonCode: 'DEPENDENCY_INPUT_UNAVAILABLE',
      });
    }

    const progress = calculateProgress(snapshot.tasks, revision);
    const blockedResult = identifyBlockedTasks(snapshot.tasks, dependencies, revision);
    const assignedTasks = getAssignedTasks(
      snapshot,
      input.context.viewerMemberId,
      blockedResult,
      schedule,
    );
    const overdueResult = detectOverdueTasks(
      snapshot.tasks,
      input.context.asOfDate,
      revision,
      policy,
      options,
    );
    const warnings = composeWarnings(
      snapshot,
      schedule,
      blockedResult,
      overdueResult,
      policy,
      options,
    );

    return {
      ok: true,
      summary: {
        projectId: snapshot.projectId,
        name: snapshot.name,
        revision,
        asOfDate: input.context.asOfDate,
        progress: progress.progress,
        rawStatusCounts: progress.rawStatusCounts,
        blockedResult,
        assignedTasks,
        overdueResult,
        schedule,
        warnings,
        notices: collectNotices(snapshot, dependencies, schedule, overdueResult, warnings, policy),
      },
    };
  } catch (error) {
    if (error instanceof MonitoringAccessError) return inaccessible();
    return failure(
      'SOURCE_UNAVAILABLE',
      'The project source could not be read consistently. Try again.',
    );
  }
}
