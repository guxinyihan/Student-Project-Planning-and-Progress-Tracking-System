import { asRevision, asTaskId } from '@group9/shared';
import type {
  DependencyEdge,
  DependencyResultView,
  DependencyView,
  ProjectId,
  ProjectSnapshot,
  TaskId,
  TaskSnapshot,
} from '@group9/shared';

/** Internal diagnostics for an already-authorized caller, never an HTTP error envelope. */
export type GraphValidationCode =
  | 'INVALID_INPUT'
  | 'INVALID_TASK_ID'
  | 'DUPLICATE_TASK_ID'
  | 'INVALID_EDGE'
  | 'MISSING_ENDPOINT'
  | 'CROSS_PROJECT_REFERENCE'
  | 'SELF_DEPENDENCY'
  | 'DUPLICATE_DEPENDENCY'
  | 'CYCLE';

export interface GraphValidationSuccess {
  readonly valid: true;
  readonly topologicalOrder: readonly TaskId[];
  readonly roots: readonly TaskId[];
  readonly sinks: readonly TaskId[];
}

export interface GraphValidationFailure {
  readonly valid: false;
  readonly code: GraphValidationCode;
  readonly message: string;
  readonly taskIds?: readonly TaskId[];
  readonly cyclePath?: readonly TaskId[];
}

export type GraphValidationResult = GraphValidationSuccess | GraphValidationFailure;
export type ProjectGraphTask = Readonly<Pick<TaskSnapshot, 'taskId' | 'projectId'>>;
export type ScopedDependencyEdge = Readonly<
  DependencyEdge & Partial<Pick<DependencyView, 'projectId'>>
>;

const ordinal = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);
const validId = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function failure(
  code: GraphValidationCode,
  message: string,
  taskIds?: readonly TaskId[],
): GraphValidationFailure {
  return Object.freeze({
    valid: false,
    code,
    message,
    ...(taskIds === undefined ? {} : { taskIds: Object.freeze([...taskIds]) }),
  });
}

/** A local heap gives deterministic ordinal-smallest ready-node selection. */
class ReadyNodes {
  private readonly values: TaskId[] = [];

  push(value: TaskId): void {
    let index = this.values.length;
    this.values.push(value);
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      const previous = this.values[parent];
      if (previous === undefined || ordinal(previous, value) <= 0) break;
      this.values[index] = previous;
      index = parent;
    }
    this.values[index] = value;
  }

  pop(): TaskId | undefined {
    const first = this.values[0];
    const last = this.values.pop();
    if (first === undefined || last === undefined || this.values.length === 0) return first;
    let index = 0;
    while (true) {
      let child = index * 2 + 1;
      let candidate = this.values[child];
      if (candidate === undefined) break;
      const right = this.values[child + 1];
      if (right !== undefined && ordinal(right, candidate) < 0) {
        child++;
        candidate = right;
      }
      if (ordinal(last, candidate) <= 0) break;
      this.values[index] = candidate;
      index = child;
    }
    this.values[index] = last;
    return first;
  }
}

/** Iterative DFS avoids native-stack limits, even for a long indirect cycle. */
function findCycle(
  taskIds: readonly TaskId[],
  successors: ReadonlyMap<TaskId, readonly TaskId[]>,
): readonly TaskId[] {
  const color = new Map<TaskId, 1 | 2>();
  const position = new Map<TaskId, number>();
  for (const root of taskIds) {
    if (color.has(root)) continue;
    const stack: { taskId: TaskId; next: number }[] = [{ taskId: root, next: 0 }];
    color.set(root, 1);
    position.set(root, 0);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      if (frame === undefined) break;
      const target = (successors.get(frame.taskId) ?? [])[frame.next];
      if (target === undefined) {
        color.set(frame.taskId, 2);
        position.delete(frame.taskId);
        stack.pop();
        continue;
      }
      frame.next++;
      if (color.get(target) === 1) {
        const start = position.get(target);
        if (start !== undefined)
          return Object.freeze([...stack.slice(start).map((item) => item.taskId), target]);
      } else if (!color.has(target)) {
        position.set(target, stack.length);
        color.set(target, 1);
        stack.push({ taskId: target, next: 0 });
      }
    }
  }
  return Object.freeze([]);
}

function validate(
  taskIds: readonly TaskId[],
  edges: readonly DependencyEdge[],
): GraphValidationResult {
  if (!Array.isArray(taskIds) || !Array.isArray(edges))
    return failure('INVALID_INPUT', 'Provide complete task and candidate-edge arrays.');
  const unique = new Set<TaskId>();
  for (const taskId of taskIds) {
    if (!validId(taskId))
      return failure('INVALID_TASK_ID', 'Task IDs must be nonempty opaque strings.');
    const canonicalId = asTaskId(taskId);
    if (unique.has(canonicalId))
      return failure('DUPLICATE_TASK_ID', 'Task IDs must be unique.', [canonicalId]);
    unique.add(canonicalId);
  }
  const sortedIds = [...unique].sort(ordinal);
  const successors = new Map<TaskId, TaskId[]>();
  const incoming = new Map<TaskId, number>();
  const pairs = new Map<TaskId, Set<TaskId>>();
  for (const taskId of sortedIds) {
    successors.set(taskId, []);
    incoming.set(taskId, 0);
    pairs.set(taskId, new Set());
  }
  for (const edge of edges) {
    if (!isRecord(edge) || !validId(edge.prerequisiteId) || !validId(edge.dependentId))
      return failure(
        'INVALID_EDGE',
        'Each candidate edge needs canonical prerequisiteId/dependentId.',
      );
    const prerequisiteId = asTaskId(edge.prerequisiteId);
    const dependentId = asTaskId(edge.dependentId);
    if (!unique.has(prerequisiteId) || !unique.has(dependentId))
      return failure(
        'MISSING_ENDPOINT',
        'Every endpoint must belong to the complete task collection.',
        [prerequisiteId, dependentId],
      );
    if (prerequisiteId === dependentId)
      return failure('SELF_DEPENDENCY', 'A task cannot depend on itself.', [prerequisiteId]);
    const targets = pairs.get(prerequisiteId);
    if (targets?.has(dependentId))
      return failure('DUPLICATE_DEPENDENCY', 'A directed dependency pair must be unique.', [
        prerequisiteId,
        dependentId,
      ]);
    targets?.add(dependentId);
    successors.get(prerequisiteId)?.push(dependentId);
    incoming.set(dependentId, (incoming.get(dependentId) ?? 0) + 1);
  }
  for (const next of successors.values()) next.sort(ordinal);
  const roots = sortedIds.filter((taskId) => incoming.get(taskId) === 0);
  const sinks = sortedIds.filter((taskId) => successors.get(taskId)?.length === 0);
  const ready = new ReadyNodes();
  for (const taskId of roots) ready.push(taskId);
  const topologicalOrder: TaskId[] = [];
  for (let taskId = ready.pop(); taskId !== undefined; taskId = ready.pop()) {
    topologicalOrder.push(taskId);
    for (const dependentId of successors.get(taskId) ?? []) {
      const degree = (incoming.get(dependentId) ?? 0) - 1;
      incoming.set(dependentId, degree);
      if (degree === 0) ready.push(dependentId);
    }
  }
  if (topologicalOrder.length !== sortedIds.length)
    return Object.freeze({
      valid: false,
      code: 'CYCLE',
      message: 'The complete candidate graph contains a directed cycle.',
      cyclePath: findCycle(sortedIds, successors),
    });
  return Object.freeze({
    valid: true,
    topologicalOrder: Object.freeze(topologicalOrder),
    roots: Object.freeze(roots),
    sinks: Object.freeze(sinks),
  });
}

/**
 * Validate the complete supplied vertex set, never inferred from edges.
 * Ordinal sorting/min-heap selection make results independent of input permutation.
 * Traversal O(V+E), plus sorting and heap work; memory O(V+E). No database or I/O.
 */
export function validateCandidateGraph(
  taskIds: readonly TaskId[],
  edges: readonly DependencyEdge[],
): GraphValidationResult {
  try {
    return validate(taskIds, edges);
  } catch {
    return failure('INVALID_INPUT', 'Graph input must be readable plain data.');
  }
}

/** Project metadata is checked wherever supplied; absent edge metadata is not invented. */
export function validateProjectGraph(
  projectId: ProjectId,
  tasks: readonly ProjectGraphTask[],
  edges: readonly ScopedDependencyEdge[],
): GraphValidationResult {
  try {
    if (!validId(projectId) || !Array.isArray(tasks) || !Array.isArray(edges))
      return failure('INVALID_INPUT', 'Provide project scope and complete task/edge arrays.');
    for (const task of tasks) {
      if (!isRecord(task) || !validId(task.projectId))
        return failure('INVALID_INPUT', 'Every scoped task needs projectId metadata.');
      if (task.projectId !== projectId)
        return failure(
          'CROSS_PROJECT_REFERENCE',
          'Every task must belong to the supplied project.',
        );
    }
    for (const edge of edges) {
      if (!isRecord(edge)) return failure('INVALID_EDGE', 'Each edge must be a plain record.');
      if ('projectId' in edge && edge.projectId !== projectId)
        return failure('CROSS_PROJECT_REFERENCE', 'Edge metadata must match the supplied project.');
    }
    return validate(
      tasks.map((task) => task.taskId),
      edges,
    );
  } catch {
    return failure('INVALID_INPUT', 'Graph input must be readable plain data.');
  }
}

/**
 * Pure projection after an authorized coherent read. This does not authenticate.
 * Detailed validation diagnostics are deliberately not copied into the public view.
 */
export function getDependencyView(
  snapshot: Readonly<ProjectSnapshot>,
  enabled: boolean,
): DependencyResultView {
  const sourceRevision = asRevision(snapshot?.revision);
  if (!enabled)
    return {
      availability: 'NOT_ENABLED',
      sourceRevision,
      edges: null,
      reasonCode: 'FEATURE_NOT_ENABLED',
    };
  const unavailable = (
    reasonCode: 'INVALID_INPUT' | 'DEPENDENCY_INPUT_UNAVAILABLE' | 'STALE_RESULT',
  ): DependencyResultView => ({
    availability: 'UNAVAILABLE',
    sourceRevision,
    edges: null,
    reasonCode,
  });
  if (!validId(snapshot.projectId) || !Array.isArray(snapshot.tasks))
    return unavailable('INVALID_INPUT');
  if (snapshot.tasks.length === 0) {
    if (
      Array.isArray(snapshot.dependencySource?.links) &&
      snapshot.dependencySource.links.length > 0
    )
      return unavailable('INVALID_INPUT');
    return { availability: 'NO_TASKS', sourceRevision, edges: [] };
  }
  const source = snapshot.dependencySource;
  if (
    !isRecord(source) ||
    source.availability === 'NOT_ENABLED' ||
    source.availability === 'UNAVAILABLE'
  )
    return unavailable(
      source?.reasonCode === 'STALE_RESULT' ? 'STALE_RESULT' : 'DEPENDENCY_INPUT_UNAVAILABLE',
    );
  if (source.availability !== 'VALID' || !Array.isArray(source.links))
    return unavailable('INVALID_INPUT');
  const linkIds = new Set<string>();
  for (const link of source.links) {
    if (
      !isRecord(link) ||
      !validId(link.dependencyId) ||
      linkIds.has(link.dependencyId) ||
      !validId(link.projectId) ||
      link.projectId !== snapshot.projectId
    )
      return unavailable('INVALID_INPUT');
    linkIds.add(link.dependencyId);
  }
  const result = validateProjectGraph(snapshot.projectId, snapshot.tasks, source.links);
  if (!result.valid) return unavailable('INVALID_INPUT');
  const edges = source.links
    .map(({ prerequisiteId, dependentId }) => ({ prerequisiteId, dependentId }))
    .sort(
      (a, b) =>
        ordinal(a.prerequisiteId, b.prerequisiteId) || ordinal(a.dependentId, b.dependentId),
    );
  return { availability: 'VALID', sourceRevision, edges };
}
