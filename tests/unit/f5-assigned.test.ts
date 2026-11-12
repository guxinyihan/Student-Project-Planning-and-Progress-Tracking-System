import { describe, expect, it } from 'vitest';
import { asMemberId } from '@group9/shared';
import { getAssignedTasks, MonitoringAccessError } from '../../src/domain/monitoring/assigned.js';
import { identifyBlockedTasks } from '../../src/domain/monitoring/blocked.js';
import {
  DEMO_REVISION,
  VIEWER_MEMBER_ID,
  baseTasks,
  makeDependencies,
  makeSchedule,
  makeSnapshot,
  makeTask,
} from '../fixtures/f5-f6-fixtures.js';

function context(tasksOverride = baseTasks()) {
  const snapshot = makeSnapshot({ tasks: tasksOverride });
  const blocked = identifyBlockedTasks(tasksOverride, makeDependencies(), DEMO_REVISION);
  const schedule = makeSchedule();
  return { snapshot, blocked, schedule };
}

describe('F5-M4 personal assignment projection', () => {
  it('selects assignments by Membership ID and preserves source order', () => {
    const { snapshot, blocked, schedule } = context();
    const result = getAssignedTasks(snapshot, VIEWER_MEMBER_ID, blocked, schedule);
    expect(result.availability).toBe('VALID');
    expect(result.items.map((item) => item.task.taskId)).toEqual(['A', 'B', 'C', 'D']);
    expect(result.items.find((item) => item.task.taskId === 'D')?.isBlocked).toBe(true);
  });

  it('does not display unassigned tasks as assigned', () => {
    const tasks = [
      ...baseTasks(),
      makeTask('E', 'Unassigned documentation', 'NOT_STARTED', { assigneeId: null }),
    ];
    const { snapshot, blocked, schedule } = context(tasks);
    const result = getAssignedTasks(snapshot, VIEWER_MEMBER_ID, blocked, schedule);
    expect(result.items.map((item) => item.task.taskId)).not.toContain('E');
  });

  it('keeps a departed member’s former tasks unassigned rather than inventing a new owner', () => {
    const tasks = baseTasks().map((task) =>
      task.assigneeId === VIEWER_MEMBER_ID ? { ...task, assigneeId: null } : task,
    );
    const { snapshot, blocked, schedule } = context(tasks);
    const result = getAssignedTasks(snapshot, VIEWER_MEMBER_ID, blocked, schedule);
    expect(result.items).toEqual([]);
    expect(tasks.every((task) => task.assigneeId === null)).toBe(true);
  });

  it('does not confuse a UserId with a Membership ID', () => {
    const { snapshot, blocked, schedule } = context();
    expect(() => getAssignedTasks(snapshot, asMemberId('U1'), blocked, schedule)).toThrow(
      MonitoringAccessError,
    );
  });

  it('rejects an inactive viewer even if the member row is historical', () => {
    const snapshot = makeSnapshot();
    const inactive = {
      ...snapshot,
      members: snapshot.members.map((member) =>
        member.memberId === VIEWER_MEMBER_ID ? { ...member, active: false as const } : member,
      ),
    };
    const blocked = identifyBlockedTasks(baseTasks(), makeDependencies(), DEMO_REVISION);
    expect(() => getAssignedTasks(inactive, VIEWER_MEMBER_ID, blocked, makeSchedule())).toThrow(
      MonitoringAccessError,
    );
  });

  it('uses nullable unknown Blocked/flag values when F3 is unavailable', () => {
    const tasks = baseTasks();
    const snapshot = makeSnapshot({ tasks });
    const unknown = identifyBlockedTasks(
      tasks,
      makeDependencies({
        availability: 'NOT_ENABLED',
        edges: null,
        reasonCode: 'FEATURE_NOT_ENABLED',
      }),
      DEMO_REVISION,
    );
    const result = getAssignedTasks(snapshot, VIEWER_MEMBER_ID, unknown, makeSchedule());
    const completed = result.items.find((item) => item.task.taskId === 'A');
    const unfinished = result.items.find((item) => item.task.taskId === 'D');
    expect(completed).toMatchObject({ isBlocked: false, incompletePrerequisites: [] });
    expect(unfinished).toMatchObject({ isBlocked: null, incompletePrerequisites: null });
  });

  it('uses null for unknown criticality rather than false', () => {
    const { snapshot, blocked } = context();
    const unavailable = getAssignedTasks(
      snapshot,
      VIEWER_MEMBER_ID,
      blocked,
      makeSchedule({ availability: 'NOT_ENABLED', reasonCode: 'FEATURE_NOT_ENABLED' }),
    );
    expect(unavailable.items.every((item) => item.isCritical === null)).toBe(true);
  });

  it('returns a neutral NO_TASKS result for an empty project', () => {
    const snapshot = makeSnapshot({ tasks: [] });
    const result = getAssignedTasks(
      snapshot,
      VIEWER_MEMBER_ID,
      identifyBlockedTasks(
        [],
        makeDependencies({ availability: 'NO_TASKS', edges: [] }),
        DEMO_REVISION,
      ),
      makeSchedule({ availability: 'NO_TASKS' }),
    );
    expect(result).toEqual({
      availability: 'NO_TASKS',
      sourceRevision: DEMO_REVISION,
      items: [],
    });
  });
});
