import { describe, expect, it } from 'vitest';
import { asTaskId } from '@group9/shared';
import { calculateProgress } from '../../src/domain/monitoring/progress.js';
import { DEMO_REVISION, baseTasks, makeTask } from '../fixtures/f5-f6-fixtures.js';

describe('F5-M2 completion and raw status counts', () => {
  it('reports 2 of 4 completed as exactly 50 percent', () => {
    const result = calculateProgress(baseTasks(), DEMO_REVISION);
    expect(result.progress).toMatchObject({
      availability: 'VALID',
      sourceRevision: DEMO_REVISION,
      totalTasks: 4,
      completedTasks: 2,
      percentage: 50,
    });
    expect(result.rawStatusCounts).toEqual({ NOT_STARTED: 1, IN_PROGRESS: 1, COMPLETED: 2 });
  });

  it('reports 0 of 4 as 0 percent without dividing by an invalid value', () => {
    const tasks = baseTasks().map((task) => ({ ...task, status: 'NOT_STARTED' as const }));
    const result = calculateProgress(tasks, DEMO_REVISION);
    expect(result.progress.percentage).toBe(0);
    expect(result.progress.totalTasks).toBe(4);
    expect(result.progress.completedTasks).toBe(0);
  });

  it('returns NO_TASKS and a null percentage for an empty project', () => {
    const result = calculateProgress([], DEMO_REVISION);
    expect(result.progress).toEqual({
      availability: 'NO_TASKS',
      sourceRevision: DEMO_REVISION,
      totalTasks: 0,
      completedTasks: 0,
      percentage: null,
    });
    expect(result.rawStatusCounts).toEqual({ NOT_STARTED: 0, IN_PROGRESS: 0, COMPLETED: 0 });
  });

  it('includes unassigned tasks in the project denominator', () => {
    const tasks = [
      ...baseTasks(),
      makeTask('E', 'Unassigned documentation', 'NOT_STARTED', { assigneeId: null }),
    ];
    const result = calculateProgress(tasks, DEMO_REVISION);
    expect(result.progress.totalTasks).toBe(5);
    expect(result.progress.percentage).toBe(40);
  });

  it('counts each task exactly once across the three raw buckets', () => {
    const tasks = baseTasks();
    const result = calculateProgress(tasks, DEMO_REVISION);
    const sum = Object.values(result.rawStatusCounts).reduce((total, value) => total + value, 0);
    expect(sum).toBe(result.progress.totalTasks);
  });

  it('rejects duplicate task IDs instead of silently double-counting', () => {
    const duplicated = [...baseTasks(), { ...baseTasks()[0]!, taskId: asTaskId('A') }];
    expect(() => calculateProgress(duplicated, DEMO_REVISION)).toThrow(/Duplicate taskId/);
  });
});
