// Compiled by tsconfig.check.json; not an executed business fixture or a policy approval.
import {
  asDependencyId,
  asMemberId,
  asProjectId,
  asRevision,
  asTaskId,
  asUserId,
} from '@group9/shared';
import type {
  DashboardInput,
  DependencyResultView,
  DependencySourceSnapshot,
  IncompletePrerequisiteView,
  MemberId,
  MutationResult,
  ProjectReadResult,
  ProjectSnapshot,
  ProjectView,
  TaskSnapshot,
  TaskStatus,
} from '@group9/shared';

type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2 ? true : false;
type Assert<Value extends true> = Value;

// These assertions fail compilation if the canonical unions, field provenance or nullable fields drift.
export type G1CanonicalContractAssertions = [
  Assert<Equal<TaskStatus, 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'>>,
  Assert<Equal<TaskSnapshot['assigneeId'], MemberId | null>>,
  Assert<Equal<TaskSnapshot['durationDays'], string | null>>,
  Assert<Equal<IncompletePrerequisiteView['rawStatus'], TaskStatus>>,
  Assert<Equal<DashboardInput['context']['asOfDate'], string>>,
  Assert<Equal<DependencyResultView['sourceRevision'], number>>,
  Assert<Equal<'projectTimezone' extends keyof ProjectView ? true : false, false>>,
  Assert<Equal<'projectTimezone' extends keyof ProjectSnapshot ? true : false, false>>,
];

export function compileCanonicalContractFixtures(): void {
  const projectId = asProjectId('P-fixture');
  const memberId = asMemberId('M-fixture');
  const userId = asUserId('U-fixture');
  const taskId = asTaskId('T-fixture');
  const revision = asRevision(7);
  const task: TaskSnapshot = {
    taskId,
    projectId,
    name: 'Compile-only fixture',
    description: null,
    assigneeId: memberId,
    durationDays: '0.10',
    taskDeadline: null,
    status: 'NOT_STARTED',
    createdAt: '2026-10-30T00:00:00Z',
    updatedAt: '2026-10-30T00:00:00Z',
  };
  const read: ProjectReadResult<TaskSnapshot> = {
    ok: true,
    projectId,
    revision,
    value: task,
  };
  const mutation: MutationResult<TaskSnapshot> = {
    ok: true,
    projectId,
    revision,
    value: task,
    savedChange: {
      projectId,
      revision,
      changeKind: 'COMPILE_FIXTURE',
      affectedTaskIds: [taskId],
      changedFields: ['name'],
    },
  };
  const knownEmpty: DependencySourceSnapshot = { availability: 'NO_TASKS', links: [] };
  const unavailable: DependencySourceSnapshot = {
    availability: 'UNAVAILABLE',
    links: null,
    reasonCode: 'DEPENDENCY_INPUT_UNAVAILABLE',
  };
  const rawLinks: DependencySourceSnapshot = {
    availability: 'VALID',
    links: [
      {
        dependencyId: asDependencyId('D-fixture'),
        projectId,
        prerequisiteId: taskId,
        dependentId: asTaskId('T-other'),
      },
    ],
  };
  const prerequisite: IncompletePrerequisiteView = { taskId, name: 'A', rawStatus: 'IN_PROGRESS' };

  // @ts-expect-error UserId and project-scoped MemberId must not be interchangeable.
  const mistakenAssignee: MemberId = userId;
  // @ts-expect-error Stored task lifecycle remains exactly three statuses; Blocked is derived.
  const fourthStatus: TaskStatus = 'BLOCKED';
  // @ts-expect-error Every project read has an explicit project revision.
  const missingReadRevision: ProjectReadResult<TaskSnapshot> = { ok: true, projectId, value: task };
  // @ts-expect-error Source mutation success must contain SavedChange.
  const missingSavedChange: MutationResult<TaskSnapshot> = {
    ok: true,
    projectId,
    revision,
    value: task,
  };
  // @ts-expect-error Direct prerequisite display must include its original raw status.
  const missingPrerequisiteStatus: IncompletePrerequisiteView = { taskId, name: 'A' };
  // @ts-expect-error Derived dependency facts must carry sourceRevision.
  const missingSourceRevision: DependencyResultView = { availability: 'NO_TASKS', edges: [] };
  // @ts-expect-error Raw dependency records preserve their stored DependencyId, unlike pair-only views.
  const missingDependencyId: NonNullable<DependencySourceSnapshot['links']>[number] = {
    projectId,
    prerequisiteId: taskId,
    dependentId: asTaskId('T-other'),
  };

  void [
    read,
    mutation,
    knownEmpty,
    unavailable,
    rawLinks,
    prerequisite,
    mistakenAssignee,
    fourthStatus,
    missingReadRevision,
    missingSavedChange,
    missingPrerequisiteStatus,
    missingSourceRevision,
    missingDependencyId,
  ];
}
