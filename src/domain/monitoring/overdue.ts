import type {
  LocalDate,
  OverdueResult,
  Revision,
  RuntimePolicy,
  TaskSnapshot,
} from '@group9/shared';
import { isLocalDate, isSupportedProjectTimeZone } from '@group9/shared';
import { assertCoherentTasks, calendarDaysBetween, pluralDays } from './common.js';

/**
 * Local, non-public evaluation context for the isolated pure functions.
 * The canonical shared ProjectSnapshot has no public timezone field yet, so
 * callers must pass an explicit zone instead of the host/browser default.
 */
export interface DateEvaluationOptions {
  projectTimeZone: string | null;
}

export function hasUsableProjectDateContext(
  policy: RuntimePolicy,
  options: DateEvaluationOptions,
): boolean {
  return (
    (policy.datePolicy === 'EXPLICIT_CANDIDATE_FIXTURE' || policy.datePolicy === 'AGREED_POLICY') &&
    isSupportedProjectTimeZone(options.projectTimeZone)
  );
}

/**
 * F5 MON-M5. Basic overdue facts are independent of F4 and F6.
 * Missing/invalid dates or an unresolved project date context are explicitly
 * NOT EVALUATED, never converted into an on-time assertion.
 */
export function detectOverdueTasks(
  tasks: readonly TaskSnapshot[],
  asOfDate: LocalDate,
  sourceRevision: Revision,
  policy: RuntimePolicy,
  options: DateEvaluationOptions = { projectTimeZone: null },
): OverdueResult {
  assertCoherentTasks(tasks);
  if (tasks.length === 0) {
    return {
      availability: 'NO_TASKS',
      sourceRevision,
      asOfDate,
      overdueTaskIds: [],
      notEvaluatedTaskIds: [],
      items: [],
      reasons: [],
    };
  }

  const asOfValid = isLocalDate(asOfDate);
  const zoneReady = hasUsableProjectDateContext(policy, options);
  const items: OverdueResult['items'] = [];
  const notEvaluatedTaskIds: OverdueResult['notEvaluatedTaskIds'] = [];
  const reasons: OverdueResult['reasons'] = [];

  for (const task of tasks) {
    if (task.status === 'COMPLETED') continue;

    if (task.taskDeadline === null) {
      notEvaluatedTaskIds.push(task.taskId);
      reasons.push({
        taskId: task.taskId,
        message: 'Task deadline is missing; overdue comparison was not evaluated.',
      });
      continue;
    }

    if (!isLocalDate(task.taskDeadline)) {
      notEvaluatedTaskIds.push(task.taskId);
      reasons.push({
        taskId: task.taskId,
        message: 'Task deadline is not a valid LocalDate; overdue comparison was not evaluated.',
      });
      continue;
    }

    if (!asOfValid) {
      notEvaluatedTaskIds.push(task.taskId);
      reasons.push({
        taskId: task.taskId,
        message: 'asOfDate is not a valid LocalDate; overdue comparison was not evaluated.',
      });
      continue;
    }

    if (!zoneReady) {
      notEvaluatedTaskIds.push(task.taskId);
      reasons.push({
        taskId: task.taskId,
        message:
          'Project timezone or explicit date policy is unavailable; overdue comparison was not evaluated.',
      });
      continue;
    }

    const daysOverdue = calendarDaysBetween(task.taskDeadline, asOfDate);
    if (daysOverdue === null) {
      notEvaluatedTaskIds.push(task.taskId);
      reasons.push({
        taskId: task.taskId,
        message: 'Calendar-day comparison could not be evaluated for this task.',
      });
      continue;
    }

    if (daysOverdue > 0) {
      items.push({ taskId: task.taskId, daysOverdue });
      reasons.push({
        taskId: task.taskId,
        message: `Task is overdue by ${pluralDays(daysOverdue)}.`,
      });
    }
  }

  return {
    availability: 'VALID',
    sourceRevision,
    asOfDate,
    overdueTaskIds: items.map((item) => item.taskId),
    notEvaluatedTaskIds,
    items,
    reasons,
  };
}
