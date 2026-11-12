import { describe, expect, it } from 'vitest';
import { asDependencyId, asTaskId } from '@group9/shared';
import { getAssignedTasks } from '../../src/domain/monitoring/assigned.js';
import { identifyBlockedTasks } from '../../src/domain/monitoring/blocked.js';
import { detectOverdueTasks } from '../../src/domain/monitoring/overdue.js';
import { composeWarnings } from '../../src/domain/monitoring/warnings.js';
import {
  AS_OF_DATE,
  DEMO_REVISION,
  PROJECT_TIME_ZONE,
  PROJECT_ID,
  VIEWER_MEMBER_ID,
  makeDependencies,
  makePolicy,
  makeSchedule,
  makeSnapshot,
  makeTask,
} from '../fixtures/f5-f6-fixtures.js';

describe('F5/F6 compatibility with valid opaque task identities', () => {
  it('constructor is not blocked merely because an empty table inherits a property', () => {
    const tasks = [makeTask('constructor', 'Independent opaque identity', 'NOT_STARTED')];
    const snapshot = {
      ...makeSnapshot({ tasks }),
      dependencySource: { availability: 'VALID' as const, links: [] },
    };
    const blocked = identifyBlockedTasks(tasks, makeDependencies({ edges: [] }), DEMO_REVISION);
    const assigned = getAssignedTasks(
      snapshot,
      VIEWER_MEMBER_ID,
      blocked,
      makeSchedule({ criticalTaskIds: [] }),
    );
    expect(blocked.blockedTaskIds).toEqual([]);
    expect(assigned.items[0]).toMatchObject({
      task: { taskId: 'constructor' },
      isBlocked: false,
      incompletePrerequisites: [],
    });
    // A plain JSON-deserialized table must be equally safe at the consumer boundary.
    expect(
      getAssignedTasks(
        snapshot,
        VIEWER_MEMBER_ID,
        { ...blocked, byTaskId: {} },
        makeSchedule({ criticalTaskIds: [] }),
      ).items[0]?.isBlocked,
    ).toBe(false);
  });

  it('__proto__ remains an own record key through JSON and warning composition', () => {
    const tasks = [
      makeTask('P', 'Prerequisite', 'IN_PROGRESS'),
      makeTask('__proto__', 'Dependent opaque identity', 'NOT_STARTED'),
    ];
    const edges = [{ prerequisiteId: asTaskId('P'), dependentId: asTaskId('__proto__') }];
    const snapshot = {
      ...makeSnapshot({ tasks }),
      dependencySource: {
        availability: 'VALID' as const,
        links: [
          { ...edges[0]!, dependencyId: asDependencyId('opaque-edge'), projectId: PROJECT_ID },
        ],
      },
    };
    const blocked = identifyBlockedTasks(tasks, makeDependencies({ edges }), DEMO_REVISION);
    expect(Object.hasOwn(blocked.byTaskId!, '__proto__')).toBe(true);
    const serialized = JSON.parse(JSON.stringify(blocked)) as typeof blocked;
    expect(serialized.byTaskId?.[asTaskId('__proto__')]?.incompletePrerequisites).toEqual([
      { taskId: 'P', name: 'Prerequisite', rawStatus: 'IN_PROGRESS' },
    ]);
    const schedule = makeSchedule({ criticalTaskIds: ['__proto__'], estimatedProjectFinish: null });
    const assigned = getAssignedTasks(snapshot, VIEWER_MEMBER_ID, serialized, schedule);
    expect(assigned.items[1]).toMatchObject({ isBlocked: true, isCritical: true });
    const policy = makePolicy();
    const options = { projectTimeZone: PROJECT_TIME_ZONE };
    const overdue = detectOverdueTasks(tasks, AS_OF_DATE, DEMO_REVISION, policy, options);
    const warnings = composeWarnings(snapshot, schedule, serialized, overdue, policy, options);
    expect(warnings.items?.find((item) => item.type === 'BLOCKED_CRITICAL_TASK')).toMatchObject({
      taskId: '__proto__',
      prerequisiteIds: ['P'],
    });
    // A missing own entry cannot be supplied by Object.prototype either.
    const malformed = composeWarnings(
      snapshot,
      schedule,
      { ...serialized, byTaskId: {} },
      overdue,
      policy,
      options,
    );
    expect(malformed.evaluationByType?.BLOCKED_CRITICAL_TASK.availability).toBe('UNAVAILABLE');
    expect(malformed.items?.some((item) => item.type === 'BLOCKED_CRITICAL_TASK')).toBe(false);
  });
});
