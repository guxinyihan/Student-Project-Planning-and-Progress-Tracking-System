import {
  asDependencyId,
  asProjectId,
  asTaskId,
  type DependencyView,
  type TaskId,
} from '@group9/shared';
import { SourceTransactionError } from '../application/unit-of-work.js';

export interface TaskNameDelta {
  readonly taskId: TaskId;
  readonly beforeName: string;
  readonly afterName: string;
}

export interface SemanticDelta {
  readonly taskNames: readonly TaskNameDelta[];
  readonly inserted: readonly DependencyView[];
  readonly removed: readonly DependencyView[];
}

const ordinal = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

function invalidState(): SourceTransactionError {
  return new SourceTransactionError('INVALID_INPUT', 'Invalid semantic source-state snapshot.');
}

function edgeIndex(edges: readonly DependencyView[]): ReadonlyMap<string, DependencyView> {
  if (!Array.isArray(edges)) throw invalidState();
  const index = new Map<string, DependencyView>();
  for (const edge of edges) {
    if (edge === null || typeof edge !== 'object') throw invalidState();
    const dependencyId = asDependencyId(edge.dependencyId);
    if (index.has(dependencyId)) throw invalidState();
    index.set(
      dependencyId,
      Object.freeze({
        dependencyId,
        projectId: asProjectId(edge.projectId),
        prerequisiteId: asTaskId(edge.prerequisiteId),
        dependentId: asTaskId(edge.dependentId),
      }),
    );
  }
  return index;
}

function sameEdge(left: DependencyView | undefined, right: DependencyView | undefined): boolean {
  return (
    left !== undefined &&
    right !== undefined &&
    left.dependencyId === right.dependencyId &&
    left.projectId === right.projectId &&
    left.prerequisiteId === right.prerequisiteId &&
    left.dependentId === right.dependentId
  );
}

/** Compare final business source, never timestamps or a history of intermediate writes. */
export function detectSemanticDelta(
  beforeNames: ReadonlyMap<string, string>,
  afterNames: ReadonlyMap<string, string>,
  beforeEdges: readonly DependencyView[],
  afterEdges: readonly DependencyView[],
): SemanticDelta {
  try {
    if (beforeNames.size !== afterNames.size) throw invalidState();
    const taskNames: TaskNameDelta[] = [];
    for (const taskId of [...beforeNames.keys()].sort(ordinal)) {
      const beforeName = beforeNames.get(taskId);
      const afterName = afterNames.get(taskId);
      if (
        !afterNames.has(taskId) ||
        typeof beforeName !== 'string' ||
        typeof afterName !== 'string'
      )
        throw invalidState();
      const id = asTaskId(taskId);
      if (beforeName !== afterName)
        taskNames.push(Object.freeze({ taskId: id, beforeName, afterName }));
    }
    const before = edgeIndex(beforeEdges);
    const after = edgeIndex(afterEdges);
    const inserted = [...after.values()]
      .sort((left, right) => ordinal(left.dependencyId, right.dependencyId))
      .filter((edge) => !sameEdge(before.get(edge.dependencyId), edge));
    const removed = [...before.values()]
      .sort((left, right) => ordinal(left.dependencyId, right.dependencyId))
      .filter((edge) => !sameEdge(edge, after.get(edge.dependencyId)));
    return Object.freeze({
      taskNames: Object.freeze(taskNames),
      inserted: Object.freeze(inserted),
      removed: Object.freeze(removed),
    });
  } catch (error) {
    if (error instanceof SourceTransactionError) throw error;
    throw invalidState();
  }
}

export function hasSemanticChanges(delta: SemanticDelta): boolean {
  return delta.taskNames.length > 0 || delta.inserted.length > 0 || delta.removed.length > 0;
}
