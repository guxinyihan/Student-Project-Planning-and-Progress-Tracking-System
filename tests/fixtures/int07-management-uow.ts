/**
 * TEST ONLY: compatibility fixture for the isolated F1/F2 INT-07 ownership tests.
 * Never import this file from src or use it as a production transaction adapter.
 * Fixture actor IDs and callback plans provide no production authorization.
 * Real SQLite guarantees remain the responsibility of SourceUnitOfWork tests.
 */
import type {
  MembershipRecord, MutationResult, ProgressNoteView, ProjectId, ProjectView,
  Revision, SavedChange, TaskId, TaskSnapshot, UserId,
} from '@group9/shared';
import { isDeepStrictEqual } from 'node:util';

export interface TestOnlyManagementState {
  projects: ProjectView[];
  memberships: MembershipRecord[];
  tasks: TaskSnapshot[];
  notes: ProgressNoteView[];
}

/** This callback DTO exists only in tests; it is not a production MutationPlan. */
export interface TestOnlyManagementPlan<T> {
  project: ProjectView;
  memberships: MembershipRecord[];
  tasks: TaskSnapshot[];
  notes: ProgressNoteView[];
  value: T;
  changeKind: string;
  affectedTaskIds: TaskId[];
  changedFields: string[];
}

interface TestOnlyMutationInput {
  actorId: UserId;
  projectId: ProjectId;
  expectedRevision: Revision;
}

function fail(code: 'SAVE_FAILED' | 'INVALID_INPUT' | 'NOT_FOUND' | 'NOT_AUTHORIZED' | 'REVISION_CONFLICT', message: string): never {
  throw Object.assign(new Error(message), { name: 'TestOnlyManagementError', code });
}

function assertExpectedRevision(current: Revision, expected: Revision): void {
  if (!Number.isSafeInteger(expected) || expected < 1) {
    fail('INVALID_INPUT', 'expectedRevision must be a positive safe integer.');
  }
  if (current !== expected) {
    fail('REVISION_CONFLICT', 'Project changed. Reload before saving; keep your draft.');
  }
}

function cloneState(state: TestOnlyManagementState): TestOnlyManagementState {
  return structuredClone(state);
}

// Commit data consists of DTO records and arrays. Reject object shapes whose
// fields or ownership structuredClone cannot preserve.
function assertDtoObjects(value: unknown, seen: WeakSet<object>): void {
  if (value === null || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  const array = Array.isArray(value);
  if (Object.getPrototypeOf(value) !== (array ? Array.prototype : Object.prototype)) {
    fail('SAVE_FAILED', 'The change could not be saved. Existing data was preserved.');
  }
  for (const key of Reflect.ownKeys(value)) {
    if (array && key === 'length') continue;
    const field = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== 'string' || !field?.enumerable || !('value' in field)) {
      fail('SAVE_FAILED', 'The change could not be saved. Existing data was preserved.');
    }
    assertDtoObjects(field.value, seen);
  }
}

function assertPlanProject(
  plan: TestOnlyManagementPlan<unknown>,
  projectId: ProjectId,
  expectedRevision: Revision,
): void {
  if (plan.project.projectId !== projectId) {
    fail('INVALID_INPUT', 'A mutation plan cannot change the bound project.');
  }
  if (plan.project.revision !== expectedRevision) {
    fail('INVALID_INPUT', 'A successful source preview must increment the project revision exactly once.');
  }
}

function assertUnrelatedProjectsPreserved(
  before: TestOnlyManagementState,
  draft: TestOnlyManagementState,
  plan: TestOnlyManagementPlan<unknown>,
  projectId: ProjectId,
): void {
  const foreignTaskIds = new Set(
    before.tasks.filter((task) => task.projectId !== projectId).map((task) => task.taskId),
  );
  const currentTaskIds = new Set(
    [...before.tasks, ...plan.tasks]
      .filter((task) => task.projectId === projectId && !foreignTaskIds.has(task.taskId))
      .map((task) => task.taskId),
  );
  const protectedNoteIds = new Set(
    before.notes.filter((note) => !currentTaskIds.has(note.taskId)).map((note) => note.noteId),
  );
  const unrelatedBefore = {
    projects: before.projects.filter((item) => item.projectId !== projectId),
    memberships: before.memberships.filter((item) => item.projectId !== projectId),
    tasks: before.tasks.filter((item) => item.projectId !== projectId),
    notes: before.notes.filter((item) => !currentTaskIds.has(item.taskId)),
  };
  const unrelatedAfter = {
    projects: draft.projects.filter((item) => item.projectId !== projectId),
    memberships: plan.memberships.filter((item) => item.projectId !== projectId),
    tasks: plan.tasks.filter((item) => item.projectId !== projectId),
    notes: plan.notes.filter((item) => protectedNoteIds.has(item.noteId) || !currentTaskIds.has(item.taskId)),
  };
  if (
    draft.projects.filter((item) => item.projectId === projectId).length !== 1 ||
    !isDeepStrictEqual(unrelatedBefore, unrelatedAfter)
  ) {
    fail('INVALID_INPUT', 'A mutation plan cannot change unrelated project data.');
  }
}

function savedChange<T>(
  plan: TestOnlyManagementPlan<T>,
): SavedChange {
  return {
    projectId: plan.project.projectId,
    revision: plan.project.revision,
    changeKind: plan.changeKind,
    affectedTaskIds: structuredClone(plan.affectedTaskIds),
    changedFields: structuredClone(plan.changedFields),
  };
}

/** Test-scoped clone-and-publish model; no production UnitOfWork interface. */
export class TestOnlyManagementUnitOfWork {
  private state: TestOnlyManagementState;
  public failNextCommit = false;

  constructor(initial: TestOnlyManagementState) {
    // structuredClone otherwise silently omits symbol and non-enumerable fields.
    assertDtoObjects(initial, new WeakSet<object>());
    this.state = cloneState(initial);
  }

  snapshot(): TestOnlyManagementState {
    return cloneState(this.state);
  }

  bootstrapForTest<T>(
    work: (state: TestOnlyManagementState) => TestOnlyManagementPlan<T>,
  ): MutationResult<T> {
    const draft = cloneState(this.state);
    const plan = work(draft);
    if (plan.project.revision !== 1) {
      fail('INVALID_INPUT', 'A newly created project must start at revision 1.');
    }
    if (draft.projects.some((project) => project.projectId === plan.project.projectId)) {
      fail('INVALID_INPUT', 'Project identifier already exists.');
    }

    return this.commit({
      projects: [...this.state.projects, plan.project],
      memberships: [...this.state.memberships, ...plan.memberships],
      tasks: [...this.state.tasks, ...plan.tasks],
      notes: [...this.state.notes, ...plan.notes],
    }, plan);
  }

  runForTest<T>(
    input: TestOnlyMutationInput,
    work: (transaction: { state: TestOnlyManagementState }) => TestOnlyManagementPlan<T>,
  ): MutationResult<T> {
    const project = this.state.projects.find((item) => item.projectId === input.projectId);
    if (!project) fail('NOT_FOUND', 'Project was not found in the accessible context.');

    const actor = this.state.memberships.find(member =>
      member.projectId === input.projectId && member.userId === input.actorId &&
      member.active === true && member.leftAt === null,
    );
    if (!actor) {
      fail('NOT_AUTHORIZED', 'Only an active project member may perform this operation.');
    }

    assertExpectedRevision(project.revision, input.expectedRevision);
    const draft = cloneState(this.state);
    const plan = work({ state: draft });
    assertPlanProject(plan, input.projectId, project.revision + 1);
    assertUnrelatedProjectsPreserved(this.state, draft, plan, input.projectId);

    return this.commit({
      projects: draft.projects.map((item) =>
        item.projectId === plan.project.projectId ? plan.project : item,
      ),
      memberships: plan.memberships,
      tasks: plan.tasks,
      notes: plan.notes,
    }, plan);
  }

  private commit<T>(candidate: TestOnlyManagementState, plan: TestOnlyManagementPlan<T>): MutationResult<T> {
    if (this.failNextCommit) {
      this.failNextCommit = false;
      fail('SAVE_FAILED', 'The change could not be saved. Existing data was preserved.');
    }

    const seen = new WeakSet<object>();
    assertDtoObjects(candidate, seen);
    assertDtoObjects(plan.value, seen);
    assertDtoObjects(plan.affectedTaskIds, seen);
    assertDtoObjects(plan.changedFields, seen);
    const nextState = cloneState(candidate);
    const value = structuredClone(plan.value);
    const result: MutationResult<T> = {
      ok: true,
      projectId: plan.project.projectId,
      revision: plan.project.revision,
      value,
      savedChange: savedChange(plan),
    };

    this.state = nextState;
    return result;
  }
}
