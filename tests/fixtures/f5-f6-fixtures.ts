import {
  asMemberId,
  asProjectId,
  asRevision,
  asTaskId,
  asUserId,
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

export const DEMO_REVISION = asRevision(12);
export const PROJECT_ID = asProjectId('P9');
export const VIEWER_MEMBER_ID = asMemberId('M1');
export const OTHER_MEMBER_ID = asMemberId('M2');
export const VIEWER_USER_ID = asUserId('U1');
export const OTHER_USER_ID = asUserId('U2');
export const AS_OF_DATE = '2026-10-25';
export const PROJECT_TIME_ZONE = 'Asia/Shanghai';

const timestamp = '2026-10-30T00:00:00Z';

export const demoPolicy: RuntimePolicy = {
  f3Enabled: true,
  f4Enabled: true,
  f6Enabled: true,
  datePolicy: 'EXPLICIT_CANDIDATE_FIXTURE',
};

export function makeTask(
  taskId: string,
  name: string,
  status: TaskStatus,
  options: {
    assigneeId?: string | null;
    taskDeadline?: string | null;
    durationDays?: string | null;
  } = {},
): TaskSnapshot {
  return {
    taskId: asTaskId(taskId),
    projectId: PROJECT_ID,
    name,
    description: null,
    assigneeId: options.assigneeId === null ? null : asMemberId(options.assigneeId ?? 'M1'),
    durationDays: options.durationDays ?? '2',
    taskDeadline: options.taskDeadline === undefined ? null : options.taskDeadline,
    status,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function baseTasks(): TaskSnapshot[] {
  return [
    makeTask('A', 'Requirements analysis', 'COMPLETED', {
      taskDeadline: '2026-10-22',
      durationDays: '2',
    }),
    makeTask('B', 'Frontend development', 'COMPLETED', {
      taskDeadline: '2026-10-24',
      durationDays: '3',
    }),
    makeTask('C', 'Backend development', 'IN_PROGRESS', {
      taskDeadline: '2026-10-22',
      durationDays: '6',
    }),
    makeTask('D', 'Testing', 'NOT_STARTED', {
      taskDeadline: '2026-10-29',
      durationDays: '2',
    }),
  ];
}

export const baseEdges: DependencyEdge[] = [
  { prerequisiteId: asTaskId('A'), dependentId: asTaskId('B') },
  { prerequisiteId: asTaskId('A'), dependentId: asTaskId('C') },
  { prerequisiteId: asTaskId('B'), dependentId: asTaskId('D') },
  { prerequisiteId: asTaskId('C'), dependentId: asTaskId('D') },
];

export function makeMembers(): MemberView[] {
  return [
    {
      memberId: VIEWER_MEMBER_ID,
      projectId: PROJECT_ID,
      userId: VIEWER_USER_ID,
      role: 'LEADER',
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      leftAt: null,
      displayName: 'Demo Leader',
    },
    {
      memberId: OTHER_MEMBER_ID,
      projectId: PROJECT_ID,
      userId: OTHER_USER_ID,
      role: 'MEMBER',
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      leftAt: null,
      displayName: 'Demo Member',
    },
  ];
}

export function makeSnapshot(
  options: {
    tasks?: TaskSnapshot[];
    members?: MemberView[];
    revision?: number;
    projectDeadline?: string | null;
    plannedStartDate?: string | null;
    name?: string;
  } = {},
): ProjectSnapshot {
  const tasks = options.tasks ?? baseTasks();
  const links: DependencyView[] = baseEdges.map((edge, index) => ({
    dependencyId: `L${index + 1}` as DependencyView['dependencyId'],
    projectId: PROJECT_ID,
    prerequisiteId: edge.prerequisiteId,
    dependentId: edge.dependentId,
  }));
  return {
    projectId: PROJECT_ID,
    name: options.name ?? 'Demo capstone project',
    description: null,
    plannedStartDate:
      options.plannedStartDate === undefined ? '2026-10-20' : options.plannedStartDate,
    projectDeadline: options.projectDeadline === undefined ? '2026-10-29' : options.projectDeadline,
    members: options.members ?? makeMembers(),
    tasks,
    dependencySource: {
      availability: 'VALID',
      links,
    },
    revision: asRevision(options.revision ?? DEMO_REVISION),
  };
}

export function makeDependencies(
  options: {
    availability?: DependencyResultView['availability'];
    edges?: DependencyEdge[] | null;
    sourceRevision?: number;
    reasonCode?: DependencyResultView['reasonCode'];
  } = {},
): DependencyResultView {
  const result: DependencyResultView = {
    availability: options.availability ?? 'VALID',
    sourceRevision: asRevision(options.sourceRevision ?? DEMO_REVISION),
    edges: options.edges === undefined ? baseEdges : options.edges,
  };
  if (options.reasonCode) result.reasonCode = options.reasonCode;
  return result;
}

export function makeSchedule(
  options: {
    availability?: ScheduleResultView['availability'];
    sourceRevision?: number;
    criticalTaskIds?: string[] | null;
    estimatedProjectFinish?: string | null;
    durationDays?: string | null;
    reasonCode?: ScheduleResultView['reasonCode'];
    finishReasonCode?: ScheduleResultView['finishReasonCode'];
  } = {},
): ScheduleResultView {
  const availability = options.availability ?? 'VALID';
  const result: ScheduleResultView = {
    availability,
    sourceRevision: asRevision(options.sourceRevision ?? DEMO_REVISION),
    durationDays: options.durationDays === undefined ? '10' : options.durationDays,
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
      options.criticalTaskIds === undefined
        ? availability === 'VALID'
          ? [asTaskId('A'), asTaskId('C'), asTaskId('D')]
          : null
        : options.criticalTaskIds === null
          ? null
          : options.criticalTaskIds.map((id) => asTaskId(id)),
    estimatedProjectFinish:
      options.estimatedProjectFinish === undefined
        ? availability === 'VALID'
          ? '2026-10-30'
          : null
        : options.estimatedProjectFinish,
    diagnostics: null,
  };
  if (options.reasonCode) result.reasonCode = options.reasonCode;
  if (options.finishReasonCode) result.finishReasonCode = options.finishReasonCode;
  return result;
}

export function makePolicy(overrides: Partial<RuntimePolicy> = {}): RuntimePolicy {
  return { ...demoPolicy, ...overrides };
}
