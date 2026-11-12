import type {
  AssignedTasksResult,
  BlockedResult,
  MemberId,
  ProjectSnapshot,
  ScheduleResultView,
  TaskDisplayView,
  TaskSnapshot,
} from '@group9/shared';
import { assertCoherentSnapshot } from './common.js';

export class MonitoringAccessError extends Error {
  constructor(message = 'Viewer is not an active project member.') {
    super(message);
    this.name = 'MonitoringAccessError';
  }
}

function activeViewer(snapshot: ProjectSnapshot, viewerMemberId: MemberId): void {
  const membership = snapshot.members.find(
    (member) =>
      member.projectId === snapshot.projectId &&
      member.memberId === viewerMemberId &&
      member.active &&
      member.leftAt === null,
  );
  if (!membership) throw new MonitoringAccessError();
}

function blockedFacts(
  task: TaskSnapshot,
  blocked: BlockedResult,
  revision: number,
): Pick<TaskDisplayView, 'isBlocked' | 'incompletePrerequisites'> {
  if (task.status === 'COMPLETED') {
    return { isBlocked: false, incompletePrerequisites: [] };
  }
  const known =
    (blocked.availability === 'VALID' || blocked.availability === 'NO_TASKS') &&
    blocked.sourceRevision === revision;
  if (!known) return { isBlocked: null, incompletePrerequisites: null };

  const entry =
    blocked.byTaskId && Object.hasOwn(blocked.byTaskId, task.taskId)
      ? blocked.byTaskId[task.taskId]
      : undefined;
  return {
    isBlocked: entry !== undefined,
    incompletePrerequisites: entry?.incompletePrerequisites ?? [],
  };
}

function criticalFact(
  task: TaskSnapshot,
  schedule: ScheduleResultView,
  revision: number,
): boolean | null {
  const known =
    schedule.availability === 'VALID' &&
    schedule.sourceRevision === revision &&
    schedule.criticalTaskIds !== null;
  if (!known) return null;
  return schedule.criticalTaskIds?.includes(task.taskId) ?? false;
}

/**
 * F5 MON-M4. AssigneeId and viewerMemberId are both Membership IDs.
 * No global UserId is accepted or compared here.
 */
export function getAssignedTasks(
  snapshot: ProjectSnapshot,
  viewerMemberId: MemberId,
  blocked: BlockedResult,
  schedule: ScheduleResultView,
): AssignedTasksResult {
  activeViewer(snapshot, viewerMemberId);
  assertCoherentSnapshot(snapshot);
  if (snapshot.tasks.length === 0) {
    return {
      availability: 'NO_TASKS',
      sourceRevision: snapshot.revision,
      items: [],
    };
  }

  const items: TaskDisplayView[] = snapshot.tasks
    .filter((task) => task.assigneeId === viewerMemberId)
    .map((task) => ({
      task,
      rawStatus: task.status,
      ...blockedFacts(task, blocked, snapshot.revision),
      isCritical: criticalFact(task, schedule, snapshot.revision),
    }));

  return {
    availability: 'VALID',
    sourceRevision: snapshot.revision,
    items,
  };
}
