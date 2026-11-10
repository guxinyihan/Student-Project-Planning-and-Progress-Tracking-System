import { validateProjectGraph } from '@group9/domain';
import type { DependencyView, ProjectId, TaskSnapshot } from '@group9/shared';
import { SourceTransactionError } from '../application/unit-of-work.js';

/**
 * Coordinator-only finalization of the complete candidate from the same protected W.
 * This pure check neither fetches source nor authenticates: the private coordinator owns
 * the connection, complete fixed-project snapshot and transaction lifetime. Business
 * handlers receive none of those capabilities. It is not a hostile-process sandbox.
 */
export function validateFinalCandidate(
  projectId: ProjectId,
  tasks: readonly Pick<TaskSnapshot, 'taskId' | 'projectId'>[],
  edges: readonly DependencyView[],
): void {
  const result = validateProjectGraph(projectId, tasks, edges);
  if (!result.valid)
    throw new SourceTransactionError(
      'INVALID_INPUT',
      `Complete final dependency graph rejected (${result.code}).`,
    );
  // The general graph API permits absent edge metadata. Persistence candidates are
  // complete source views, so require their identity and project binding explicitly.
  const dependencyIds = new Set<string>();
  for (const edge of edges) {
    if (
      edge.projectId !== projectId ||
      typeof edge.dependencyId !== 'string' ||
      edge.dependencyId.trim().length === 0 ||
      dependencyIds.has(edge.dependencyId)
    )
      throw new SourceTransactionError(
        'INVALID_INPUT',
        'Complete final dependency graph rejected (INVALID_DEPENDENCY_IDENTITY).',
      );
    dependencyIds.add(edge.dependencyId);
  }
}
