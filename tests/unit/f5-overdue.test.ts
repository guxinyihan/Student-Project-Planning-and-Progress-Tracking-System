import { describe, expect, it } from 'vitest';
import { detectOverdueTasks } from '../../src/domain/monitoring/overdue.js';
import {
  AS_OF_DATE,
  DEMO_REVISION,
  PROJECT_TIME_ZONE,
  baseTasks,
  makePolicy,
  makeTask,
} from '../fixtures/f5-f6-fixtures.js';

const options = { projectTimeZone: PROJECT_TIME_ZONE };

describe('F5-M5 basic overdue facts', () => {
  it('marks only unfinished tasks after the deadline and copies the day count', () => {
    const result = detectOverdueTasks(
      baseTasks(),
      AS_OF_DATE,
      DEMO_REVISION,
      makePolicy(),
      options,
    );
    expect(result.availability).toBe('VALID');
    expect(result.overdueTaskIds).toEqual(['C']);
    expect(result.items).toEqual([{ taskId: 'C', daysOverdue: 3 }]);
    expect(result.notEvaluatedTaskIds).toEqual([]);
  });

  it('does not mark a task overdue when asOfDate equals its deadline', () => {
    const tasks = [makeTask('A', 'Boundary task', 'IN_PROGRESS', { taskDeadline: AS_OF_DATE })];
    const result = detectOverdueTasks(tasks, AS_OF_DATE, DEMO_REVISION, makePolicy(), options);
    expect(result.overdueTaskIds).toEqual([]);
    expect(result.notEvaluatedTaskIds).toEqual([]);
  });

  it('excludes completed tasks from unfinished overdue work', () => {
    const result = detectOverdueTasks(
      baseTasks(),
      AS_OF_DATE,
      DEMO_REVISION,
      makePolicy(),
      options,
    );
    expect(result.overdueTaskIds).not.toContain('A');
    expect(result.overdueTaskIds).not.toContain('B');
  });

  it('records a missing deadline as not evaluated rather than on time', () => {
    const tasks = [makeTask('E', 'No deadline', 'IN_PROGRESS', { taskDeadline: null })];
    const result = detectOverdueTasks(tasks, AS_OF_DATE, DEMO_REVISION, makePolicy(), options);
    expect(result.overdueTaskIds).toEqual([]);
    expect(result.notEvaluatedTaskIds).toEqual(['E']);
    expect(result.reasons[0]?.message).toMatch(/missing/i);
  });

  it('records invalid task dates as not evaluated', () => {
    const tasks = [makeTask('E', 'Bad date', 'NOT_STARTED', { taskDeadline: '2026-02-30' })];
    const result = detectOverdueTasks(tasks, AS_OF_DATE, DEMO_REVISION, makePolicy(), options);
    expect(result.notEvaluatedTaskIds).toEqual(['E']);
    expect(result.reasons[0]?.message).toMatch(/valid LocalDate/i);
  });

  it('does not infer a timezone when none is supplied', () => {
    const result = detectOverdueTasks(baseTasks(), AS_OF_DATE, DEMO_REVISION, makePolicy(), {
      projectTimeZone: null,
    });
    expect(result.overdueTaskIds).toEqual([]);
    expect(result.notEvaluatedTaskIds).toEqual(['C', 'D']);
    expect(result.reasons.every((reason) => /timezone|date policy/i.test(reason.message))).toBe(
      true,
    );
  });

  it('does not evaluate dates when the date policy is unresolved', () => {
    const result = detectOverdueTasks(
      baseTasks(),
      AS_OF_DATE,
      DEMO_REVISION,
      makePolicy({ datePolicy: 'UNRESOLVED' }),
      options,
    );
    expect(result.overdueTaskIds).toEqual([]);
    expect(result.notEvaluatedTaskIds).toEqual(['C', 'D']);
  });

  it('records an invalid asOfDate as not evaluated', () => {
    const result = detectOverdueTasks(
      baseTasks(),
      'not-a-date',
      DEMO_REVISION,
      makePolicy(),
      options,
    );
    expect(result.overdueTaskIds).toEqual([]);
    expect(result.notEvaluatedTaskIds).toEqual(['C', 'D']);
    expect(result.reasons[0]?.message).toMatch(/asOfDate/i);
  });

  it('returns a neutral NO_TASKS result for an empty project', () => {
    const result = detectOverdueTasks([], AS_OF_DATE, DEMO_REVISION, makePolicy(), options);
    expect(result).toEqual({
      availability: 'NO_TASKS',
      sourceRevision: DEMO_REVISION,
      asOfDate: AS_OF_DATE,
      overdueTaskIds: [],
      notEvaluatedTaskIds: [],
      items: [],
      reasons: [],
    });
  });
});
