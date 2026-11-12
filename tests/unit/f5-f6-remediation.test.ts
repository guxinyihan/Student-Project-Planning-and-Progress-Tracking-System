import { describe, expect, it } from 'vitest';
import {
  asMemberId,
  asProjectId,
  asUserId,
  type DashboardInput,
  type ProjectSnapshot,
} from '@group9/shared';
import { buildDashboard } from '../../src/domain/monitoring/dashboard.js';
import { composeWarnings } from '../../src/domain/monitoring/warnings.js';
import { calculateProgress } from '../../src/domain/monitoring/progress.js';
import { identifyBlockedTasks } from '../../src/domain/monitoring/blocked.js';
import { detectOverdueTasks } from '../../src/domain/monitoring/overdue.js';
import { getAssignedTasks, MonitoringAccessError } from '../../src/domain/monitoring/assigned.js';
import { calendarDaysBetween } from '../../src/domain/monitoring/common.js';
import {
  AS_OF_DATE,
  DEMO_REVISION,
  PROJECT_TIME_ZONE,
  VIEWER_MEMBER_ID,
  VIEWER_USER_ID,
  makeDependencies,
  makePolicy,
  makeSchedule,
  makeSnapshot,
} from '../fixtures/f5-f6-fixtures.js';

const options = { projectTimeZone: PROJECT_TIME_ZONE };
const foreignProject = asProjectId('FOREIGN');

function input(snapshot = makeSnapshot()): DashboardInput {
  return {
    context: {
      snapshot,
      actorId: VIEWER_USER_ID,
      viewerMemberId: VIEWER_MEMBER_ID,
      asOfDate: AS_OF_DATE,
    },
    dependencies: makeDependencies(),
    schedule: makeSchedule(),
  };
}

function dashboard(policy = makePolicy(), value = input()) {
  const result = buildDashboard(value, policy, options);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('Fixture should produce a dashboard.');
  return result.summary;
}

function warningParts() {
  const snapshot = makeSnapshot();
  return {
    snapshot,
    schedule: makeSchedule(),
    blocked: identifyBlockedTasks(snapshot.tasks, makeDependencies(), DEMO_REVISION),
    overdue: detectOverdueTasks(snapshot.tasks, AS_OF_DATE, DEMO_REVISION, makePolicy(), options),
  };
}

describe('F5/F6 runtime capability remediation', () => {
  it('F3 off discards same-revision VALID edges and preserves unknown Blocked', () => {
    const result = dashboard(makePolicy({ f3Enabled: false }));
    expect(result.blockedResult).toEqual({
      availability: 'NOT_ENABLED',
      sourceRevision: DEMO_REVISION,
      blockedTaskIds: null,
      byTaskId: null,
      reasonCode: 'FEATURE_NOT_ENABLED',
    });
    expect(
      result.notices.find((notice) => notice.capability === 'dependencies')?.message,
    ).toContain('not enabled');
  });

  it('F3 off rejects a same-revision VALID schedule and clears critical/finish data', () => {
    const result = dashboard(makePolicy({ f3Enabled: false }));
    expect(result.schedule).toMatchObject({
      availability: 'UNAVAILABLE',
      reasonCode: 'DEPENDENCY_INPUT_UNAVAILABLE',
      criticalTaskIds: null,
      estimatedProjectFinish: null,
      timings: null,
    });
    expect(result.assignedTasks.items.every((item) => item.isCritical === null)).toBe(true);
    expect(result.notices.find((notice) => notice.capability === 'schedule')?.message).toContain(
      'unavailable',
    );
  });

  it('F3 off retains current overdue facts, progress and raw status', () => {
    const result = dashboard(makePolicy({ f3Enabled: false }));
    expect(result.progress).toMatchObject({
      availability: 'VALID',
      totalTasks: 4,
      completedTasks: 2,
      percentage: 50,
    });
    expect(result.rawStatusCounts).toEqual({ NOT_STARTED: 1, IN_PROGRESS: 1, COMPLETED: 2 });
    expect(result.overdueResult.overdueTaskIds).toEqual(['C']);
    expect(result.warnings.items?.map((item) => item.type)).toEqual(['OVERDUE_TASK']);
  });

  it('F4 off discards VALID schedule but preserves F3 Blocked and overdue', () => {
    const result = dashboard(makePolicy({ f4Enabled: false }));
    expect(result.schedule).toMatchObject({
      availability: 'NOT_ENABLED',
      reasonCode: 'FEATURE_NOT_ENABLED',
      estimatedProjectFinish: null,
    });
    expect(result.blockedResult).toMatchObject({ availability: 'VALID', blockedTaskIds: ['D'] });
    expect(result.assignedTasks.items.every((item) => item.isCritical === null)).toBe(true);
    expect(result.warnings.items?.map((item) => item.type)).toEqual(['OVERDUE_TASK']);
    expect(result.notices.find((notice) => notice.capability === 'schedule')?.message).toContain(
      'not enabled',
    );
  });

  it('both prerequisites enabled retain all three current warning categories', () => {
    const result = dashboard();
    expect(result.schedule.availability).toBe('VALID');
    expect(result.warnings.items?.map((item) => item.type)).toEqual([
      'PROJECT_DEADLINE_CONFLICT',
      'BLOCKED_CRITICAL_TASK',
      'OVERDUE_TASK',
    ]);
  });

  it('F6 off leaves F5 facts available and advertises disabled warnings', () => {
    const result = dashboard(makePolicy({ f6Enabled: false }));
    expect(result.progress.availability).toBe('VALID');
    expect(result.blockedResult.availability).toBe('VALID');
    expect(result.overdueResult.overdueTaskIds).toEqual(['C']);
    expect(result.warnings).toMatchObject({ availability: 'NOT_ENABLED', items: null });
    expect(result.notices.find((notice) => notice.capability === 'warnings')?.message).toContain(
      'not enabled',
    );
  });

  it.each([{ f3Enabled: false }, { f4Enabled: false }])(
    'direct warning composition ignores old VALID analyses with %j',
    (flags) => {
      const { snapshot, schedule, blocked, overdue } = warningParts();
      const result = composeWarnings(
        snapshot,
        schedule,
        blocked,
        overdue,
        makePolicy(flags),
        options,
      );
      expect(result.items?.map((item) => item.type)).toEqual(['OVERDUE_TASK']);
      expect(result.evaluationByType?.BLOCKED_CRITICAL_TASK).toMatchObject({
        availability: 'UNAVAILABLE',
        reasonCode: 'FEATURE_NOT_ENABLED',
      });
      expect(result.evaluationByType?.PROJECT_DEADLINE_CONFLICT).toMatchObject({
        availability: 'UNAVAILABLE',
        reasonCode: 'FEATURE_NOT_ENABLED',
      });
      expect(result.evaluationByType?.OVERDUE_TASK.availability).toBe('VALID');
    },
  );

  it('empty project respects disabled F3/F4/F6 without failing progress', () => {
    const result = dashboard(
      makePolicy({ f3Enabled: false, f4Enabled: false, f6Enabled: false }),
      input(makeSnapshot({ tasks: [] })),
    );
    expect(result.progress).toMatchObject({ availability: 'NO_TASKS', percentage: null });
    expect(result.blockedResult.availability).toBe('NOT_ENABLED');
    expect(result.schedule.availability).toBe('NOT_ENABLED');
    expect(result.warnings.availability).toBe('NOT_ENABLED');
  });

  it('F3 off dominates stale supplied dependencies without exposing a known empty graph', () => {
    const value = input();
    value.dependencies = makeDependencies({ sourceRevision: 11 });
    const result = dashboard(makePolicy({ f3Enabled: false }), value);
    expect(result.blockedResult).toMatchObject({
      availability: 'NOT_ENABLED',
      sourceRevision: DEMO_REVISION,
      blockedTaskIds: null,
      byTaskId: null,
      reasonCode: 'FEATURE_NOT_ENABLED',
    });
  });

  it('unknown dependency facts remain null rather than zero Blocked', () => {
    const value = input();
    value.dependencies = makeDependencies({
      availability: 'UNAVAILABLE',
      edges: null,
      reasonCode: 'DEPENDENCY_INPUT_UNAVAILABLE',
    });
    const result = dashboard(makePolicy(), value);
    expect(result.blockedResult).toMatchObject({
      availability: 'UNAVAILABLE',
      blockedTaskIds: null,
    });
    expect(
      result.assignedTasks.items
        .filter((item) => item.rawStatus !== 'COMPLETED')
        .every((item) => item.isBlocked === null),
    ).toBe(true);
  });

  it('overdue stays independent when both F3/F4 are off', () => {
    const result = dashboard(makePolicy({ f3Enabled: false, f4Enabled: false }));
    expect(result.overdueResult.items).toEqual([{ taskId: 'C', daysOverdue: 3 }]);
    expect(result.warnings.evaluationByType?.OVERDUE_TASK.availability).toBe('VALID');
  });

  it('a stale estimated finish never produces a project deadline warning', () => {
    const value = input();
    value.schedule = makeSchedule({ sourceRevision: 11, estimatedProjectFinish: '9999-12-31' });
    const result = dashboard(makePolicy(), value);
    expect(result.schedule.estimatedProjectFinish).toBeNull();
    expect(result.warnings.items?.some((item) => item.type === 'PROJECT_DEADLINE_CONFLICT')).toBe(
      false,
    );
  });

  it('direct warnings refuse supplied overdue facts when date context is unknown', () => {
    const { snapshot, schedule, blocked, overdue } = warningParts();
    const result = composeWarnings(snapshot, schedule, blocked, overdue, makePolicy(), {
      projectTimeZone: null,
    });
    expect(result.evaluationByType?.OVERDUE_TASK.availability).toBe('UNAVAILABLE');
    expect(result.items?.some((item) => item.type === 'OVERDUE_TASK')).toBe(false);
  });
});

describe('Gregorian calendar-day arithmetic for the LocalDate contract', () => {
  it.each([
    ['0099-12-31', '0100-01-01', 1],
    ['0100-01-01', '0099-12-31', -1],
    ['0001-01-01', '0001-01-02', 1],
    ['0096-02-28', '0096-03-01', 2],
    ['0100-02-28', '0100-03-01', 1],
    ['0400-02-28', '0400-03-01', 2],
    ['2000-02-28', '2000-03-01', 2],
    ['1900-02-28', '1900-03-01', 1],
    ['0001-01-01', '0001-01-01', 0],
    ['2026-10-22', '2026-10-25', 3],
    ['0001-01-01', '9999-12-31', 3652058],
    ['9999-12-31', '0001-01-01', -3652058],
  ] as const)('%s to %s is %i days', (from, to, expected) => {
    expect(calendarDaysBetween(from, to)).toBe(expected);
  });

  it('rejects invalid LocalDate inputs without coercion', () => {
    expect(calendarDaysBetween('0100-02-29', '0100-03-01')).toBeNull();
    expect(calendarDaysBetween('0000-01-01', '0001-01-01')).toBeNull();
  });
});

describe('F5/F6 coherent snapshot boundaries', () => {
  function malformed(name: string): ProjectSnapshot {
    const snapshot = makeSnapshot();
    if (name === 'foreign membership')
      return {
        ...snapshot,
        members: snapshot.members.map((member, index) =>
          index === 1 ? { ...member, projectId: foreignProject } : member,
        ),
      };
    if (name === 'foreign task')
      return {
        ...snapshot,
        tasks: snapshot.tasks.map((task, index) =>
          index === 1 ? { ...task, projectId: foreignProject } : task,
        ),
      };
    if (name === 'duplicate tasks')
      return { ...snapshot, tasks: [...snapshot.tasks, { ...snapshot.tasks[0]! }] };
    if (name === 'active with leftAt')
      return {
        ...snapshot,
        members: snapshot.members.map((member, index) =>
          index === 1 ? { ...member, leftAt: '2026-10-31T00:00:00Z' } : member,
        ),
      };
    return {
      ...snapshot,
      members: snapshot.members.map((member, index) =>
        index === 1 ? { ...member, active: false, leftAt: null } : member,
      ),
    };
  }

  it.each([
    'foreign membership',
    'foreign task',
    'duplicate tasks',
    'active with leftAt',
    'inactive without leftAt',
  ])('dashboard returns a safe source failure for %s', (name) => {
    const result = buildDashboard(input(malformed(name)), makePolicy(), options);
    expect(result).toEqual({
      ok: false,
      error: {
        code: 'SOURCE_UNAVAILABLE',
        message: 'The project source could not be read consistently. Try again.',
      },
    });
  });

  it.each([
    'foreign membership',
    'foreign task',
    'duplicate tasks',
    'active with leftAt',
    'inactive without leftAt',
  ])('standalone assignment projection rejects incoherent %s', (name) => {
    const { blocked, schedule } = warningParts();
    expect(() => getAssignedTasks(malformed(name), VIEWER_MEMBER_ID, blocked, schedule)).toThrow(
      TypeError,
    );
  });

  it.each(['foreign viewer', 'departed viewer', 'wrong actor', 'UserId as Membership ID'])(
    'dashboard denies %s without disclosing existence',
    (name) => {
      const value = input();
      if (name === 'foreign viewer')
        value.context.snapshot = {
          ...value.context.snapshot,
          members: value.context.snapshot.members.map((member) => ({
            ...member,
            projectId: foreignProject,
          })),
        };
      if (name === 'departed viewer')
        value.context.snapshot = {
          ...value.context.snapshot,
          members: value.context.snapshot.members.map((member) => ({
            ...member,
            leftAt: '2026-10-31T00:00:00Z',
          })),
        };
      if (name === 'wrong actor') value.context.actorId = asUserId('OTHER');
      if (name === 'UserId as Membership ID')
        value.context.viewerMemberId = asMemberId(VIEWER_USER_ID);
      expect(buildDashboard(value, makePolicy(), options)).toEqual({
        ok: false,
        error: {
          code: 'INVALID_OR_INACCESSIBLE_PROJECT',
          message: 'Invalid or inaccessible project.',
        },
      });
    },
  );

  it.each(['foreign viewer', 'departed viewer'])('standalone assignments deny %s', (name) => {
    const snapshot = makeSnapshot();
    const invalid = {
      ...snapshot,
      members: snapshot.members.map((member) =>
        name === 'foreign viewer'
          ? { ...member, projectId: foreignProject }
          : { ...member, leftAt: '2026-10-31T00:00:00Z' },
      ),
    };
    const { blocked, schedule } = warningParts();
    expect(() => getAssignedTasks(invalid, VIEWER_MEMBER_ID, blocked, schedule)).toThrow(
      MonitoringAccessError,
    );
  });

  it.each(['duplicate tasks', 'foreign task'])(
    'standalone F5 derivations reject %s rather than misleading counts',
    (name) => {
      const tasks = malformed(name).tasks;
      expect(() => calculateProgress(tasks, DEMO_REVISION)).toThrow(TypeError);
      expect(() => identifyBlockedTasks(tasks, makeDependencies(), DEMO_REVISION)).toThrow(
        TypeError,
      );
      expect(() =>
        detectOverdueTasks(tasks, AS_OF_DATE, DEMO_REVISION, makePolicy(), options),
      ).toThrow(TypeError);
    },
  );

  it.each([
    'foreign membership',
    'foreign task',
    'duplicate tasks',
    'active with leftAt',
    'inactive without leftAt',
  ])('standalone warning composition rejects %s', (name) => {
    const { blocked, schedule, overdue } = warningParts();
    expect(() =>
      composeWarnings(malformed(name), schedule, blocked, overdue, makePolicy(), options),
    ).toThrow(TypeError);
  });
});
