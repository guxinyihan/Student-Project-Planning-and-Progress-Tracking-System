import { describe, expect, it } from 'vitest';
import {
  asMemberId, asNoteId, asProjectId, asTaskId, asUserId,
  type MembershipRecord, type ProjectView, type TaskSnapshot,
} from '@group9/shared';
import {
  TestOnlyManagementUnitOfWork,
  type TestOnlyManagementPlan,
  type TestOnlyManagementState,
} from '../fixtures/int07-management-uow.js';

const projectA = asProjectId('scope-a');
const projectB = asProjectId('scope-b');
const alice = asUserId('user-alice');
const bob = asUserId('user-bob');
const now = '2026-11-01T00:00:00Z';
const input = { actorId: alice, projectId: projectA, expectedRevision: 7 };

function project(projectId: typeof projectA, revision: number): ProjectView {
  return {
    projectId, revision, name: `Project ${projectId}`, description: null,
    plannedStartDate: null, projectDeadline: null, createdAt: now, updatedAt: now,
  };
}

function member(projectId: typeof projectA, id: string, userId = alice): MembershipRecord {
  return {
    projectId, memberId: asMemberId(id), userId, role: 'LEADER', active: true,
    leftAt: null, createdAt: now, updatedAt: now,
  };
}

function task(projectId: typeof projectA, id: string): TaskSnapshot {
  return {
    projectId, taskId: asTaskId(id), name: id, description: 'Keep this description',
    assigneeId: asMemberId('same-member-id'), durationDays: '0.10', status: 'IN_PROGRESS',
    taskDeadline: '2026-12-01', createdAt: now, updatedAt: now,
  };
}

function fixture() {
  const state: TestOnlyManagementState = {
    projects: [project(projectA, 7), project(projectB, 31)],
    memberships: [member(projectB, 'same-member-id', bob), member(projectA, 'leader-a')],
    tasks: [task(projectA, 'task-a'), task(projectB, 'task-b')],
    notes: [
      { noteId: asNoteId('note-a'), taskId: asTaskId('task-a'), authorMemberId: asMemberId('leader-a'), text: 'Keep A note', createdAt: now },
      { noteId: asNoteId('note-b'), taskId: asTaskId('task-b'), authorMemberId: asMemberId('same-member-id'), text: 'Keep B note', createdAt: now },
    ],
  };
  return { state, uow: new TestOnlyManagementUnitOfWork(state) };
}

function runCandidate(state: TestOnlyManagementState) {
  const found = state.projects.find(item => item.projectId === projectA);
  if (!found) throw new Error('Missing local project in fixture.');
  return {
    project: { ...found, revision: found.revision + 1 },
    memberships: state.memberships, tasks: state.tasks, notes: state.notes,
    changeKind: 'TEST_PLAN', affectedTaskIds: [asTaskId('task-a')], changedFields: ['test'],
  };
}

function foreignState(state: TestOnlyManagementState) {
  const taskIds = new Set(state.tasks.filter(t => t.projectId === projectB).map(t => t.taskId));
  return {
    projects: state.projects.filter(p => p.projectId === projectB),
    memberships: state.memberships.filter(m => m.projectId === projectB),
    tasks: state.tasks.filter(t => t.projectId === projectB),
    notes: state.notes.filter(n => taskIds.has(n.taskId)),
  };
}

function validUpdate(uow: TestOnlyManagementUnitOfWork, expectedRevision = 7) {
  return uow.runForTest({ ...input, expectedRevision }, tx => {
    const plan = runCandidate(tx.state);
    plan.project.name = 'Valid retry';
    return { ...plan, value: plan.project };
  });
}

function bootstrapPlan(id: string): TestOnlyManagementPlan<ProjectView> {
  const created = project(asProjectId(id), 1);
  return {
    project: created, memberships: [member(created.projectId, `${id}-leader`)],
    tasks: [], notes: [], value: created, changeKind: 'PROJECT_CREATED',
    affectedTaskIds: [], changedFields: ['project'],
  };
}

// Ten original Sprint 11 cases, adapted only at the missing service/harness seam.
// These callbacks model DTO commits; no F1 production facade is being introduced.
describe('INT-07 original ownership and rollback regressions', () => {
  it('detaches the bootstrap ProjectView and the ProjectView and TaskSnapshot returned by run', () => {
    const uow = new TestOnlyManagementUnitOfWork({ projects: [], memberships: [], tasks: [], notes: [] });
    const boot = uow.bootstrapForTest(() => bootstrapPlan('scope-a'));
    const bootstrapState = uow.snapshot();
    boot.value.name = 'Caller changed the bootstrap result';
    expect(uow.snapshot()).toStrictEqual(bootstrapState);

    const updated = validUpdate(uow, 1);
    const afterProjectEdit = uow.snapshot();
    updated.value.description = 'Caller changed the update result';
    expect(uow.snapshot()).toStrictEqual(afterProjectEdit);

    uow.runForTest({ ...input, expectedRevision: 2 }, tx => {
      const plan = runCandidate(tx.state);
      const added = member(projectA, 'same-member-id', bob);
      return { ...plan, memberships: [...plan.memberships, added], value: added };
    });
    const createdTask = uow.runForTest({ ...input, expectedRevision: 3 }, tx => {
      const plan = runCandidate(tx.state);
      const added = task(projectA, 'task-a');
      return { ...plan, tasks: [...plan.tasks, added], value: added };
    });
    const beforeCallerEdits = uow.snapshot();
    createdTask.value.name = 'Caller changed the task result';
    bootstrapState.projects[0]!.name = 'Caller changed an earlier snapshot';
    bootstrapState.memberships.length = 0;
    expect(uow.snapshot()).toStrictEqual(beforeCallerEdits);
    expect(uow.snapshot().projects[0]).toMatchObject({ revision: 4, name: 'Valid retry' });
  });

  it('detaches nested DTOs, arrays and callback data without altering either project', () => {
    const f = fixture();
    const retainedTasks: TaskSnapshot[][] = [];
    const result = f.uow.runForTest(input, tx => {
      const plan = runCandidate(tx.state);
      retainedTasks.push(plan.tasks);
      return { ...plan, value: { nested: { project: plan.project, tasks: plan.tasks }, optional: undefined } };
    });
    const committed = f.uow.snapshot();
    expect(result.value).toStrictEqual({
      nested: { project: committed.projects.find(p => p.projectId === projectA), tasks: committed.tasks },
      optional: undefined,
    });
    expect(Object.hasOwn(result.value, 'optional')).toBe(true);
    expect(result.savedChange).toMatchObject({ revision: 8, affectedTaskIds: [asTaskId('task-a')] });
    expect(foreignState(committed)).toStrictEqual(foreignState(f.state));

    result.value.nested.project.description = 'Caller edit';
    result.value.nested.tasks[0]!.name = 'Caller edit to local task';
    result.value.nested.tasks[1]!.name = 'Caller edit to foreign task';
    result.value.nested.tasks.length = 0;
    result.savedChange.changedFields.push('Caller edit to result fields');
    retainedTasks[0]![0]!.description = 'Retained callback edit';
    retainedTasks[0]!.push(...f.state.tasks);
    f.state.projects[0]!.name = 'Caller changed the constructor state';
    f.state.memberships.length = 0;
    expect(f.uow.snapshot()).toStrictEqual(committed);
  });

  it.each(['state', 'result'] as const)('does not publish a run when cloning its %s fails', part => {
    const f = fixture(); const before = f.uow.snapshot();
    const uncloneable = { callback: () => 'not a DTO field' };
    expect(() => f.uow.runForTest(input, tx => {
      const plan = runCandidate(tx.state);
      return {
        ...plan,
        project: part === 'state' ? { ...plan.project, ...uncloneable } : plan.project,
        value: part === 'result' ? { nested: uncloneable } : null,
      };
    })).toThrowError(expect.objectContaining({ name: 'DataCloneError' }));
    expect(f.uow.snapshot()).toStrictEqual(before);
    expect(validUpdate(f.uow).revision).toBe(8);
  });

  it.each(['state', 'result'] as const)('does not publish a bootstrap when cloning its %s fails', part => {
    const f = fixture(); const before = f.uow.snapshot();
    const plan = bootstrapPlan('uncommitted');
    const uncloneable = { callback: () => 'not a DTO field' };
    expect(() => f.uow.bootstrapForTest(() => ({
      ...plan,
      project: part === 'state' ? { ...plan.project, ...uncloneable } : plan.project,
      value: part === 'result' ? { nested: uncloneable } : null,
    }))).toThrowError(expect.objectContaining({ name: 'DataCloneError' }));
    expect(f.uow.snapshot()).toStrictEqual(before);
    expect(f.uow.bootstrapForTest(() => bootstrapPlan('valid-bootstrap')).revision).toBe(1);
  });

  it.each([
    ['symbol-keyed fields', { [Symbol('field')]: 'preserve or reject' }],
    ['non-enumerable fields', Object.defineProperty({}, 'hidden', { value: 'preserve or reject' })],
    ['shared memory', { buffer: new SharedArrayBuffer(8) }],
  ])('rejects result data that cannot be copied independently without loss: %s', (_label, nested) => {
    const f = fixture(); const before = f.uow.snapshot();
    expect(() => f.uow.runForTest(input, tx => ({ ...runCandidate(tx.state), value: { nested } })))
      .toThrowError(expect.objectContaining({ code: 'SAVE_FAILED' }));
    expect(f.uow.snapshot()).toStrictEqual(before);
    expect(validUpdate(f.uow).revision).toBe(8);
  });

  it('preserves both projects on injected failures and accepts the next valid writes', () => {
    const f = fixture(); const before = f.uow.snapshot();
    f.uow.failNextCommit = true;
    expect(() => f.uow.bootstrapForTest(() => bootstrapPlan('failed-bootstrap')))
      .toThrowError(expect.objectContaining({ code: 'SAVE_FAILED' }));
    expect(f.uow.snapshot()).toStrictEqual(before);

    f.uow.failNextCommit = true;
    expect(() => validUpdate(f.uow)).toThrowError(expect.objectContaining({ code: 'SAVE_FAILED' }));
    expect(f.uow.snapshot()).toStrictEqual(before);

    expect(() => f.uow.runForTest(input, tx => {
      const plan = runCandidate(tx.state);
      plan.memberships[0]!.role = 'MEMBER';
      return { ...plan, value: null };
    })).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }));
    expect(f.uow.snapshot()).toStrictEqual(before);
    expect(validUpdate(f.uow).revision).toBe(8);
    expect(f.uow.bootstrapForTest(() => bootstrapPlan('valid-bootstrap')).revision).toBe(1);
    expect(foreignState(f.uow.snapshot())).toStrictEqual(foreignState(before));
  });
});

// Demonstrated constructor gap: the original constructor used structuredClone
// before shape validation, silently dropping these seed-state properties.
describe('INT-07 seed-state copying gap', () => {
  it.each(['symbol-keyed', 'non-enumerable'] as const)('rejects lossy %s seed state before copying', shape => {
    const state = fixture().state;
    if (shape === 'symbol-keyed') Object.assign(state, { [Symbol('field')]: 'must not disappear' });
    else Object.defineProperty(state, 'hidden', { value: 'must not disappear' });
    expect(() => new TestOnlyManagementUnitOfWork(state))
      .toThrowError(expect.objectContaining({ code: 'SAVE_FAILED' }));
  });
});

describe('INT-07 saved-change metadata copying gap', () => {
  it.each(['affectedTaskIds', 'changedFields'] as const)('copies or rejects every own field on %s before publishing', field => {
    for (const shape of ['symbol-keyed', 'non-enumerable'] as const) {
      const f = fixture(); const before = f.uow.snapshot();
      const metadata = [asTaskId('task-a')];
      if (shape === 'symbol-keyed') Object.assign(metadata, { [Symbol('field')]: 'must not disappear' });
      else Object.defineProperty(metadata, 'hidden', { value: 'must not disappear' });
      expect(() => f.uow.runForTest(input, tx => {
        const plan = runCandidate(tx.state);
        plan[field] = metadata;
        return { ...plan, value: null };
      })).toThrowError(expect.objectContaining({ code: 'SAVE_FAILED' }));
      expect(f.uow.snapshot()).toStrictEqual(before);
      expect(validUpdate(f.uow).revision).toBe(8);
    }

    const f = fixture();
    const retained = Object.assign([asTaskId('task-a')], {
      metadata: { optional: undefined, details: ['seed'] },
    });
    const result = f.uow.runForTest(input, tx => {
      const plan = runCandidate(tx.state);
      plan[field] = retained;
      return { ...plan, value: null };
    });
    const committed = f.uow.snapshot();
    const copied = Reflect.get(result.savedChange[field], 'metadata') as typeof retained.metadata;
    expect(Object.hasOwn(result.savedChange[field], 'metadata')).toBe(true);
    expect(copied).toStrictEqual(retained.metadata);
    expect(Object.hasOwn(copied, 'optional')).toBe(true);
    expect(copied).not.toBe(retained.metadata);
    retained.metadata.details.push('Retained callback edit');
    expect(copied.details).toEqual(['seed']);
    copied.details.push('Caller edit');
    expect(retained.metadata.details).toEqual(['seed', 'Retained callback edit']);
    expect(f.uow.snapshot()).toStrictEqual(committed);
  });
});
