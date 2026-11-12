import {
  asMemberId,
  asProjectId,
  asRevision,
  asTaskId,
  asUserId,
  type DashboardInput,
  type DashboardResult,
  type DependencyEdge,
  type DependencyResultView,
  type DependencyView,
  type MemberView,
  type ProjectSnapshot,
  type RuntimePolicy,
  type ScheduleResultView,
  type TaskSnapshot,
  type TaskStatus,
} from '@group9/shared';
import { buildDashboard } from '@group9/domain';

export type DemoScenario =
  | 'healthy'
  | 'f3-unavailable'
  | 'f4-unavailable'
  | 'f4-off'
  | 'f6-off'
  | 'no-blockers'
  | 'dates-unknown'
  | 'empty'
  | 'access-denied'
  | 'source-error'
  | 'loading';

export const DEMO_SCENARIOS: readonly { id: DemoScenario; label: string; hint: string }[] = [
  {
    id: 'healthy',
    label: 'Current data',
    hint: 'F3 and F4 valid; three warning categories evaluated',
  },
  { id: 'f3-unavailable', label: 'F3 unavailable', hint: 'Blocked is unknown, not zero' },
  { id: 'f4-unavailable', label: 'F4 unavailable', hint: 'Basic F5 facts remain visible' },
  { id: 'f4-off', label: 'F4 not enabled', hint: 'An old valid schedule must be discarded' },
  { id: 'f6-off', label: 'F6 not enabled', hint: 'FR-15 remains Could Have' },
  { id: 'no-blockers', label: 'Known no blockers', hint: 'Valid empty edge set' },
  { id: 'dates-unknown', label: 'Dates unknown', hint: 'No timezone/date policy passed' },
  { id: 'empty', label: 'Empty project', hint: 'NO_TASKS, percentage null' },
  { id: 'access-denied', label: 'Access denied', hint: 'Safe generic failure' },
  { id: 'source-error', label: 'Source error', hint: 'Unsafe incoherent source' },
  { id: 'loading', label: 'Loading', hint: 'Skeleton state without data' },
];

export const DEMO_AS_OF = '2026-10-25';
export const DEMO_TIME_ZONE = 'Asia/Shanghai';
const REVISION = asRevision(12);
const PROJECT = asProjectId('P9');
const VIEWER_MEMBER = asMemberId('M1');
const VIEWER_USER = asUserId('U1');
const OTHER_MEMBER = asMemberId('M2');
const OTHER_USER = asUserId('U2');
const STAMP = '2026-10-30T00:00:00Z';

const edges: DependencyEdge[] = [
  { prerequisiteId: asTaskId('A'), dependentId: asTaskId('B') },
  { prerequisiteId: asTaskId('A'), dependentId: asTaskId('C') },
  { prerequisiteId: asTaskId('B'), dependentId: asTaskId('D') },
  { prerequisiteId: asTaskId('C'), dependentId: asTaskId('D') },
];

function task(
  id: string,
  name: string,
  status: TaskStatus,
  deadline: string | null,
  durationDays: string,
): TaskSnapshot {
  return {
    taskId: asTaskId(id),
    projectId: PROJECT,
    name,
    description: null,
    assigneeId: VIEWER_MEMBER,
    durationDays,
    taskDeadline: deadline,
    status,
    createdAt: STAMP,
    updatedAt: STAMP,
  };
}

function members(): MemberView[] {
  return [
    {
      memberId: VIEWER_MEMBER,
      projectId: PROJECT,
      userId: VIEWER_USER,
      role: 'LEADER',
      active: true,
      createdAt: STAMP,
      updatedAt: STAMP,
      leftAt: null,
      displayName: 'Zhang Yuyang',
    },
    {
      memberId: OTHER_MEMBER,
      projectId: PROJECT,
      userId: OTHER_USER,
      role: 'MEMBER',
      active: true,
      createdAt: STAMP,
      updatedAt: STAMP,
      leftAt: null,
      displayName: 'Demo teammate',
    },
  ];
}

function baseTasks(): TaskSnapshot[] {
  return [
    task('A', 'Requirements analysis', 'COMPLETED', '2026-10-22', '2'),
    task('B', 'Frontend development', 'COMPLETED', '2026-10-24', '3'),
    task('C', 'Backend development', 'IN_PROGRESS', '2026-10-22', '6'),
    task('D', 'Testing', 'NOT_STARTED', '2026-10-29', '2'),
  ];
}

function snapshot(
  tasks: TaskSnapshot[],
  projectDeadline: string | null = '2026-10-29',
): ProjectSnapshot {
  const links: DependencyView[] = edges.map((edge, index) => ({
    dependencyId: `L${index + 1}` as DependencyView['dependencyId'],
    projectId: PROJECT,
    prerequisiteId: edge.prerequisiteId,
    dependentId: edge.dependentId,
  }));
  return {
    projectId: PROJECT,
    name: 'Campus event planning',
    description: null,
    plannedStartDate: '2026-10-20',
    projectDeadline,
    members: members(),
    tasks,
    dependencySource: { availability: 'VALID', links },
    revision: REVISION,
  };
}

function dependencies(
  availability: DependencyResultView['availability'] = 'VALID',
  dependencyEdges: DependencyEdge[] | null = edges,
): DependencyResultView {
  const result: DependencyResultView = {
    availability,
    sourceRevision: REVISION,
    edges: dependencyEdges,
  };
  if (availability === 'NOT_ENABLED') result.reasonCode = 'FEATURE_NOT_ENABLED';
  return result;
}

function schedule(
  availability: ScheduleResultView['availability'] = 'VALID',
  estimatedProjectFinish: string | null = '2026-10-30',
): ScheduleResultView {
  const result: ScheduleResultView = {
    availability,
    sourceRevision: REVISION,
    durationDays: availability === 'VALID' ? '10' : null,
    timings:
      availability === 'VALID'
        ? [
            { taskId: asTaskId('A'), ES: '0', EF: '2', LS: '0', LF: '2', totalFloat: '0' },
            { taskId: asTaskId('B'), ES: '2', EF: '5', LS: '5', LF: '8', totalFloat: '3' },
            { taskId: asTaskId('C'), ES: '2', EF: '8', LS: '2', LF: '8', totalFloat: '0' },
            { taskId: asTaskId('D'), ES: '8', EF: '10', LS: '8', LF: '10', totalFloat: '0' },
          ]
        : null,
    criticalTaskIds:
      availability === 'VALID' ? [asTaskId('A'), asTaskId('C'), asTaskId('D')] : null,
    estimatedProjectFinish: availability === 'VALID' ? estimatedProjectFinish : null,
    diagnostics: null,
  };
  if (availability === 'UNAVAILABLE') result.reasonCode = 'INVALID_INPUT';
  if (availability === 'NOT_ENABLED') result.reasonCode = 'FEATURE_NOT_ENABLED';
  return result;
}

const policy: RuntimePolicy = {
  f3Enabled: true,
  f4Enabled: true,
  f6Enabled: true,
  datePolicy: 'EXPLICIT_CANDIDATE_FIXTURE',
};

function input(
  options: {
    tasks?: TaskSnapshot[];
    dependencies?: DependencyResultView;
    schedule?: ScheduleResultView;
    viewerMemberId?: MemberView['memberId'];
    actorId?: MemberView['userId'];
    snapshotOverride?: ProjectSnapshot;
  } = {},
): DashboardInput {
  const tasks = options.tasks ?? baseTasks();
  return {
    context: {
      actorId: options.actorId ?? VIEWER_USER,
      viewerMemberId: options.viewerMemberId ?? VIEWER_MEMBER,
      asOfDate: DEMO_AS_OF,
      snapshot: options.snapshotOverride ?? snapshot(tasks),
    },
    dependencies: options.dependencies ?? dependencies(),
    schedule: options.schedule ?? schedule(),
  };
}

export interface DemoResult {
  readonly scenario: DemoScenario;
  readonly result: DashboardResult;
  readonly projectTimeZone: string | null;
  readonly policy: RuntimePolicy;
}

/** Pure fixture entry point for the isolated prototype. No API or auth call. */
export function demoResult(scenario: DemoScenario): DemoResult | null {
  if (scenario === 'loading') return null;

  if (scenario === 'access-denied') {
    return {
      scenario,
      result: buildDashboard(
        input({ viewerMemberId: asMemberId('M404'), actorId: asUserId('U404') }),
        policy,
        { projectTimeZone: DEMO_TIME_ZONE },
      ),
      projectTimeZone: DEMO_TIME_ZONE,
      policy,
    };
  }

  if (scenario === 'source-error') {
    const tasks = [...baseTasks(), { ...baseTasks()[0]!, status: 'COMPLETED' as const }];
    return {
      scenario,
      result: buildDashboard(input({ tasks, snapshotOverride: snapshot(tasks) }), policy, {
        projectTimeZone: DEMO_TIME_ZONE,
      }),
      projectTimeZone: DEMO_TIME_ZONE,
      policy,
    };
  }

  if (scenario === 'empty') {
    const emptyTasks: TaskSnapshot[] = [];
    return {
      scenario,
      result: buildDashboard(
        input({
          tasks: emptyTasks,
          snapshotOverride: snapshot(emptyTasks),
          dependencies: dependencies('NO_TASKS', []),
          schedule: schedule('NO_TASKS'),
        }),
        policy,
        { projectTimeZone: DEMO_TIME_ZONE },
      ),
      projectTimeZone: DEMO_TIME_ZONE,
      policy,
    };
  }

  if (scenario === 'f3-unavailable') {
    return {
      scenario,
      result: buildDashboard(
        input(),
        { ...policy, f3Enabled: false },
        { projectTimeZone: DEMO_TIME_ZONE },
      ),
      projectTimeZone: DEMO_TIME_ZONE,
      policy: { ...policy, f3Enabled: false },
    };
  }

  if (scenario === 'f4-unavailable') {
    return {
      scenario,
      result: buildDashboard(input({ schedule: schedule('UNAVAILABLE') }), policy, {
        projectTimeZone: DEMO_TIME_ZONE,
      }),
      projectTimeZone: DEMO_TIME_ZONE,
      policy,
    };
  }

  if (scenario === 'f4-off') {
    const f4Policy = { ...policy, f4Enabled: false };
    return {
      scenario,
      result: buildDashboard(input(), f4Policy, { projectTimeZone: DEMO_TIME_ZONE }),
      projectTimeZone: DEMO_TIME_ZONE,
      policy: f4Policy,
    };
  }

  if (scenario === 'f6-off') {
    const f6Policy = { ...policy, f6Enabled: false };
    return {
      scenario,
      result: buildDashboard(input(), f6Policy, { projectTimeZone: DEMO_TIME_ZONE }),
      projectTimeZone: DEMO_TIME_ZONE,
      policy: f6Policy,
    };
  }

  if (scenario === 'no-blockers') {
    return {
      scenario,
      result: buildDashboard(input({ dependencies: dependencies('VALID', []) }), policy, {
        projectTimeZone: DEMO_TIME_ZONE,
      }),
      projectTimeZone: DEMO_TIME_ZONE,
      policy,
    };
  }

  if (scenario === 'dates-unknown') {
    return {
      scenario,
      result: buildDashboard(input(), policy, { projectTimeZone: null }),
      projectTimeZone: null,
      policy,
    };
  }

  return {
    scenario,
    result: buildDashboard(input(), policy, { projectTimeZone: DEMO_TIME_ZONE }),
    projectTimeZone: DEMO_TIME_ZONE,
    policy,
  };
}
