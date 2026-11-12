import type {
  BlockedResult,
  OverdueResult,
  ProjectSnapshot,
  RuntimePolicy,
  ScheduleResultView,
  ScheduleWarningResult,
  TaskId,
  WarningEvaluation,
  WarningItem,
  WarningType,
} from '@group9/shared';
import { assertCoherentSnapshot, calendarDaysBetween, pluralDays, taskIndex } from './common.js';
import { hasUsableProjectDateContext, type DateEvaluationOptions } from './overdue.js';

const WARNING_TYPES: readonly WarningType[] = [
  'PROJECT_DEADLINE_CONFLICT',
  'BLOCKED_CRITICAL_TASK',
  'OVERDUE_TASK',
] as const;

function evaluation(
  availability: WarningEvaluation['availability'],
  detail?: {
    reasonCode?: WarningEvaluation['reasonCode'] | undefined;
    explanation?: string | undefined;
  },
): WarningEvaluation {
  const value: WarningEvaluation = { availability };
  if (detail?.reasonCode) value.reasonCode = detail.reasonCode;
  if (detail?.explanation) value.explanation = detail.explanation;
  return value;
}

function unavailable(
  reasonCode?: WarningEvaluation['reasonCode'],
  explanation?: string,
): WarningEvaluation {
  return evaluation('UNAVAILABLE', { reasonCode, explanation });
}

function warningOrder(a: WarningItem, b: WarningItem): number {
  return WARNING_TYPES.indexOf(a.type) - WARNING_TYPES.indexOf(b.type);
}

function scheduleReason(schedule: ScheduleResultView): WarningEvaluation['reasonCode'] | undefined {
  return schedule.reasonCode;
}

/**
 * F6 warning composition. FR-15 is Could Have and every type has its own
 * evaluation status. Unknown is never represented as an empty known result.
 */
export function composeWarnings(
  snapshot: ProjectSnapshot,
  schedule: ScheduleResultView,
  blocked: BlockedResult,
  overdue: OverdueResult,
  policy: RuntimePolicy,
  options: DateEvaluationOptions = { projectTimeZone: null },
): ScheduleWarningResult {
  assertCoherentSnapshot(snapshot);
  if (!policy.f6Enabled) {
    return {
      availability: 'NOT_ENABLED',
      sourceRevision: snapshot.revision,
      items: null,
      evaluationByType: null,
      reasonCode: 'FEATURE_NOT_ENABLED',
    };
  }

  if (snapshot.tasks.length === 0) {
    const noTasks = evaluation('NO_TASKS');
    return {
      availability: 'NO_TASKS',
      sourceRevision: snapshot.revision,
      items: [],
      evaluationByType: {
        OVERDUE_TASK: noTasks,
        BLOCKED_CRITICAL_TASK: noTasks,
        PROJECT_DEADLINE_CONFLICT: noTasks,
      },
    };
  }

  const taskById = taskIndex(snapshot.tasks);
  const items: WarningItem[] = [];
  const dateContextReady = hasUsableProjectDateContext(policy, options);
  const revision = snapshot.revision;

  // ---- PROJECT_DEADLINE_CONFLICT -----------------------------------------
  let projectEvaluation: WarningEvaluation;
  if (!policy.f3Enabled || !policy.f4Enabled) {
    projectEvaluation = unavailable(
      'FEATURE_NOT_ENABLED',
      'Dependency tracking and schedule analysis must both be enabled; project finish is unknown.',
    );
  } else if (schedule.sourceRevision !== revision) {
    projectEvaluation = unavailable('STALE_RESULT', 'Schedule result is not current.');
  } else if (schedule.availability !== 'VALID') {
    projectEvaluation = unavailable(
      scheduleReason(schedule) ?? 'FEATURE_NOT_ENABLED',
      'The schedule result is unavailable; no project-finish comparison was made.',
    );
  } else if (!schedule.estimatedProjectFinish || !snapshot.projectDeadline) {
    projectEvaluation = unavailable(
      undefined,
      'Estimated project finish or project deadline is missing; comparison was not evaluated.',
    );
  } else if (!dateContextReady) {
    projectEvaluation = unavailable(
      undefined,
      'Project timezone/date policy is unavailable; project-finish comparison was not evaluated.',
    );
  } else {
    const daysLate = calendarDaysBetween(snapshot.projectDeadline, schedule.estimatedProjectFinish);
    if (daysLate === null) {
      projectEvaluation = unavailable(
        undefined,
        'Project-finish dates could not be compared; comparison was not evaluated.',
      );
    } else if (daysLate > 0) {
      projectEvaluation = evaluation('VALID');
      items.push({
        type: 'PROJECT_DEADLINE_CONFLICT',
        taskId: null,
        message: `Estimated project finish ${schedule.estimatedProjectFinish} is ${pluralDays(daysLate)} after the project deadline ${snapshot.projectDeadline}.`,
        prerequisiteIds: null,
        daysOverdue: null,
      });
    } else {
      projectEvaluation = evaluation('VALID');
    }
  }

  // ---- BLOCKED_CRITICAL_TASK --------------------------------------------
  let blockedEvaluation: WarningEvaluation;
  if (!policy.f3Enabled || !policy.f4Enabled) {
    blockedEvaluation = unavailable(
      'FEATURE_NOT_ENABLED',
      'Dependency tracking and schedule analysis must both be enabled; blocked criticality is unknown.',
    );
  } else if (blocked.sourceRevision !== revision) {
    blockedEvaluation = unavailable('STALE_RESULT', 'Blocked facts are not current.');
  } else if (blocked.availability !== 'VALID') {
    blockedEvaluation = unavailable(
      blocked.reasonCode ?? 'FEATURE_NOT_ENABLED',
      'Blocked facts are unavailable; blocked critical-task evaluation was not performed.',
    );
  } else if (
    blocked.blockedTaskIds === null ||
    blocked.byTaskId === null ||
    blocked.blockedTaskIds.some((taskId) => !Object.hasOwn(blocked.byTaskId!, taskId))
  ) {
    blockedEvaluation = unavailable(
      'DEPENDENCY_INPUT_UNAVAILABLE',
      'Blocked facts are incomplete; evaluation was not performed.',
    );
  } else if (schedule.sourceRevision !== revision) {
    blockedEvaluation = unavailable('STALE_RESULT', 'Critical-task facts are not current.');
  } else if (schedule.availability !== 'VALID' || schedule.criticalTaskIds === null) {
    blockedEvaluation = unavailable(
      scheduleReason(schedule) ?? 'FEATURE_NOT_ENABLED',
      'Critical-task facts are unavailable; blocked critical-task evaluation was not performed.',
    );
  } else {
    blockedEvaluation = evaluation('VALID');
    const critical = new Set<TaskId>(schedule.criticalTaskIds);
    for (const taskId of blocked.blockedTaskIds) {
      if (!critical.has(taskId)) continue;
      const task = taskById.get(taskId);
      const prerequisites = blocked.byTaskId[taskId]?.incompletePrerequisites ?? [];
      const names = prerequisites.map((prerequisite) => {
        return `${prerequisite.name} (${prerequisite.rawStatus})`;
      });
      items.push({
        type: 'BLOCKED_CRITICAL_TASK',
        taskId,
        message: `${task?.name ?? taskId} is a critical activity and is blocked by ${names.join(', ')}.`,
        prerequisiteIds: prerequisites.map((prerequisite) => prerequisite.taskId),
        daysOverdue: null,
      });
    }
  }

  // ---- OVERDUE_TASK ------------------------------------------------------
  let overdueEvaluation: WarningEvaluation;
  if (!dateContextReady) {
    overdueEvaluation = unavailable(
      undefined,
      'Project timezone/date policy is unavailable; overdue warning evaluation was not performed.',
    );
  } else if (overdue.sourceRevision !== revision) {
    overdueEvaluation = unavailable('STALE_RESULT', 'Overdue facts are not current.');
  } else if (overdue.availability !== 'VALID') {
    overdueEvaluation = unavailable(
      undefined,
      'Overdue facts are unavailable; overdue warning evaluation was not performed.',
    );
  } else {
    const unfinishedTasks = snapshot.tasks.filter((task) => task.status !== 'COMPLETED');
    const notEvaluatedIds = new Set(overdue.notEvaluatedTaskIds);
    const notEvaluatedCount = unfinishedTasks.filter((task) => notEvaluatedIds.has(task.taskId)).length;
    const incompleteEvaluation =
      `Overdue status could not be evaluated for ${notEvaluatedCount} of ${unfinishedTasks.length} unfinished tasks.`;

    if (overdue.overdueTaskIds.length === 0 && notEvaluatedCount > 0) {
      overdueEvaluation = unavailable(
        undefined,
        notEvaluatedCount === unfinishedTasks.length
          ? 'No candidate task date comparison could be evaluated; overdue risk remains unknown.'
          : `${incompleteEvaluation} Overdue risk remains unknown for those tasks.`,
      );
    } else {
      overdueEvaluation = evaluation(
        'VALID',
        notEvaluatedCount > 0
          ? { explanation: `${incompleteEvaluation} Confirmed overdue tasks are still shown.` }
          : undefined,
      );
      for (const overdueItem of overdue.items) {
        const task = taskById.get(overdueItem.taskId);
        if (!task) continue;
        items.push({
          type: 'OVERDUE_TASK',
          taskId: overdueItem.taskId,
          message: `${task.name} is unfinished and ${pluralDays(overdueItem.daysOverdue)} overdue${task.taskDeadline ? ` (due ${task.taskDeadline})` : ''}.`,
          prerequisiteIds: null,
          daysOverdue: overdueItem.daysOverdue,
        });
      }
    }
  }

  items.sort(warningOrder);

  return {
    availability: 'VALID',
    sourceRevision: revision,
    items,
    evaluationByType: {
      OVERDUE_TASK: overdueEvaluation,
      BLOCKED_CRITICAL_TASK: blockedEvaluation,
      PROJECT_DEADLINE_CONFLICT: projectEvaluation,
    },
  };
}
