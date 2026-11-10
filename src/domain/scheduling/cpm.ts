import {
  addExact,
  asRevision,
  ceilExact,
  compareExact,
  formatExactDecimal,
  isLocalDate,
  isSupportedProjectTimeZone,
  parseExactDecimal,
  subtractExact,
  type CriticalPathsResult,
  type DependencyEdge,
  type DependencyResultView,
  type DurationInputDiagnostic,
  type ExactDecimal,
  type LocalDate,
  type ProjectSnapshot,
  type Revision,
  type RuntimePolicy,
  type ScheduleResultView,
  type TaskId,
  type TaskTiming,
} from '@group9/shared';
import { validateProjectGraph } from './graph.js';

/** Isolated calculation input, not a new REST or shared source DTO. */
export interface IsolatedCalculationContext {
  readonly projectTimeZone?: string;
  readonly dateMappingConfirmed?: boolean;
}

const ZERO: ExactDecimal = Object.freeze({ coefficient: 0n, scale: 0 });
const ascending = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function emptyResult(
  revision: Revision,
  availability: 'NO_TASKS' | 'NOT_ENABLED' | 'UNAVAILABLE',
  reasonCode?: ScheduleResultView['reasonCode'],
  diagnostics: DurationInputDiagnostic[] | null = null,
): ScheduleResultView {
  return {
    availability,
    sourceRevision: revision,
    durationDays: null,
    timings: null,
    criticalTaskIds: null,
    estimatedProjectFinish: null,
    diagnostics,
    ...(reasonCode === undefined ? {} : { reasonCode }),
  };
}

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Incomplete internal scheduling state.');
  return value;
}

function invalidDuration(
  taskId: TaskId,
  value: unknown,
): { value: ExactDecimal } | { diagnostic: DurationInputDiagnostic } {
  let issue: DurationInputDiagnostic['issue'];
  let message: string;
  if (value === null || value === undefined) {
    issue = 'MISSING';
    message = 'A complete schedule needs a duration for every task.';
  } else if (typeof value === 'number' && !Number.isFinite(value)) {
    issue = 'NON_FINITE';
    message = 'Duration must be finite canonical decimal text.';
  } else if (
    (typeof value === 'number' && value <= 0) ||
    (typeof value === 'string' && /^-(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(value))
  ) {
    issue = 'NON_POSITIVE';
    message = 'Duration must be strictly positive.';
  } else {
    try {
      const parsed = parseExactDecimal(value);
      if (parsed.coefficient > 0n) return { value: parsed };
      issue = 'NON_POSITIVE';
      message = 'Duration must be strictly positive.';
    } catch {
      issue = 'NON_NUMERIC';
      message = 'Duration must be canonical decimal text within the selected input limits.';
    }
  }
  return { diagnostic: { taskId, field: 'durationDays', issue, message } };
}

/** UTC here is only a Gregorian date-arithmetic coordinate, never a selected project zone. */
function mapFinish(
  snapshot: Readonly<ProjectSnapshot>,
  total: ExactDecimal,
  policy: RuntimePolicy,
  context?: Readonly<IsolatedCalculationContext>,
): Pick<ScheduleResultView, 'estimatedProjectFinish' | 'finishReasonCode'> {
  if (snapshot.plannedStartDate === null)
    return { estimatedProjectFinish: null, finishReasonCode: 'MISSING_PLANNED_START' };
  const unknown: Pick<ScheduleResultView, 'estimatedProjectFinish' | 'finishReasonCode'> = {
    estimatedProjectFinish: null,
    finishReasonCode: 'DATE_MAPPING_UNRESOLVED',
  };
  if (
    policy.datePolicy === 'UNRESOLVED' ||
    context?.dateMappingConfirmed !== true ||
    !isLocalDate(snapshot.plannedStartDate) ||
    !isSupportedProjectTimeZone(context.projectTimeZone)
  )
    return unknown;
  const days = ceilExact(total);
  // A supported LocalDate is four-digit Gregorian; larger exact totals remain valid relative plans.
  if (days < 0n || days > 3_652_058n) return unknown;
  const start = new Date(0);
  start.setUTCFullYear(
    Number(snapshot.plannedStartDate.slice(0, 4)),
    Number(snapshot.plannedStartDate.slice(5, 7)) - 1,
    Number(snapshot.plannedStartDate.slice(8, 10)),
  );
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() + Number(days));
  const year = start.getUTCFullYear();
  if (!Number.isFinite(start.getTime()) || year < 1 || year > 9999) return unknown;
  const finish: LocalDate = `${String(year).padStart(4, '0')}-${String(start.getUTCMonth() + 1).padStart(2, '0')}-${String(start.getUTCDate()).padStart(2, '0')}`;
  return { estimatedProjectFinish: finish };
}

/** Pure F4 calculation. Authentication and coherent source acquisition precede this call. */
export function calculateSchedule(
  snapshot: Readonly<ProjectSnapshot>,
  dependencies: DependencyResultView | null | undefined,
  policy: RuntimePolicy,
  context?: Readonly<IsolatedCalculationContext>,
): ScheduleResultView {
  const revision = asRevision(snapshot.revision);
  if (!policy.f4Enabled) return emptyResult(revision, 'NOT_ENABLED', 'FEATURE_NOT_ENABLED');
  if (snapshot.tasks.length === 0) return emptyResult(revision, 'NO_TASKS');
  if (
    !policy.f3Enabled ||
    !dependencies ||
    dependencies.availability !== 'VALID' ||
    dependencies.sourceRevision !== revision ||
    !Array.isArray(dependencies.edges)
  )
    return emptyResult(revision, 'UNAVAILABLE', 'DEPENDENCY_INPUT_UNAVAILABLE');
  const graph = validateProjectGraph(snapshot.projectId, snapshot.tasks, dependencies.edges);
  if (!graph.valid) return emptyResult(revision, 'UNAVAILABLE', 'DEPENDENCY_INPUT_UNAVAILABLE');
  const durations = new Map<TaskId, ExactDecimal>();
  const diagnostics: DurationInputDiagnostic[] = [];
  for (const task of [...snapshot.tasks].sort((a, b) => ascending(a.taskId, b.taskId))) {
    const parsed = invalidDuration(task.taskId, task.durationDays);
    if ('diagnostic' in parsed) diagnostics.push(parsed.diagnostic);
    else durations.set(task.taskId, parsed.value);
  }
  if (diagnostics.length > 0)
    return emptyResult(revision, 'UNAVAILABLE', 'INVALID_INPUT', diagnostics);
  try {
    const predecessors = new Map<TaskId, TaskId[]>();
    const successors = new Map<TaskId, TaskId[]>();
    for (const taskId of graph.topologicalOrder) {
      predecessors.set(taskId, []);
      successors.set(taskId, []);
    }
    for (const edge of dependencies.edges) {
      required(predecessors.get(edge.dependentId)).push(edge.prerequisiteId);
      required(successors.get(edge.prerequisiteId)).push(edge.dependentId);
    }
    const earlyStart = new Map<TaskId, ExactDecimal>();
    const earlyFinish = new Map<TaskId, ExactDecimal>();
    let total = ZERO;
    for (const taskId of graph.topologicalOrder) {
      let start = ZERO;
      for (const predecessor of required(predecessors.get(taskId))) {
        const finish = required(earlyFinish.get(predecessor));
        if (compareExact(finish, start) > 0) start = finish;
      }
      const finish = addExact(start, required(durations.get(taskId)));
      earlyStart.set(taskId, start);
      earlyFinish.set(taskId, finish);
      if (required(successors.get(taskId)).length === 0 && compareExact(finish, total) > 0)
        total = finish;
    }
    const lateStart = new Map<TaskId, ExactDecimal>();
    const lateFinish = new Map<TaskId, ExactDecimal>();
    for (const taskId of [...graph.topologicalOrder].reverse()) {
      const next = required(successors.get(taskId));
      let finish = total;
      for (const successor of next) {
        const start = required(lateStart.get(successor));
        if (compareExact(start, finish) < 0) finish = start;
      }
      lateFinish.set(taskId, finish);
      lateStart.set(taskId, subtractExact(finish, required(durations.get(taskId))));
    }
    const timings: TaskTiming[] = [];
    const criticalTaskIds: TaskId[] = [];
    for (const taskId of [...graph.topologicalOrder].sort(ascending)) {
      const ES = required(earlyStart.get(taskId));
      const EF = required(earlyFinish.get(taskId));
      const LS = required(lateStart.get(taskId));
      const LF = required(lateFinish.get(taskId));
      const float = subtractExact(LS, ES);
      if (compareExact(float, ZERO) < 0 || compareExact(float, subtractExact(LF, EF)) !== 0)
        throw new Error('CPM float invariants failed.');
      if (compareExact(float, ZERO) === 0) criticalTaskIds.push(taskId);
      timings.push({
        taskId,
        ES: formatExactDecimal(ES),
        EF: formatExactDecimal(EF),
        LS: formatExactDecimal(LS),
        LF: formatExactDecimal(LF),
        totalFloat: formatExactDecimal(float),
      });
    }
    return {
      availability: 'VALID',
      sourceRevision: revision,
      durationDays: formatExactDecimal(total),
      timings,
      criticalTaskIds,
      diagnostics: null,
      ...mapFinish(snapshot, total, policy, context),
    };
  } catch {
    return emptyResult(revision, 'UNAVAILABLE', 'CALCULATION_FAILED');
  }
}

export function identifyCriticalActivities(
  result: ScheduleResultView,
  revision: Revision,
): readonly TaskId[] | null {
  if (result.sourceRevision !== revision || result.availability !== 'VALID') return null;
  return result.criticalTaskIds === null ? null : [...result.criticalTaskIds];
}

interface CriticalSubgraph {
  readonly edges: DependencyEdge[];
  readonly roots: TaskId[];
  readonly terminals: ReadonlySet<TaskId>;
  readonly successors: ReadonlyMap<TaskId, readonly TaskId[]>;
  readonly fingerprint: string;
}

function criticalSubgraph(
  snapshot: Readonly<ProjectSnapshot>,
  dependencies: DependencyResultView,
  current: ScheduleResultView,
): CriticalSubgraph | null {
  if (current.availability !== 'VALID' || current.sourceRevision !== snapshot.revision) return null;
  const graph = validateProjectGraph(snapshot.projectId, snapshot.tasks, dependencies.edges ?? []);
  if (
    !graph.valid ||
    dependencies.availability !== 'VALID' ||
    dependencies.sourceRevision !== snapshot.revision ||
    dependencies.edges === null
  )
    return null;
  // Certify supplied timings using the same exact engine, rather than accepting forged/stale facts.
  const certified = calculateSchedule(snapshot, dependencies, {
    f3Enabled: true,
    f4Enabled: true,
    f6Enabled: false,
    datePolicy: 'UNRESOLVED',
  });
  if (
    certified.availability !== 'VALID' ||
    JSON.stringify(certified.timings) !== JSON.stringify(current.timings) ||
    JSON.stringify(certified.criticalTaskIds) !== JSON.stringify(current.criticalTaskIds) ||
    certified.durationDays !== current.durationDays
  )
    return null;
  const critical = new Set(certified.criticalTaskIds ?? []);
  const timings = new Map((certified.timings ?? []).map((timing) => [timing.taskId, timing]));
  const edges = dependencies.edges
    .filter(
      (edge) =>
        critical.has(edge.prerequisiteId) &&
        critical.has(edge.dependentId) &&
        required(timings.get(edge.prerequisiteId)).EF ===
          required(timings.get(edge.dependentId)).ES,
    )
    .map(({ prerequisiteId, dependentId }) => ({ prerequisiteId, dependentId }))
    .sort(
      (a, b) =>
        ascending(a.prerequisiteId, b.prerequisiteId) || ascending(a.dependentId, b.dependentId),
    );
  const successors = new Map<TaskId, TaskId[]>();
  for (const taskId of critical) successors.set(taskId, []);
  for (const edge of edges) required(successors.get(edge.prerequisiteId)).push(edge.dependentId);
  const roots = graph.roots.filter((id) => critical.has(id));
  const terminals = new Set(
    graph.sinks.filter(
      (id) => critical.has(id) && required(timings.get(id)).EF === certified.durationDays,
    ),
  );
  // Lossless context binding, not an authentication token or a probabilistic hash.
  const fingerprint = JSON.stringify({
    source: [...snapshot.tasks]
      .sort((a, b) => ascending(a.taskId, b.taskId))
      .map(({ taskId, projectId, durationDays }) => [taskId, projectId, durationDays]),
    edges,
    timings: certified.timings,
  });
  return { edges, roots, terminals, successors, fingerprint };
}

/** Complete certified critical subgraph; this does not enumerate exponentially many paths. */
export function identifyCriticalEdges(
  snapshot: Readonly<ProjectSnapshot>,
  dependencies: DependencyResultView,
  current: ScheduleResultView,
): readonly DependencyEdge[] | null {
  return criticalSubgraph(snapshot, dependencies, current)?.edges ?? null;
}

function* pathsIn(subgraph: CriticalSubgraph): Generator<TaskId[]> {
  for (const root of subgraph.roots) {
    const path: TaskId[] = [root];
    const stack: { taskId: TaskId; next: number }[] = [{ taskId: root, next: 0 }];
    while (stack.length > 0) {
      const frame = required(stack.at(-1));
      if (subgraph.terminals.has(frame.taskId)) {
        yield [...path];
        stack.pop();
        path.pop();
      } else {
        const next = subgraph.successors.get(frame.taskId)?.[frame.next];
        frame.next++;
        if (next === undefined) {
          stack.pop();
          path.pop();
        } else {
          stack.push({ taskId: next, next: 0 });
          path.push(next);
        }
      }
    }
  }
}

/** Lazy deterministic path paging. Each page rescans skipped paths; no hidden count cap. */
export function enumerateCriticalPaths(
  snapshot: Readonly<ProjectSnapshot>,
  dependencies: DependencyResultView,
  current: ScheduleResultView,
  page: { limit: number; cursor?: string },
): CriticalPathsResult {
  const fail = (reasonCode: CriticalPathsResult['reasonCode']): CriticalPathsResult => ({
    availability: 'UNAVAILABLE',
    sourceRevision: snapshot.revision,
    paths: null,
    complete: false,
    nextCursor: null,
    ...(reasonCode === undefined ? {} : { reasonCode }),
  });
  if (current.sourceRevision !== snapshot.revision) return fail('STALE_RESULT');
  if (current.availability === 'NO_TASKS' && snapshot.tasks.length !== 0)
    return fail('INVALID_INPUT');
  if (current.availability !== 'VALID')
    return {
      availability: current.availability,
      sourceRevision: snapshot.revision,
      paths: null,
      complete: current.availability === 'NO_TASKS',
      nextCursor: null,
      ...(current.reasonCode === undefined ? {} : { reasonCode: current.reasonCode }),
    };
  if (!Number.isSafeInteger(page.limit) || page.limit < 1) return fail('INVALID_INPUT');
  const graph = criticalSubgraph(snapshot, dependencies, current);
  if (!graph) return fail('INVALID_INPUT');
  let offset = 0n;
  if (page.cursor !== undefined) {
    try {
      const input: unknown = JSON.parse(decodeURIComponent(page.cursor));
      if (typeof input !== 'object' || input === null) return fail('INVALID_INPUT');
      const candidate = input as Record<string, unknown>;
      if (
        typeof candidate.projectId !== 'string' ||
        candidate.projectId.trim().length === 0 ||
        typeof candidate.revision !== 'number' ||
        !Number.isSafeInteger(candidate.revision) ||
        candidate.revision < 1
      )
        return fail('INVALID_INPUT');
      if (candidate.projectId !== snapshot.projectId || candidate.revision !== snapshot.revision)
        return fail('STALE_RESULT');
      if (
        candidate.version !== 1 ||
        candidate.limit !== page.limit ||
        candidate.fingerprint !== graph.fingerprint ||
        typeof candidate.offset !== 'string' ||
        !/^(?:0|[1-9][0-9]*)$/.test(candidate.offset)
      )
        return fail('INVALID_INPUT');
      offset = BigInt(candidate.offset);
    } catch {
      return fail('INVALID_INPUT');
    }
  }
  const iterator = pathsIn(graph);
  for (let skipped = 0n; skipped < offset; skipped++)
    if (iterator.next().done) return fail('INVALID_INPUT');
  const paths: TaskId[][] = [];
  while (paths.length < page.limit) {
    const next = iterator.next();
    if (next.done)
      return {
        availability: 'VALID',
        sourceRevision: snapshot.revision,
        paths,
        complete: true,
        nextCursor: null,
      };
    paths.push(next.value);
  }
  const complete = iterator.next().done === true;
  const nextCursor = complete
    ? null
    : encodeURIComponent(
        JSON.stringify({
          version: 1,
          projectId: snapshot.projectId,
          revision: snapshot.revision,
          limit: page.limit,
          fingerprint: graph.fingerprint,
          offset: (offset + BigInt(paths.length)).toString(),
        }),
      );
  return { availability: 'VALID', sourceRevision: snapshot.revision, paths, complete, nextCursor };
}
