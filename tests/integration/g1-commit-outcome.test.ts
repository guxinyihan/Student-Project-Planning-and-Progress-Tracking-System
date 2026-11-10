import { afterEach, describe, expect, it } from 'vitest';
import { asUserId } from '@group9/shared';
import { createSourceUnitOfWork } from '../../src/backend/persistence/source-unit-of-work.js';
import { createOperationDispatcher } from '../../src/backend/application/operation-dispatcher.js';
import { UnknownTransactionOutcomeError, type TaskNameCapability } from '../../src/backend/application/unit-of-work.js';
import { commandName, createHarnessFixture, openOwnedDisposable, revision, sourceState } from '../fixtures/g1-b2-disposable-database.js';

const fixtures: ReturnType<typeof createHarnessFixture>[] = [];
const fixture = (options: Parameters<typeof createHarnessFixture>[0] = {}) => { const f = createHarnessFixture(options); fixtures.push(f); return f; };
afterEach(() => { for (const f of fixtures.splice(0)) f.close(); });
function unknownOf(action: () => unknown): UnknownTransactionOutcomeError {
  let caught: unknown; try { action(); } catch (error) { caught = error; }
  expect(caught).toBeInstanceOf(UnknownTransactionOutcomeError);
  expect(caught).toMatchObject({ code: 'UNKNOWN_TRANSACTION_OUTCOME', outcome: 'UNKNOWN', diagnostic: { outcome: 'UNKNOWN' } });
  expect(caught).not.toHaveProperty('savedChange'); expect(caught).not.toHaveProperty('ok', true);
  return caught as UnknownTransactionOutcomeError;
}
describe('G1-A internal COMMIT outcome, diagnostics and closure', () => {
  it('returns a confirmed commit once, with no premature success diagnostic during COMMIT', () => {
    let f: ReturnType<typeof createHarnessFixture>; let commits = 0;
    f = fixture({ hooks: (sqlite) => ({ commit: () => {
      expect(f.uow.diagnostics()).toEqual([]); commits++; sqlite.exec('COMMIT');
    } }) });
    const result = f.dispatcher.dispatch(commandName()); expect(result.ok).toBe(true); expect(result.revision).toBe(2); expect(commits).toBe(1);
    expect(f.uow.diagnostics()).toMatchObject([{ outcome: 'COMMITTED' }]);
  });
  it('reports confirmed rollback for a COMMIT failure while SQLite still has an open transaction', () => {
    let commits = 0;
    const f = fixture({ hooks: () => ({ commit: () => { commits++; throw new Error('COMMIT rejected before execution'); } }) });
    const before = sourceState(f.sqlite);
    expect(() => f.dispatcher.dispatch(commandName())).toThrow('COMMIT rejected');
    expect(commits).toBe(1); expect(f.sqlite.inTransaction).toBe(false); expect(f.sqlite.open).toBe(true); expect(sourceState(f.sqlite)).toEqual(before);
    expect(f.uow.diagnostics()).toMatchObject([{ outcome: 'ROLLED_BACK' }]);
  });
  it('retains UNKNOWN after actual COMMIT followed by lost acknowledgement, without retry or a fabricated rollback', () => {
    let commits = 0; let retained!: TaskNameCapability;
    const f = fixture({ handlers: { 'F2-07': (cap) => { retained = cap as TaskNameCapability; retained.stageTaskAllowedFields({ name: 'Committed but acknowledgement lost' }); } }, hooks: (sqlite) => ({ commit: () => {
      commits++; sqlite.exec('COMMIT'); throw new Error('Controlled lost COMMIT acknowledgement');
    } }) });
    const error = unknownOf(() => f.dispatcher.dispatch(commandName()));
    expect(error.cause).toBeInstanceOf(Error); expect(commits).toBe(1); expect(f.sqlite.open).toBe(false);
    expect(f.uow.diagnostics()).toMatchObject([{ outcome: 'UNKNOWN' }]); expect(Object.isFrozen(error.diagnostic)).toBe(true);
    expect(() => retained.stageTaskAllowedFields({ name: 'Escaped retry' })).toThrow();
    expect(() => f.dispatcher.dispatch(commandName())).toThrow(); expect(commits).toBe(1);
    const owned = openOwnedDisposable(f.filename, { readonly: true });
    try {
      expect(revision(owned)).toBe(2); expect(owned.prepare('SELECT name FROM tasks WHERE task_id=?').get('A')).toEqual({ name: 'Committed but acknowledgement lost' });
    } finally { owned.close(); }
  });
  it('retains UNKNOWN and quarantines on rollback failure instead of asserting unchanged durable state', () => {
    let rollbackCalls = 0; let retained!: TaskNameCapability;
    const f = fixture({ handlers: { 'F2-07': (cap) => { retained = cap as TaskNameCapability; retained.stageTaskAllowedFields({ name: 'Staged before fault' }); } }, hooks: () => ({
      beforeCommit: () => { throw new Error('Controlled primary failure'); },
      rollback: () => { rollbackCalls++; throw new Error('Controlled rollback failure'); },
    }) });
    const error = unknownOf(() => f.dispatcher.dispatch(commandName())); expect(rollbackCalls).toBe(1); expect(error.cause).toBeInstanceOf(AggregateError);
    expect(f.sqlite.open).toBe(false); expect(() => retained.readTaskToUpdateFields()).toThrow();
    // A fresh coordinator around the same quarantined connection cannot bypass the gate.
    const next = createOperationDispatcher(createSourceUnitOfWork(f.sqlite, { authority: { resolveActor: () => asUserId('U1'), runtimePolicy: () => ({ f3Enabled: true, f4Enabled: false, f6Enabled: false, datePolicy: 'UNRESOLVED' }) } }));
    expect(() => next.dispatch(commandName())).toThrow(); expect(rollbackCalls).toBe(1);
    expect(f.uow.diagnostics()).toMatchObject([{ outcome: 'UNKNOWN' }]);
  });
  it('does not call an early committed transaction definitely rolled back when a later hook fails', () => {
    const f = fixture({ hooks: (sqlite) => ({ beforeCommit: () => {
      sqlite.exec('COMMIT'); throw new Error('Controlled hook committed before reporting failure');
    } }) });
    unknownOf(() => f.dispatcher.dispatch(commandName())); expect(f.sqlite.open).toBe(false);
    const owned = openOwnedDisposable(f.filename, { readonly: true }); try { expect(revision(owned)).toBe(2); } finally { owned.close(); }
  });
  it('retains UNKNOWN even when a failed rollback throws undefined rather than an Error value', () => {
    let rollbacks = 0;
    const f = fixture({ hooks: () => ({ beforeCommit: () => { throw new Error('Primary fault'); }, rollback: () => { rollbacks++; throw undefined; } }) });
    unknownOf(() => f.dispatcher.dispatch(commandName())); expect(rollbacks).toBe(1); expect(f.sqlite.open).toBe(false);
    expect(() => f.dispatcher.dispatch(commandName())).toThrow(); expect(rollbacks).toBe(1);
  });
  it('treats a no-op fake COMMIT hook as uncommitted and confirms rollback without advancing Revision', () => {
    const f = fixture({ hooks: () => ({ commit: () => undefined }) }); const before = sourceState(f.sqlite);
    expect(() => f.dispatcher.dispatch(commandName())).toThrow('COMMIT'); expect(sourceState(f.sqlite)).toEqual(before); expect(f.sqlite.inTransaction).toBe(false);
    expect(f.uow.diagnostics()).toMatchObject([{ outcome: 'ROLLED_BACK' }]);
  });
  it('cannot use a retained handler capability from inside a trusted COMMIT hook', () => {
    let retained!: TaskNameCapability;
    const f = fixture({ handlers: { 'F2-07': (cap) => { retained = cap as TaskNameCapability; retained.stageTaskAllowedFields({ name: 'Changed' }); } }, hooks: (sqlite) => ({ commit: () => {
      expect(() => retained.stageTaskAllowedFields({ name: 'COMMIT escaped' })).toThrow(); sqlite.exec('COMMIT');
    } }) });
    const result = f.dispatcher.dispatch(commandName()); expect(result.value).toEqual({ taskId: 'A', name: 'Changed' }); expect(revision(f.sqlite)).toBe(2);
  });
  it('does not return success when a COMMIT hook commits then catches a forbidden re-entry', () => {
    let f: ReturnType<typeof createHarnessFixture>;
    f = fixture({ hooks: (sqlite) => ({ commit: () => {
      sqlite.exec('COMMIT');
      try { f.dispatcher.dispatch(commandName('Forbidden second mutation', 2)); } catch { /* The outer diagnostic must not become fabricated success. */ }
    } }) });
    unknownOf(() => f.dispatcher.dispatch(commandName())); expect(f.uow.diagnostics()).toMatchObject([{ outcome: 'UNKNOWN' }]);
    const db = openOwnedDisposable(f.filename, { readonly: true }); try { expect(revision(db)).toBe(2); } finally { db.close(); }
  });
  it('returns detached frozen diagnostics rather than a mutable internal history or recovery service', () => {
    const f = fixture(); expect(() => f.dispatcher.dispatch(commandName('Synthetic A'))).toThrow();
    const first = f.uow.diagnostics(); expect(Object.isFrozen(first)).toBe(true); expect(Object.isFrozen(first[0])).toBe(true);
    expect(Reflect.get(f.uow, 'recover')).toBeUndefined(); expect(Reflect.get(f.dispatcher, 'http')).toBeUndefined();
    expect(f.dispatcher.externalApiExposure).toBe(false);
    f.dispatcher.dispatch(commandName()); expect(first).toHaveLength(1); expect(f.uow.diagnostics()).toHaveLength(2);
  });
});
