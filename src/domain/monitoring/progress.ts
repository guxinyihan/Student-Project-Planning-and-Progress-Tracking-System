import type { ProgressSummaryValue, Revision, TaskSnapshot, TaskStatus } from '@group9/shared';
import { assertCoherentTasks } from './common.js';

export const TASK_STATUSES: readonly TaskStatus[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
] as const;

/**
 * F5 MON-M1/M2. Counts are derived from saved task status only.
 * Blocked is an overlay and is never an input to this formula.
 */
export function calculateProgress(
  tasks: readonly TaskSnapshot[],
  sourceRevision: Revision,
): ProgressSummaryValue {
  assertCoherentTasks(tasks);
  const rawStatusCounts: Record<TaskStatus, number> = {
    NOT_STARTED: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
  };
  for (const task of tasks) rawStatusCounts[task.status] += 1;

  const totalTasks = tasks.length;
  const completedTasks = rawStatusCounts.COMPLETED;
  return {
    progress: {
      availability: totalTasks === 0 ? 'NO_TASKS' : 'VALID',
      sourceRevision,
      totalTasks,
      completedTasks,
      percentage: totalTasks === 0 ? null : (completedTasks / totalTasks) * 100,
    },
    rawStatusCounts,
  };
}
