import { describe, expect, it } from 'vitest';
import { asMemberId, asUserId } from '@group9/shared';
import { buildDashboard } from '../../src/domain/monitoring/dashboard.js';
import {
  AS_OF_DATE,
  DEMO_REVISION,
  OTHER_MEMBER_ID,
  PROJECT_TIME_ZONE,
  VIEWER_MEMBER_ID,
  VIEWER_USER_ID,
  baseTasks,
  makeDependencies,
  makePolicy,
  makeSchedule,
  makeSnapshot,
  makeTask,
} from '../fixtures/f5-f6-fixtures.js';

const options = { projectTimeZone: PROJECT_TIME_ZONE };

function input(
  overrides: {
    tasks?: ReturnType<typeof baseTasks>;
    dependencies?: ReturnType<typeof makeDependencies>;
    schedule?: ReturnType<typeof makeSchedule>;
    snapshot?: ReturnType<typeof makeSnapshot>;
    viewerMemberId?: ReturnType<typeof asMemberId>;
    actorId?: ReturnType<typeof asUserId>;
  } = {},
) {
  const tasks = overrides.tasks ?? baseTasks();
  const snapshot = overrides.snapshot ?? makeSnapshot({ tasks });
  return {
    context: {
      actorId: overrides.actorId ?? VIEWER_USER_ID,
      viewerMemberId: overrides.viewerMemberId ?? VIEWER_MEMBER_ID,
      asOfDate: AS_OF_DATE,
      snapshot,
    },
    dependencies: overrides.dependencies ?? makeDependencies(),
    schedule: overrides.schedule ?? makeSchedule(),
  };
}

describe('F6/MON-M0 dashboard composition', () => {
  it('builds the complete demo dashboard with 50 percent and one warning of each type', () => {
    const result = buildDashboard(input(), makePolicy(), options);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const summary = result.summary;
    expect(summary.progress.percentage).toBe(50);
    expect(summary.rawStatusCounts).toEqual({ NOT_STARTED: 1, IN_PROGRESS: 1, COMPLETED: 2 });
    expect(summary.blockedResult.blockedTaskIds).toEqual(['D']);
    expect(summary.assignedTasks.items).toHaveLength(4);
    expect(summary.overdueResult.items).toEqual([{ taskId: 'C', daysOverdue: 3 }]);
    expect(summary.warnings.items?.map((item) => item.type)).toEqual([
      'PROJECT_DEADLINE_CONFLICT',
      'BLOCKED_CRITICAL_TASK',
      'OVERDUE_TASK',
    ]);
    expect(summary.revision).toBe(DEMO_REVISION);
    expect(summary.progress.sourceRevision).toBe(DEMO_REVISION);
    expect(summary.blockedResult.sourceRevision).toBe(DEMO_REVISION);
    expect(summary.assignedTasks.sourceRevision).toBe(DEMO_REVISION);
    expect(summary.overdueResult.sourceRevision).toBe(DEMO_REVISION);
    expect(summary.schedule.sourceRevision).toBe(DEMO_REVISION);
    expect(summary.warnings.sourceRevision).toBe(DEMO_REVISION);
  });

  it('keeps reliable basic information when F3 is unavailable', () => {
    const result = buildDashboard(
      input({
        dependencies: makeDependencies({
          availability: 'NOT_ENABLED',
          edges: null,
          reasonCode: 'FEATURE_NOT_ENABLED',
        }),
      }),
      makePolicy(),
      options,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary.progress.percentage).toBe(50);
    expect(result.summary.blockedResult.availability).toBe('NOT_ENABLED');
    expect(result.summary.blockedResult.blockedTaskIds).toBeNull();
    expect(result.summary.schedule.availability).toBe('UNAVAILABLE');
    expect(result.summary.warnings.evaluationByType?.BLOCKED_CRITICAL_TASK.availability).toBe(
      'UNAVAILABLE',
    );
    expect(result.summary.notices.some((notice) => notice.capability === 'dependencies')).toBe(
      true,
    );
  });

  it('keeps basic F5 facts and current Blocked when only F4 is unavailable', () => {
    const result = buildDashboard(
      input({
        schedule: makeSchedule({ availability: 'UNAVAILABLE', reasonCode: 'CALCULATION_FAILED' }),
      }),
      makePolicy(),
      options,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary.blockedResult.availability).toBe('VALID');
    expect(result.summary.blockedResult.blockedTaskIds).toEqual(['D']);
    expect(result.summary.overdueResult.items).toEqual([{ taskId: 'C', daysOverdue: 3 }]);
    expect(result.summary.warnings.evaluationByType?.BLOCKED_CRITICAL_TASK.availability).toBe(
      'UNAVAILABLE',
    );
    expect(result.summary.warnings.evaluationByType?.OVERDUE_TASK.availability).toBe('VALID');
  });

  it('supports a valid empty project without fabricating zero-percent completion or warnings', () => {
    const result = buildDashboard(
      input({
        tasks: [],
        snapshot: makeSnapshot({ tasks: [] }),
        dependencies: makeDependencies({ availability: 'NO_TASKS', edges: [] }),
        schedule: makeSchedule({ availability: 'NO_TASKS' }),
      }),
      makePolicy(),
      options,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary.progress.availability).toBe('NO_TASKS');
    expect(result.summary.progress.percentage).toBeNull();
    expect(result.summary.blockedResult.availability).toBe('NO_TASKS');
    expect(result.summary.assignedTasks.availability).toBe('NO_TASKS');
    expect(result.summary.overdueResult.availability).toBe('NO_TASKS');
    expect(result.summary.warnings.availability).toBe('NO_TASKS');
    expect(result.summary.notices[0]?.message).toMatch(/No tasks yet/);
  });

  it('rejects a stale schedule and preserves current Blocked facts', () => {
    const result = buildDashboard(
      input({ schedule: makeSchedule({ sourceRevision: 11 }) }),
      makePolicy(),
      options,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary.schedule.availability).toBe('UNAVAILABLE');
    expect(result.summary.schedule.reasonCode).toBe('STALE_RESULT');
    expect(result.summary.blockedResult.availability).toBe('VALID');
    expect(result.summary.warnings.evaluationByType?.PROJECT_DEADLINE_CONFLICT).toMatchObject({
      availability: 'UNAVAILABLE',
      reasonCode: 'STALE_RESULT',
    });
  });

  it('rejects stale F3 facts and does not accept a same-number VALID schedule as current', () => {
    const result = buildDashboard(
      input({ dependencies: makeDependencies({ sourceRevision: 11 }) }),
      makePolicy(),
      options,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary.blockedResult.availability).toBe('UNAVAILABLE');
    expect(result.summary.blockedResult.reasonCode).toBe('STALE_RESULT');
    expect(result.summary.blockedResult.blockedTaskIds).toBeNull();
    expect(result.summary.schedule.availability).toBe('UNAVAILABLE');
    expect(result.summary.schedule.reasonCode).toBe('DEPENDENCY_INPUT_UNAVAILABLE');
    expect(result.summary.warnings.evaluationByType?.BLOCKED_CRITICAL_TASK.availability).toBe(
      'UNAVAILABLE',
    );
  });

  it('does not turn F4 off into a whole-dashboard failure', () => {
    const result = buildDashboard(input(), makePolicy({ f4Enabled: false }), options);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary.progress.percentage).toBe(50);
    expect(result.summary.schedule.availability).toBe('NOT_ENABLED');
    expect(result.summary.schedule.reasonCode).toBe('FEATURE_NOT_ENABLED');
    expect(result.summary.warnings.evaluationByType?.PROJECT_DEADLINE_CONFLICT.availability).toBe(
      'UNAVAILABLE',
    );
  });

  it('does not turn F6 off into a whole-dashboard failure', () => {
    const result = buildDashboard(input(), makePolicy({ f6Enabled: false }), options);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary.warnings).toEqual({
      availability: 'NOT_ENABLED',
      sourceRevision: DEMO_REVISION,
      items: null,
      evaluationByType: null,
      reasonCode: 'FEATURE_NOT_ENABLED',
    });
    expect(result.summary.overdueResult.items).toEqual([{ taskId: 'C', daysOverdue: 3 }]);
  });

  it('returns a generic safe failure for a nonmember viewer', () => {
    const result = buildDashboard(
      input({ viewerMemberId: asMemberId('M404'), actorId: asUserId('U404') }),
      makePolicy(),
      options,
    );
    expect(result).toEqual({
      ok: false,
      error: {
        code: 'INVALID_OR_INACCESSIBLE_PROJECT',
        message: 'Invalid or inaccessible project.',
      },
    });
  });

  it('rejects a viewer/actor membership mismatch without leaking data', () => {
    const result = buildDashboard(
      input({ viewerMemberId: OTHER_MEMBER_ID, actorId: VIEWER_USER_ID }),
      makePolicy(),
      options,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe('Invalid or inaccessible project.');
  });

  it('does not silently use the host timezone when no project timezone is supplied', () => {
    const result = buildDashboard(input(), makePolicy());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary.overdueResult.items).toEqual([]);
    expect(result.summary.overdueResult.notEvaluatedTaskIds).toEqual(['C', 'D']);
    expect(result.summary.warnings.evaluationByType?.OVERDUE_TASK.availability).toBe('UNAVAILABLE');
    expect(result.summary.notices.some((notice) => notice.capability === 'dates')).toBe(true);
  });

  it('includes unassigned tasks in the project total but not in the personal list', () => {
    const tasks = [
      ...baseTasks(),
      makeTask('E', 'Unassigned documentation', 'NOT_STARTED', { assigneeId: null }),
    ];
    const result = buildDashboard(
      input({ tasks, snapshot: makeSnapshot({ tasks }) }),
      makePolicy(),
      options,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary.progress.totalTasks).toBe(5);
    expect(result.summary.assignedTasks.items.map((item) => item.task.taskId)).not.toContain('E');
  });

  it('reports a task without a deadline as not evaluated, not on time', () => {
    const tasks = [makeTask('E', 'No deadline', 'IN_PROGRESS', { taskDeadline: null })];
    const result = buildDashboard(
      input({ tasks, snapshot: makeSnapshot({ tasks }) }),
      makePolicy(),
      options,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary.overdueResult.notEvaluatedTaskIds).toEqual(['E']);
    expect(result.summary.overdueResult.overdueTaskIds).toEqual([]);
    expect(result.summary.warnings.evaluationByType?.OVERDUE_TASK.availability).toBe('UNAVAILABLE');
    expect(result.summary.warnings.items?.some((item) => item.type === 'OVERDUE_TASK')).toBe(false);
  });

  it('IT-C10 reports partial evaluation from the same immutable dashboard snapshot', () => {
    const tasks = baseTasks().map((task) =>
      Object.freeze({
        ...task,
        taskDeadline: task.taskId === 'C' ? '2026-10-29' : null,
      }),
    );
    Object.freeze(tasks);
    const snapshot = Object.freeze(makeSnapshot({ tasks }));
    const before = structuredClone(snapshot);

    const result = buildDashboard(input({ snapshot }), makePolicy(), options);

    expect(snapshot).toEqual(before);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.summary.overdueResult).toMatchObject({
      sourceRevision: snapshot.revision,
      overdueTaskIds: [],
      notEvaluatedTaskIds: ['D'],
    });
    expect(result.summary.warnings.evaluationByType?.OVERDUE_TASK).toEqual({
      availability: 'UNAVAILABLE',
      explanation:
        'Overdue status could not be evaluated for 1 of 2 unfinished tasks. Overdue risk remains unknown for those tasks.',
    });
    expect(result.summary.warnings.items?.some((item) => item.type === 'OVERDUE_TASK')).toBe(false);
  });

  it('returns a safe source failure for duplicate task IDs', () => {
    const duplicated = [...baseTasks(), { ...baseTasks()[0]! }];
    const result = buildDashboard(
      input({ tasks: duplicated, snapshot: makeSnapshot({ tasks: duplicated }) }),
      makePolicy(),
      options,
    );
    expect(result).toEqual({
      ok: false,
      error: {
        code: 'SOURCE_UNAVAILABLE',
        message: 'The project source could not be read consistently. Try again.',
      },
    });
  });
});
