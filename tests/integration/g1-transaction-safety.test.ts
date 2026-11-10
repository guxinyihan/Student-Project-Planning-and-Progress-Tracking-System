import { setImmediate as nextTurn } from 'node:timers/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { asDependencyId, asProjectId, asTaskId } from '@group9/shared';
import type {
  BatchCapability,
  OperationCapability,
  TaskNameCapability,
} from '../../src/backend/application/unit-of-work.js';
import {
  commandBatch,
  commandInsert,
  commandName,
  createHarnessFixture,
  openOwnedDisposable,
  revision,
  sourceState,
} from '../fixtures/g1-b2-disposable-database.js';

type Fixture = ReturnType<typeof createHarnessFixture>;
const fixtures: Fixture[] = [];
function fixture(options: Parameters<typeof createHarnessFixture>[0] = {}) {
  const result = createHarnessFixture(options);
  fixtures.push(result);
  return result;
}
function nameFixture(handler: (capability: TaskNameCapability) => unknown) {
  return fixture({ handlers: { 'F2-07': (capability) => handler(capability as TaskNameCapability) } });
}
function edge(id: string, from: string, to: string) {
  return {
    dependencyId: asDependencyId(id),
    prerequisiteId: asTaskId(from),
    dependentId: asTaskId(to),
  };
}
function expectClosed(operation: () => unknown) {
  expect(operation).toThrow(expect.objectContaining({ code: 'TRANSACTION_CLOSED' }));
}

afterEach(() => {
  for (const item of fixtures.splice(0)) item.close();
});

describe('TX-01 transaction lifetime and async regression', () => {
  it('TX01-T01 rolls back staged work and rejects late capability use without unhandled rejection', async () => {
    let continuation: Promise<void> | undefined;
    let lateError: unknown;
    const f = nameFixture((capability) => {
      capability.stageTaskAllowedFields({ name: 'immediate' });
      continuation = Promise.resolve().then(() => {
        try {
          capability.stageTaskAllowedFields({ name: 'late' });
        } catch (error) {
          lateError = error;
          throw error;
        }
      });
      return continuation;
    });
    const before = sourceState(f.sqlite);
    const unhandled: unknown[] = [];
    const listener = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', listener);
    try {
      expect(() => f.dispatcher.dispatch(commandName())).toThrow('must be synchronous');
      await nextTurn();
      expect(continuation).toBeInstanceOf(Promise);
      expect(lateError).toMatchObject({ code: 'TRANSACTION_CLOSED' });
      expect(unhandled).toEqual([]);
      expect(sourceState(f.sqlite)).toEqual(before);
    } finally {
      process.off('unhandledRejection', listener);
    }
  });

  it('TX01-T02 retained name capability cannot write after a successful transaction', () => {
    let retained: TaskNameCapability | undefined;
    const f = nameFixture((capability) => {
      retained = capability;
      capability.stageTaskAllowedFields({ name: 'committed' });
    });
    const result = f.dispatcher.dispatch(commandName('committed'));
    expect(result).toMatchObject({ revision: 2, value: { taskId: 'A', name: 'committed' } });
    const committed = sourceState(f.sqlite);
    expectClosed(() => retained!.stageTaskAllowedFields({ name: 'late' }));
    expect(sourceState(f.sqlite)).toEqual(committed);
  });

  it('TX01-T03 the dependency capability grants no read and neither intent works after closure', () => {
    let retained: BatchCapability | undefined;
    const f = fixture({ handlers: { 'F3-06': (capability) => {
      retained = capability as BatchCapability;
      expect(Object.keys(retained)).toEqual(['stageDependencyInsert', 'stageDependencyRemove']);
      retained.stageDependencyRemove();
      retained.stageDependencyInsert();
    } } });
    const result = f.dispatcher.dispatch(commandBatch([edge('L2', 'A', 'B')], ['L1']));
    expect(result).toMatchObject({ revision: 2, value: { inserted: ['L2'], removed: ['L1'] } });
    const committed = sourceState(f.sqlite);
    expectClosed(() => retained!.stageDependencyInsert());
    expectClosed(() => retained!.stageDependencyRemove());
    expect(sourceState(f.sqlite)).toEqual(committed);
  });

  it('TX01-T04 a thrown handler rolls back staged work and invalidates the retained capability', () => {
    let retained: TaskNameCapability | undefined;
    const f = nameFixture((capability) => {
      retained = capability;
      capability.stageTaskAllowedFields({ name: 'rollback' });
      throw new Error('injected handler failure');
    });
    const before = sourceState(f.sqlite);
    expect(() => f.dispatcher.dispatch(commandName())).toThrow('injected handler failure');
    expectClosed(() => retained!.readTaskToUpdateFields());
    expect(sourceState(f.sqlite)).toEqual(before);
    expect(f.uow.diagnostics()).toMatchObject([{ outcome: 'ROLLED_BACK' }]);
  });

  it('TX01-T05 custom PromiseLike assimilation sees inactive capabilities and rejects safely', async () => {
    let ran = false;
    let lateError: unknown;
    const f = nameFixture((capability) => {
      capability.stageTaskAllowedFields({ name: 'rollback' });
      return {
        then(_resolve: (value: unknown) => void, reject: (reason: unknown) => void) {
          ran = true;
          try {
            capability.stageTaskAllowedFields({ name: 'late' });
          } catch (error) {
            lateError = error;
            reject(error);
          }
        },
      };
    });
    const before = sourceState(f.sqlite);
    expect(() => f.dispatcher.dispatch(commandName())).toThrow('must be synchronous');
    await nextTurn();
    expect(ran).toBe(true);
    expect(lateError).toMatchObject({ code: 'TRANSACTION_CLOSED' });
    expect(sourceState(f.sqlite)).toEqual(before);
  });

  it('TX01-T06 a valid synchronous two-record dependency batch increments exactly once', () => {
    const f = fixture();
    const before = sourceState(f.sqlite);
    const result = f.dispatcher.dispatch(commandBatch([edge('L2', 'B', 'C'), edge('L3', 'A', 'C')], []));
    expect(result).toMatchObject({
      projectId: 'P1',
      revision: 2,
      value: { inserted: ['L2', 'L3'], removed: [] },
      savedChange: { revision: 2, changeKind: 'F3-06' },
    });
    expect(sourceState(f.sqlite).task_dependencies).toMatchObject([
      { dependency_id: 'L1', project_id: 'P1', prerequisite_id: 'A', dependent_id: 'B' },
      { dependency_id: 'L2', project_id: 'P1', prerequisite_id: 'B', dependent_id: 'C' },
      { dependency_id: 'L3', project_id: 'P1', prerequisite_id: 'A', dependent_id: 'C' },
    ]);
    expect(sourceState(f.sqlite).tasks).toEqual(before.tasks);
    expect(revision(f.sqlite)).toBe(2);
    expect(revision(f.sqlite, 'P2')).toBe(1);
  });

  it('TX01-T07 commit exception invalidates capabilities and confirms rollback', () => {
    let retained: TaskNameCapability | undefined;
    const f = fixture({
      handlers: { 'F2-07': (capability) => {
        retained = capability as TaskNameCapability;
        retained.stageTaskAllowedFields({ name: 'mustrollback' });
      } },
      hooks: (sqlite) => ({ commit: () => {
        expect(sqlite.inTransaction).toBe(true);
        expect(sqlite.prepare("SELECT name FROM tasks WHERE task_id='A'").get()).toEqual({ name: 'mustrollback' });
        throw new Error('injected commit failure');
      } }),
    });
    const before = sourceState(f.sqlite);
    expect(() => f.dispatcher.dispatch(commandName())).toThrow('injected commit failure');
    expectClosed(() => retained!.readTaskToUpdateFields());
    expect(sourceState(f.sqlite)).toEqual(before);
    expect(f.sqlite.inTransaction).toBe(false);
    expect(f.uow.diagnostics()).toMatchObject([{ outcome: 'ROLLED_BACK' }]);
  });

  it('TX01-T07 rollback exception leaves outcome unknown and prevents capability or connection reuse', () => {
    let retained: TaskNameCapability | undefined;
    const f = fixture({
      handlers: { 'F2-07': (capability) => {
        retained = capability as TaskNameCapability;
        retained.stageTaskAllowedFields({ name: 'mustrollback' });
      } },
      hooks: () => ({
        beforeCommit: () => { throw new Error('injected transaction failure'); },
        rollback: () => { throw new Error('injected rollback failure'); },
      }),
    });
    const before = sourceState(f.sqlite);
    expect(() => f.dispatcher.dispatch(commandName())).toThrow(expect.objectContaining({
      code: 'UNKNOWN_TRANSACTION_OUTCOME',
      outcome: 'UNKNOWN',
      diagnostic: expect.objectContaining({ outcome: 'UNKNOWN' }),
      cause: expect.any(AggregateError),
    }));
    expectClosed(() => retained!.readTaskToUpdateFields());
    expect(f.sqlite.open).toBe(false);
    expectClosed(() => f.dispatcher.dispatch(commandName()));
    expect(f.uow.diagnostics()).toMatchObject([{ outcome: 'UNKNOWN' }]);
    const reopened = openOwnedDisposable(f.filename, { readonly: true });
    try {
      expect(sourceState(reopened)).toEqual(before);
    } finally {
      reopened.close();
    }
  });
});

describe('TX-01 defensive thenable inspection', () => {
  it('TX01-T05 rejects a callable-then Proxy even when its has trap hides then', async () => {
    let lateError: unknown;
    const f = nameFixture((capability) => {
      capability.stageTaskAllowedFields({ name: 'rollback' });
      const promise = Promise.resolve().then(() => {
        try {
          capability.stageTaskAllowedFields({ name: 'late' });
        } catch (error) {
          lateError = error;
          throw error;
        }
      });
      return new Proxy(promise, {
        has: () => false,
        get: (target, key) => key === 'then' ? target.then.bind(target) : Reflect.get(target, key),
      });
    });
    const before = sourceState(f.sqlite);
    const unhandled: unknown[] = [];
    const listener = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', listener);
    try {
      expect(() => f.dispatcher.dispatch(commandName())).toThrow('must be synchronous');
      await nextTurn();
      expect(lateError).toMatchObject({ code: 'TRANSACTION_CLOSED' });
      expect(unhandled).toEqual([]);
      expect(sourceState(f.sqlite)).toEqual(before);
    } finally {
      process.off('unhandledRejection', listener);
    }
  });

  it('TX01-T05 invalidates before inspecting a throwing then getter and rolls back', () => {
    let retained: TaskNameCapability | undefined;
    const f = nameFixture((capability) => {
      retained = capability;
      capability.stageTaskAllowedFields({ name: 'rollback' });
      return Object.defineProperty({}, 'then', {
        get() {
          expectClosed(() => capability.readTaskToUpdateFields());
          throw new Error('injected then getter failure');
        },
      });
    });
    const before = sourceState(f.sqlite);
    expect(() => f.dispatcher.dispatch(commandName())).toThrow('injected then getter failure');
    expectClosed(() => retained!.readTaskToUpdateFields());
    expect(sourceState(f.sqlite)).toEqual(before);
  });
});

describe('TX-02 operation-scoped capabilities with private coordinator control', () => {
  it('TX02-T01 P1 cannot modify a TaskId from P2; both projects unchanged', () => {
    const f = fixture();
    const before = sourceState(f.sqlite);
    expect(() => f.dispatcher.dispatch(commandName('forbidden', 1, 'X'))).toThrow(expect.objectContaining({
      code: 'INVALID_OR_INACCESSIBLE_TASK',
    }));
    expect(sourceState(f.sqlite)).toEqual(before);
  });

  it('TX02-T02 P1 cannot insert a dependency pointing at P2', () => {
    const f = fixture();
    const before = sourceState(f.sqlite);
    expect(() => f.dispatcher.dispatch(commandInsert('L2', 'A', 'X'))).toThrow(expect.objectContaining({
      code: 'INVALID_INPUT',
      message: 'Complete final dependency graph rejected (MISSING_ENDPOINT).',
    }));
    expect(sourceState(f.sqlite)).toEqual(before);
  });

  it('TX02-T03 handlers receive only frozen exact capabilities and plain DTO values', () => {
    function expectSurface(capability: OperationCapability, allowed: string[]) {
      expect(Object.keys(capability)).toEqual(allowed);
      expect(Object.isFrozen(capability)).toBe(true);
      for (const key of [
        'database', 'sqlite', 'orm', 'prepare', 'exec', 'transaction',
        'commit', 'rollback', 'begin', 'management', 'dependencies',
      ]) {
        expect(key in capability).toBe(false);
      }
    }
    const f = fixture({ handlers: {
      'F2-07': (capability) => {
        expectSurface(capability, ['readTaskToUpdateFields', 'stageTaskAllowedFields']);
        const nameCapability = capability as TaskNameCapability;
        const value = nameCapability.readTaskToUpdateFields();
        expect(value).toEqual({ taskId: 'A', name: 'Synthetic A' });
        expect(Object.isFrozen(value)).toBe(true);
        expect(Object.values(value).every((field) => typeof field === 'string')).toBe(true);
        nameCapability.stageTaskAllowedFields({ name: 'plain' });
      },
      'F3-06': (capability) => {
        expectSurface(capability, ['stageDependencyInsert', 'stageDependencyRemove']);
        const batch = capability as BatchCapability;
        batch.stageDependencyRemove();
        batch.stageDependencyInsert();
      },
    } });
    const nameResult = f.dispatcher.dispatch(commandName('plain'));
    expect(nameResult.value).toEqual({ taskId: 'A', name: 'plain' });
    expect(Object.isFrozen(nameResult.value)).toBe(true);
    const batchResult = f.dispatcher.dispatch(commandBatch([edge('L2', 'A', 'B')], ['L1'], 2));
    expect(batchResult.value).toEqual({ inserted: ['L2'], removed: ['L1'] });
    expect(Object.isFrozen(batchResult.value)).toBe(true);
  });

  it('TX02-T04 an active handler has no independent commit and its attempted use rolls back', () => {
    const handler = vi.fn((capability: TaskNameCapability) => {
      capability.stageTaskAllowedFields({ name: 'mustrollback' });
      expect('exec' in capability).toBe(false);
      (capability as unknown as { exec(): void }).exec();
    });
    const f = nameFixture(handler);
    const before = sourceState(f.sqlite);
    expect(() => f.dispatcher.dispatch(commandName())).toThrow(TypeError);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(sourceState(f.sqlite)).toEqual(before);
    expect(f.uow.diagnostics()).toMatchObject([{ outcome: 'ROLLED_BACK' }]);
  });

  it('TX02-T05 a caught intent denial cannot turn a partially staged batch into success', () => {
    const caught = vi.fn();
    const f = fixture({ handlers: { 'F3-06': (capability) => {
      const batch = capability as BatchCapability;
      try {
        batch.stageDependencyRemove();
      } catch (error) {
        caught(error);
      }
      expectClosed(() => batch.stageDependencyInsert());
    } } });
    const before = sourceState(f.sqlite);
    expect(() => f.dispatcher.dispatch(commandBatch([edge('L2', 'A', 'B')], ['L1', 'missing']))).toThrow(
      expect.objectContaining({ code: 'INVALID_OR_INACCESSIBLE_REFERENCE' }),
    );
    expect(caught).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ code: 'INVALID_OR_INACCESSIBLE_REFERENCE' }),
    );
    expect(sourceState(f.sqlite)).toEqual(before);
    expect(f.uow.diagnostics()).toMatchObject([{ outcome: 'ROLLED_BACK' }]);
  });

  it('TX02-T06 rejects mixed operation input and commits a legal edge replacement with one revision', () => {
    const f = fixture();
    const before = sourceState(f.sqlite);
    const rename = commandName('newA');
    expect(() => f.dispatcher.dispatch({
      ...rename,
      payload: { ...rename.payload, inserts: [edge('L2', 'A', 'B')] },
    })).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
    expect(sourceState(f.sqlite)).toEqual(before);

    const result = f.dispatcher.dispatch(commandBatch([edge('L2', 'A', 'B')], ['L1']));
    expect(result).toMatchObject({ projectId: 'P1', revision: 2, value: { inserted: ['L2'], removed: ['L1'] } });
    expect(sourceState(f.sqlite).task_dependencies).toMatchObject([
      { dependency_id: 'L2', project_id: 'P1', prerequisite_id: 'A', dependent_id: 'B' },
    ]);
    expect(sourceState(f.sqlite).tasks).toEqual(before.tasks);
    expect(revision(f.sqlite)).toBe(2);
    expect(revision(f.sqlite, 'P2')).toBe(1);
  });

  it('TX02-T07 alternate project fields and changing caller input cannot rebind scope', () => {
    const requested = { ...commandName('scopedP1') };
    const renameHandler = vi.fn((capability: TaskNameCapability) => {
      requested.projectId = asProjectId('P2');
      capability.stageTaskAllowedFields({ name: 'scopedP1' });
    });
    const f = nameFixture(renameHandler);
    const before = sourceState(f.sqlite);
    const insert = commandInsert('L2', 'B', 'C');
    expect(() => f.dispatcher.dispatch({
      ...insert,
      payload: { ...insert.payload, projectId: 'P2' },
    })).toThrow(expect.objectContaining({ code: 'INVALID_INPUT', message: 'Unexpected input field.' }));
    expect(sourceState(f.sqlite)).toEqual(before);
    const result = f.dispatcher.dispatch(requested);
    expect(renameHandler).toHaveBeenCalledTimes(1);
    expect(requested.projectId).toBe('P2');
    expect(result).toMatchObject({ projectId: 'P1', revision: 2, value: { taskId: 'A', name: 'scopedP1' } });
    expect(f.sqlite.prepare("SELECT name FROM tasks WHERE task_id='A' AND project_id='P1'").get()).toEqual({ name: 'scopedP1' });
    expect(revision(f.sqlite)).toBe(2);
    expect(revision(f.sqlite, 'P2')).toBe(1);
  });

  it('TX02-T08 trusted policy and active membership are checked before granting write capability', () => {
    const handler = vi.fn();
    const f = fixture({ f3Enabled: false, handlers: { 'F3-04': handler } });
    const before = sourceState(f.sqlite);
    expect(() => f.dispatcher.dispatch(commandInsert())).toThrow(
      expect.objectContaining({ code: 'FEATURE_NOT_ENABLED' }),
    );
    expect(sourceState(f.sqlite)).toEqual(before);

    f.state.f3Enabled = true;
    f.sqlite.prepare("UPDATE project_members SET active=0,left_at='2026-11-03T01:00:00Z' WHERE member_id='M1'").run();
    const inactive = sourceState(f.sqlite);
    expect(() => f.dispatcher.dispatch(commandInsert())).toThrow(
      expect.objectContaining({ code: 'INVALID_OR_INACCESSIBLE_PROJECT' }),
    );
    expect(handler).not.toHaveBeenCalled();
    expect(sourceState(f.sqlite)).toEqual(inactive);
  });
});
