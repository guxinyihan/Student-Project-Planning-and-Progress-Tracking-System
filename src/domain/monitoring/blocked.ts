import type {
  BlockedResult,
  DependencyResultView,
  IncompletePrerequisiteView,
  Revision,
  TaskId,
  TaskSnapshot,
} from '@group9/shared';
import { assertCoherentTasks, taskIndex } from './common.js';

function unavailable(
  availability: 'NOT_ENABLED' | 'UNAVAILABLE',
  sourceRevision: Revision,
  reasonCode: DependencyResultView['reasonCode'],
): BlockedResult {
  const result: BlockedResult = {
    availability,
    sourceRevision,
    blockedTaskIds: null,
    byTaskId: null,
  };
  if (reasonCode) result.reasonCode = reasonCode;
  return result;
}

/**
 * F5 MON-M3. Derives Blocked from incomplete DIRECT prerequisites.
 * This function never writes, never mutates tasks, and never stores a fourth status.
 */
export function identifyBlockedTasks(
  tasks: readonly TaskSnapshot[],
  dependencies: DependencyResultView,
  sourceRevision: Revision,
): BlockedResult {
  assertCoherentTasks(tasks);
  if (dependencies.sourceRevision !== sourceRevision) {
    return unavailable('UNAVAILABLE', sourceRevision, 'STALE_RESULT');
  }

  if (dependencies.availability === 'NOT_ENABLED') {
    return unavailable('NOT_ENABLED', sourceRevision, 'FEATURE_NOT_ENABLED');
  }
  if (dependencies.availability === 'UNAVAILABLE') {
    return unavailable(
      'UNAVAILABLE',
      sourceRevision,
      dependencies.reasonCode ?? 'DEPENDENCY_INPUT_UNAVAILABLE',
    );
  }

  if (dependencies.availability === 'NO_TASKS') {
    if (tasks.length > 0) {
      return unavailable('UNAVAILABLE', sourceRevision, 'DEPENDENCY_INPUT_UNAVAILABLE');
    }
    return {
      availability: 'NO_TASKS',
      sourceRevision,
      blockedTaskIds: [],
      byTaskId: {},
    };
  }

  if (dependencies.edges === null) {
    return unavailable('UNAVAILABLE', sourceRevision, 'DEPENDENCY_INPUT_UNAVAILABLE');
  }
  if (tasks.length === 0) {
    return {
      availability: 'NO_TASKS',
      sourceRevision,
      blockedTaskIds: [],
      byTaskId: {},
    };
  }

  const byId = taskIndex(tasks);
  const prerequisitesByTask = new Map<TaskId, TaskId[]>();
  for (const edge of dependencies.edges) {
    if (!byId.has(edge.prerequisiteId) || !byId.has(edge.dependentId)) {
      // A validated same-version view should never contain dangling references.
      return unavailable('UNAVAILABLE', sourceRevision, 'DEPENDENCY_INPUT_UNAVAILABLE');
    }
    const list = prerequisitesByTask.get(edge.dependentId) ?? [];
    if (!list.includes(edge.prerequisiteId)) list.push(edge.prerequisiteId);
    prerequisitesByTask.set(edge.dependentId, list);
  }

  const blockedTaskIds: TaskId[] = [];
  const byTaskId = Object.create(null) as NonNullable<BlockedResult['byTaskId']>;

  for (const task of tasks) {
    // Completed dependents are never unfinished Blocked work.
    if (task.status === 'COMPLETED') continue;

    const incomplete: IncompletePrerequisiteView[] = [];
    for (const prerequisiteId of prerequisitesByTask.get(task.taskId) ?? []) {
      const prerequisite = byId.get(prerequisiteId);
      if (!prerequisite || prerequisite.status === 'COMPLETED') continue;
      incomplete.push({
        taskId: prerequisite.taskId,
        name: prerequisite.name,
        rawStatus: prerequisite.status,
      });
    }

    if (incomplete.length > 0) {
      blockedTaskIds.push(task.taskId);
      byTaskId[task.taskId] = { incompletePrerequisites: incomplete };
    }
  }

  return {
    availability: 'VALID',
    sourceRevision,
    blockedTaskIds,
    byTaskId,
  };
}
