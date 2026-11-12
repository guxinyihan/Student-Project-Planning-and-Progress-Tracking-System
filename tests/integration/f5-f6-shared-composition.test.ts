import { describe, expect, it } from 'vitest';
import {
  buildDashboard,
  calculateSchedule,
  domainImplementationStage,
  getDependencyView,
  identifyCriticalActivities,
  identifyCriticalEdges,
  enumerateCriticalPaths,
} from '@group9/domain';
import {
  AS_OF_DATE,
  PROJECT_TIME_ZONE,
  VIEWER_MEMBER_ID,
  VIEWER_USER_ID,
  makePolicy,
  makeSnapshot,
  makeTask,
} from '../fixtures/f5-f6-fixtures.js';

function freezeSnapshot<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freezeSnapshot(child);
    Object.freeze(value);
  }
  return value;
}

describe('INT-10 shared F3/F4 and monitoring composition', () => {
  it.each([
    {
      name: 'partial evaluation with future and missing deadlines',
      deadlines: ['2026-10-28', null],
      availability: 'UNAVAILABLE',
      overdueIds: [],
      unevaluatedIds: ['D'],
      explanation: /1 of 2 unfinished tasks/,
    },
    {
      name: 'all unfinished tasks unevaluable',
      deadlines: [null, null],
      availability: 'UNAVAILABLE',
      overdueIds: [],
      unevaluatedIds: ['C', 'D'],
      explanation: /No candidate task date comparison could be evaluated/,
    },
    {
      name: 'known empty after evaluating future and same-day deadlines',
      deadlines: ['2026-10-28', AS_OF_DATE],
      availability: 'VALID',
      overdueIds: [],
      unevaluatedIds: [],
      explanation: null,
    },
    {
      name: 'confirmed overdue task with an unevaluable remainder',
      deadlines: ['2026-10-24', null],
      availability: 'VALID',
      overdueIds: ['C'],
      unevaluatedIds: ['D'],
      explanation: /1 of 2 unfinished tasks.*Confirmed overdue tasks are still shown/,
    },
  ])('$name uses the same immutable source and shared exports', (scenario) => {
    const snapshot = makeSnapshot({
      tasks: [
        makeTask('A', 'Requirements', 'COMPLETED', { durationDays: '2', taskDeadline: '2026-10-20' }),
        makeTask('B', 'Frontend', 'COMPLETED', { durationDays: '3', taskDeadline: '2026-10-21' }),
        makeTask('C', 'Backend', 'IN_PROGRESS', { durationDays: '6', taskDeadline: scenario.deadlines[0] ?? null }),
        makeTask('D', 'Testing', 'NOT_STARTED', { durationDays: '2', taskDeadline: scenario.deadlines[1] ?? null }),
      ],
    });
    const sourceBefore = structuredClone(snapshot);
    freezeSnapshot(snapshot);
    const policy = Object.freeze(makePolicy());
    const dependencies = getDependencyView(snapshot, policy.f3Enabled);
    const schedule = calculateSchedule(snapshot, dependencies, policy, {
      projectTimeZone: PROJECT_TIME_ZONE,
      dateMappingConfirmed: true,
    });
    const result = buildDashboard({
      context: {
        snapshot,
        actorId: VIEWER_USER_ID,
        viewerMemberId: VIEWER_MEMBER_ID,
        asOfDate: AS_OF_DATE,
      },
      dependencies,
      schedule,
    }, policy, { projectTimeZone: PROJECT_TIME_ZONE });

    expect(domainImplementationStage).toBe('ISOLATED_F3_F4');
    expect(identifyCriticalActivities).toBeTypeOf('function');
    expect(identifyCriticalEdges).toBeTypeOf('function');
    expect(enumerateCriticalPaths).toBeTypeOf('function');
    expect(dependencies).toMatchObject({ availability: 'VALID', sourceRevision: snapshot.revision });
    expect(dependencies.edges).toHaveLength(4);
    expect(schedule).toMatchObject({
      availability: 'VALID',
      sourceRevision: snapshot.revision,
      durationDays: '10',
      criticalTaskIds: ['A', 'C', 'D'],
      estimatedProjectFinish: '2026-10-30',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    const summary = result.summary;
    expect(summary.revision).toBe(snapshot.revision);
    expect(summary.schedule).toBe(schedule);
    expect(summary.overdueResult).toMatchObject({
      sourceRevision: snapshot.revision,
      overdueTaskIds: scenario.overdueIds,
      notEvaluatedTaskIds: scenario.unevaluatedIds,
    });
    const evaluation = summary.warnings.evaluationByType?.OVERDUE_TASK;
    expect(evaluation?.availability).toBe(scenario.availability);
    if (scenario.explanation) expect(evaluation?.explanation).toMatch(scenario.explanation);
    else expect(evaluation?.explanation).toBeUndefined();
    expect(summary.warnings.items?.filter((item) => item.type === 'OVERDUE_TASK').map((item) => item.taskId))
      .toEqual(scenario.overdueIds);
    expect(snapshot).toStrictEqual(sourceBefore);
  });
});
