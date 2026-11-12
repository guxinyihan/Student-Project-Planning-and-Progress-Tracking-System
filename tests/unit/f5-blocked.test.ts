import { describe, expect, it } from 'vitest';
import { asTaskId } from '@group9/shared';
import { identifyBlockedTasks } from '../../src/domain/monitoring/blocked.js';
import {
  DEMO_REVISION,
  baseEdges,
  baseTasks,
  makeDependencies,
  makeTask,
} from '../fixtures/f5-f6-fixtures.js';

describe('F5-M3 direct Blocked derivation', () => {
  it('names one incomplete direct prerequisite and keeps its raw status', () => {
    const result = identifyBlockedTasks(baseTasks(), makeDependencies(), DEMO_REVISION);
    expect(result.availability).toBe('VALID');
    expect(result.blockedTaskIds).toEqual(['D']);
    expect(result.byTaskId?.[asTaskId('D')]?.incompletePrerequisites).toEqual([
      { taskId: 'C', name: 'Backend development', rawStatus: 'IN_PROGRESS' },
    ]);
  });

  it('names multiple incomplete direct prerequisites without duplicating completed ones', () => {
    const tasks = baseTasks().map((task) =>
      task.taskId === 'B' ? { ...task, status: 'NOT_STARTED' as const } : task,
    );
    const result = identifyBlockedTasks(tasks, makeDependencies(), DEMO_REVISION);
    expect(
      result.byTaskId?.[asTaskId('D')]?.incompletePrerequisites.map((item) => item.taskId),
    ).toEqual(['B', 'C']);
  });

  it('removes a prerequisite from the reason after it becomes completed', () => {
    const tasks = baseTasks().map((task) =>
      task.taskId === 'C' ? { ...task, status: 'COMPLETED' as const } : task,
    );
    const result = identifyBlockedTasks(tasks, makeDependencies(), DEMO_REVISION);
    expect(result.blockedTaskIds).toEqual([]);
    expect(result.byTaskId).toEqual({});
  });

  it('never treats a completed dependent as unfinished Blocked work', () => {
    const tasks = baseTasks().map((task) =>
      task.taskId === 'D' ? { ...task, status: 'COMPLETED' as const } : task,
    );
    const result = identifyBlockedTasks(tasks, makeDependencies(), DEMO_REVISION);
    expect(result.blockedTaskIds).toEqual([]);
  });

  it('preserves the dependent raw status and does not mutate source tasks', () => {
    const tasks = baseTasks().map((task) =>
      task.taskId === 'D' ? { ...task, status: 'IN_PROGRESS' as const } : task,
    );
    const before = tasks.map((task) => task.status);
    const result = identifyBlockedTasks(tasks, makeDependencies(), DEMO_REVISION);
    expect(tasks.map((task) => task.status)).toEqual(before);
    expect(result.byTaskId?.[asTaskId('D')]).toBeDefined();
    expect(tasks.find((task) => task.taskId === 'D')?.status).toBe('IN_PROGRESS');
  });

  it('distinguishes a known empty edge set from unknown dependency data', () => {
    const knownEmpty = identifyBlockedTasks(
      baseTasks(),
      makeDependencies({ edges: [] }),
      DEMO_REVISION,
    );
    expect(knownEmpty).toMatchObject({
      availability: 'VALID',
      blockedTaskIds: [],
      byTaskId: {},
    });

    const unknown = identifyBlockedTasks(
      baseTasks(),
      makeDependencies({
        availability: 'NOT_ENABLED',
        edges: null,
        reasonCode: 'FEATURE_NOT_ENABLED',
      }),
      DEMO_REVISION,
    );
    expect(unknown).toMatchObject({
      availability: 'NOT_ENABLED',
      blockedTaskIds: null,
      byTaskId: null,
      reasonCode: 'FEATURE_NOT_ENABLED',
    });
  });

  it('does not interpret stale dependency data as a known empty graph', () => {
    const result = identifyBlockedTasks(
      baseTasks(),
      makeDependencies({ sourceRevision: 11 }),
      DEMO_REVISION,
    );
    expect(result.availability).toBe('UNAVAILABLE');
    expect(result.reasonCode).toBe('STALE_RESULT');
    expect(result.blockedTaskIds).toBeNull();
  });

  it('does not add transitive ancestors to a direct blocker reason', () => {
    const tasks = [
      makeTask('A', 'Root', 'NOT_STARTED'),
      makeTask('B', 'Middle', 'NOT_STARTED'),
      makeTask('C', 'Leaf', 'NOT_STARTED'),
    ];
    const edges = [
      { prerequisiteId: 'A' as never, dependentId: 'B' as never },
      { prerequisiteId: 'B' as never, dependentId: 'C' as never },
    ];
    const result = identifyBlockedTasks(
      tasks,
      makeDependencies({ edges: edges as never }),
      DEMO_REVISION,
    );
    expect(
      result.byTaskId?.[asTaskId('C')]?.incompletePrerequisites.map((item) => item.taskId),
    ).toEqual(['B']);
    expect(baseEdges).toHaveLength(4);
  });

  it('returns known-empty results for an empty task universe', () => {
    const result = identifyBlockedTasks(
      [],
      makeDependencies({ availability: 'NO_TASKS', edges: [] }),
      DEMO_REVISION,
    );
    expect(result).toMatchObject({
      availability: 'NO_TASKS',
      blockedTaskIds: [],
      byTaskId: {},
    });
  });
});
