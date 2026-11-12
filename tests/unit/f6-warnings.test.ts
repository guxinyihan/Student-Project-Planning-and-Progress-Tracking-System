import { describe, expect, it } from 'vitest';
import { asRevision } from '@group9/shared';
import { composeWarnings } from '../../src/domain/monitoring/warnings.js';
import { detectOverdueTasks } from '../../src/domain/monitoring/overdue.js';
import { identifyBlockedTasks } from '../../src/domain/monitoring/blocked.js';
import {
  AS_OF_DATE,
  DEMO_REVISION,
  PROJECT_TIME_ZONE,
  baseTasks,
  makeDependencies,
  makePolicy,
  makeSchedule,
  makeSnapshot,
} from '../fixtures/f5-f6-fixtures.js';

const options = { projectTimeZone: PROJECT_TIME_ZONE };

function parts(
  optionsOverride: {
    tasks?: ReturnType<typeof baseTasks>;
    dependencies?: ReturnType<typeof makeDependencies>;
    schedule?: ReturnType<typeof makeSchedule>;
    policy?: ReturnType<typeof makePolicy>;
  } = {},
) {
  const tasks = optionsOverride.tasks ?? baseTasks();
  const snapshot = makeSnapshot({ tasks });
  const dependencies = optionsOverride.dependencies ?? makeDependencies();
  const schedule = optionsOverride.schedule ?? makeSchedule();
  const policy = optionsOverride.policy ?? makePolicy();
  const blocked = identifyBlockedTasks(tasks, dependencies, DEMO_REVISION);
  const overdue = detectOverdueTasks(tasks, AS_OF_DATE, DEMO_REVISION, policy, options);
  return { snapshot, dependencies, schedule, policy, blocked, overdue };
}

describe('F6 three-category warning composition', () => {
  it('emits the overdue, blocked-critical and project-deadline warnings from current facts', () => {
    const { snapshot, schedule, blocked, overdue, policy } = parts();
    const result = composeWarnings(snapshot, schedule, blocked, overdue, policy, options);
    expect(result.availability).toBe('VALID');
    expect(result.items?.map((item) => item.type)).toEqual([
      'PROJECT_DEADLINE_CONFLICT',
      'BLOCKED_CRITICAL_TASK',
      'OVERDUE_TASK',
    ]);
    expect(result.items?.find((item) => item.type === 'OVERDUE_TASK')?.daysOverdue).toBe(3);
    expect(
      result.items?.find((item) => item.type === 'BLOCKED_CRITICAL_TASK')?.prerequisiteIds,
    ).toEqual(['C']);
    expect(result.evaluationByType).toEqual({
      OVERDUE_TASK: { availability: 'VALID' },
      BLOCKED_CRITICAL_TASK: { availability: 'VALID' },
      PROJECT_DEADLINE_CONFLICT: { availability: 'VALID' },
    });
  });

  it('returns NOT_ENABLED with null payload when optional F6 is off', () => {
    const { snapshot, schedule, blocked, overdue } = parts();
    const result = composeWarnings(
      snapshot,
      schedule,
      blocked,
      overdue,
      makePolicy({ f6Enabled: false }),
      options,
    );
    expect(result).toEqual({
      availability: 'NOT_ENABLED',
      sourceRevision: DEMO_REVISION,
      items: null,
      evaluationByType: null,
      reasonCode: 'FEATURE_NOT_ENABLED',
    });
  });

  it('keeps overdue warnings evaluable while F3-dependent blocked warnings are unknown', () => {
    const { snapshot, schedule, policy } = parts({
      dependencies: makeDependencies({
        availability: 'NOT_ENABLED',
        edges: null,
        reasonCode: 'FEATURE_NOT_ENABLED',
      }),
    });
    const blocked = identifyBlockedTasks(
      baseTasks(),
      makeDependencies({
        availability: 'NOT_ENABLED',
        edges: null,
        reasonCode: 'FEATURE_NOT_ENABLED',
      }),
      DEMO_REVISION,
    );
    const overdue = detectOverdueTasks(baseTasks(), AS_OF_DATE, DEMO_REVISION, policy, options);
    const result = composeWarnings(snapshot, schedule, blocked, overdue, policy, options);
    expect(result.availability).toBe('VALID');
    expect(result.items?.map((item) => item.type)).toEqual([
      'PROJECT_DEADLINE_CONFLICT',
      'OVERDUE_TASK',
    ]);
    expect(result.evaluationByType?.BLOCKED_CRITICAL_TASK.availability).toBe('UNAVAILABLE');
  });

  it('leaves critical and project warnings unknown when F4 is unavailable', () => {
    const { snapshot, schedule, blocked, overdue, policy } = parts({
      schedule: makeSchedule({ availability: 'UNAVAILABLE', reasonCode: 'CALCULATION_FAILED' }),
    });
    const result = composeWarnings(snapshot, schedule, blocked, overdue, policy, options);
    expect(result.items?.map((item) => item.type)).toEqual(['OVERDUE_TASK']);
    expect(result.evaluationByType?.BLOCKED_CRITICAL_TASK.availability).toBe('UNAVAILABLE');
    expect(result.evaluationByType?.PROJECT_DEADLINE_CONFLICT.availability).toBe('UNAVAILABLE');
    expect(result.evaluationByType?.OVERDUE_TASK.availability).toBe('VALID');
  });

  it('marks project conflict not evaluated when the project deadline is missing', () => {
    const tasks = baseTasks();
    const snapshot = makeSnapshot({ tasks, projectDeadline: null });
    const blocked = identifyBlockedTasks(tasks, makeDependencies(), DEMO_REVISION);
    const overdue = detectOverdueTasks(tasks, AS_OF_DATE, DEMO_REVISION, makePolicy(), options);
    const result = composeWarnings(
      snapshot,
      makeSchedule(),
      blocked,
      overdue,
      makePolicy(),
      options,
    );
    expect(result.evaluationByType?.PROJECT_DEADLINE_CONFLICT.availability).toBe('UNAVAILABLE');
    expect(result.items?.some((item) => item.type === 'PROJECT_DEADLINE_CONFLICT')).toBe(false);
  });

  it('does not compare dates without a project timezone/date policy', () => {
    const tasks = baseTasks();
    const snapshot = makeSnapshot({ tasks });
    const policy = makePolicy();
    const blocked = identifyBlockedTasks(tasks, makeDependencies(), DEMO_REVISION);
    const overdue = detectOverdueTasks(tasks, AS_OF_DATE, DEMO_REVISION, policy, {
      projectTimeZone: null,
    });
    const result = composeWarnings(snapshot, makeSchedule(), blocked, overdue, policy, {
      projectTimeZone: null,
    });
    expect(result.evaluationByType?.OVERDUE_TASK.availability).toBe('UNAVAILABLE');
    expect(result.evaluationByType?.PROJECT_DEADLINE_CONFLICT.availability).toBe('UNAVAILABLE');
  });

  it('rejects stale schedule facts instead of relabelling old critical/finish data', () => {
    const { snapshot, schedule, blocked, overdue, policy } = parts({
      schedule: makeSchedule({ sourceRevision: 11 }),
    });
    const result = composeWarnings(snapshot, schedule, blocked, overdue, policy, options);
    expect(result.evaluationByType?.BLOCKED_CRITICAL_TASK).toMatchObject({
      availability: 'UNAVAILABLE',
      reasonCode: 'STALE_RESULT',
    });
    expect(result.evaluationByType?.PROJECT_DEADLINE_CONFLICT).toMatchObject({
      availability: 'UNAVAILABLE',
      reasonCode: 'STALE_RESULT',
    });
    expect(result.items?.some((item) => item.type === 'BLOCKED_CRITICAL_TASK')).toBe(false);
  });

  it('can return an empty warning list while categories remain unevaluated', () => {
    const tasks = baseTasks().map((task) => ({
      ...task,
      status: 'COMPLETED' as const,
      taskDeadline: null,
    }));
    const snapshot = makeSnapshot({ tasks });
    const schedule = makeSchedule({
      availability: 'UNAVAILABLE',
      reasonCode: 'CALCULATION_FAILED',
    });
    const blocked = identifyBlockedTasks(tasks, makeDependencies(), DEMO_REVISION);
    const overdue = detectOverdueTasks(tasks, AS_OF_DATE, DEMO_REVISION, makePolicy(), options);
    const result = composeWarnings(snapshot, schedule, blocked, overdue, makePolicy(), options);
    expect(result.items).toEqual([]);
    expect(result.evaluationByType?.BLOCKED_CRITICAL_TASK.availability).toBe('UNAVAILABLE');
    expect(result.evaluationByType?.PROJECT_DEADLINE_CONFLICT.availability).toBe('UNAVAILABLE');
  });

  it('emits exactly the three supported warning types and no invented type', () => {
    const { snapshot, schedule, blocked, overdue, policy } = parts();
    const result = composeWarnings(snapshot, schedule, blocked, overdue, policy, options);
    expect(Object.keys(result.evaluationByType ?? {}).sort()).toEqual([
      'BLOCKED_CRITICAL_TASK',
      'OVERDUE_TASK',
      'PROJECT_DEADLINE_CONFLICT',
    ]);
  });

  it('keeps a known valid empty Blocked evaluation separate from unknown data', () => {
    const { snapshot, schedule, overdue, policy } = parts();
    const blocked = identifyBlockedTasks(
      baseTasks(),
      makeDependencies({ edges: [] }),
      DEMO_REVISION,
    );
    const result = composeWarnings(snapshot, schedule, blocked, overdue, policy, options);
    expect(result.evaluationByType?.BLOCKED_CRITICAL_TASK.availability).toBe('VALID');
    expect(result.items?.some((item) => item.type === 'BLOCKED_CRITICAL_TASK')).toBe(false);
  });

  it.each([
    {
      scenario: 'explains partial evaluation with a future deadline and a missing deadline',
      firstDeadline: '2026-10-29',
      secondDeadline: null,
      availability: 'UNAVAILABLE',
      explanation: 'Overdue status could not be evaluated for 1 of 2 unfinished tasks. Overdue risk remains unknown for those tasks.',
      overdueIds: [],
    },
    {
      scenario: 'explains all unfinished tasks are unevaluable despite completed tasks',
      firstDeadline: null,
      secondDeadline: null,
      availability: 'UNAVAILABLE',
      explanation: 'No candidate task date comparison could be evaluated; overdue risk remains unknown.',
      overdueIds: [],
    },
    {
      scenario: 'returns a known empty overdue list for future and same-day deadlines',
      firstDeadline: '2026-10-29',
      secondDeadline: AS_OF_DATE,
      availability: 'VALID',
      explanation: undefined,
      overdueIds: [],
    },
    {
      scenario: 'retains confirmed overdue warnings when another date is unevaluable',
      firstDeadline: '2026-10-22',
      secondDeadline: null,
      availability: 'VALID',
      explanation: 'Overdue status could not be evaluated for 1 of 2 unfinished tasks. Confirmed overdue tasks are still shown.',
      overdueIds: ['C'],
    },
  ])('IT-C10 $scenario', ({ firstDeadline, secondDeadline, availability, explanation, overdueIds }) => {
    const tasks = baseTasks().map((task) => ({
      ...task,
      taskDeadline:
        task.taskId === 'C' ? firstDeadline : task.taskId === 'D' ? secondDeadline : null,
    }));
    const { snapshot, schedule, blocked, overdue, policy } = parts({ tasks });
    const result = composeWarnings(snapshot, schedule, blocked, overdue, policy, options);

    expect(overdue.overdueTaskIds).toEqual(overdueIds);
    expect(overdue.notEvaluatedTaskIds).toEqual([
      ...(firstDeadline === null ? ['C'] : []),
      ...(secondDeadline === null ? ['D'] : []),
    ]);
    expect(result.evaluationByType?.OVERDUE_TASK).toEqual({
      availability,
      ...(explanation === undefined ? {} : { explanation }),
    });
    expect(
      result.items?.filter((item) => item.type === 'OVERDUE_TASK').map((item) => item.taskId),
    ).toEqual(overdueIds);
  });

  it('IT-C10 rejects stale overdue facts even when they contain a warning', () => {
    const { snapshot, schedule, blocked, overdue, policy } = parts();
    const result = composeWarnings(
      snapshot,
      schedule,
      blocked,
      { ...overdue, sourceRevision: asRevision(11) },
      policy,
      options,
    );
    expect(overdue.overdueTaskIds).toEqual(['C']);
    expect(result.evaluationByType?.OVERDUE_TASK).toMatchObject({
      availability: 'UNAVAILABLE',
      reasonCode: 'STALE_RESULT',
    });
    expect(result.items?.some((item) => item.type === 'OVERDUE_TASK')).toBe(false);
  });

  it('uses the F4 supplied finish and never recomputes it from duration', () => {
    const { snapshot, blocked, overdue, policy } = parts({
      schedule: makeSchedule({ estimatedProjectFinish: '2026-11-15' }),
    });
    const schedule = makeSchedule({ estimatedProjectFinish: '2026-11-15' });
    const result = composeWarnings(snapshot, schedule, blocked, overdue, policy, options);
    const item = result.items?.find((warning) => warning.type === 'PROJECT_DEADLINE_CONFLICT');
    expect(item?.message).toContain('2026-11-15');
    expect(item?.message).toContain('17 days');
    expect(item?.message).not.toContain('2026-10-30');
  });

  it('does not flag equality between finish and project deadline', () => {
    const { snapshot, blocked, overdue, policy } = parts({
      schedule: makeSchedule({ estimatedProjectFinish: '2026-10-29' }),
    });
    const result = composeWarnings(
      snapshot,
      makeSchedule({ estimatedProjectFinish: '2026-10-29' }),
      blocked,
      overdue,
      policy,
      options,
    );
    expect(result.items?.some((item) => item.type === 'PROJECT_DEADLINE_CONFLICT')).toBe(false);
  });
});
