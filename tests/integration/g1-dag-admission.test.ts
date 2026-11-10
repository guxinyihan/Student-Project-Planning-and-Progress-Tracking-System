import { afterEach, describe, expect, it } from 'vitest';
import { asDependencyId, asTaskId } from '@group9/shared';
import type { BatchCapability, InsertCapability } from '../../src/backend/application/unit-of-work.js';
import { commandBatch, commandInsert, commandName, commandRemove, createHarnessFixture, revision, SEED_TIME, sourceState } from '../fixtures/g1-b2-disposable-database.js';

const fixtures: ReturnType<typeof createHarnessFixture>[] = [];
const fixture = (options: Parameters<typeof createHarnessFixture>[0] = {}) => { const f = createHarnessFixture(options); fixtures.push(f); return f; };
afterEach(() => { for (const f of fixtures.splice(0)) f.close(); });
const intent = (id: string, from: string, to: string) => ({ dependencyId: asDependencyId(id), prerequisiteId: asTaskId(from), dependentId: asTaskId(to) });
const links = (f: ReturnType<typeof createHarnessFixture>) => f.sqlite.prepare('SELECT dependency_id,project_id,prerequisite_id,dependent_id FROM task_dependencies ORDER BY dependency_id').all();
function addForeignEdge(f: ReturnType<typeof createHarnessFixture>): void {
  f.sqlite.prepare('INSERT INTO tasks VALUES (?,?,?,?,?,?,?,?,?,?)').run('Y', 'P2', 'Other Y', null, null, null, null, 'NOT_STARTED', SEED_TIME, SEED_TIME);
  f.sqlite.prepare('INSERT INTO task_dependencies VALUES (?,?,?,?,?)').run('LX', 'P2', 'X', 'Y', SEED_TIME);
}
describe('G1-A private complete DAG Finalizer and trusted policy', () => {
  it('inserts a valid dependency using the complete universe including a null-duration isolated task', () => {
    const f = fixture(); const taskC = f.sqlite.prepare('SELECT * FROM tasks WHERE task_id=?').get('C');
    expect(taskC).toMatchObject({ duration_days: null, assignee_id: null });
    const result = f.dispatcher.dispatch(commandInsert());
    expect(result).toMatchObject({ ok: true, revision: 2, savedChange: { changeKind: 'F3-04', affectedTaskIds: ['B', 'C'], changedFields: ['dependencies'] } });
    expect(links(f)).toEqual([{ dependency_id: 'L1', project_id: 'P1', prerequisite_id: 'A', dependent_id: 'B' }, { dependency_id: 'L2', project_id: 'P1', prerequisite_id: 'B', dependent_id: 'C' }]);
    expect(f.sqlite.prepare('SELECT * FROM tasks WHERE task_id=?').get('C')).toEqual(taskC);
  });
  it('removes an existing edge once without deleting tasks or progress notes', () => {
    const f = fixture(); const before = sourceState(f.sqlite); const result = f.dispatcher.dispatch(commandRemove());
    expect(result).toMatchObject({ ok: true, revision: 2, value: { dependencyId: 'L1', removed: true }, savedChange: { changeKind: 'F3-05' } });
    expect(links(f)).toEqual([]); const after = sourceState(f.sqlite); expect(after.tasks).toEqual(before.tasks); expect(after.progress_notes).toEqual(before.progress_notes);
  });
  it('commits a valid multi-edge replacement atomically with only one Revision increment', () => {
    const f = fixture(); const result = f.dispatcher.dispatch(commandBatch([intent('L2', 'A', 'C'), intent('L3', 'C', 'B')], ['L1']));
    expect(result.revision).toBe(2); expect(revision(f.sqlite)).toBe(2);
    expect(result.savedChange.changeKind).toBe('F3-06');
    expect(result.value).toEqual({ inserted: ['L2', 'L3'], removed: ['L1'] });
    expect(links(f).map((x) => (x as { dependency_id: string }).dependency_id)).toEqual(['L2', 'L3']);
  });
  it('rejects an indirect cycle against existing edges and rolls back the entire operation', () => {
    const f = fixture(); const before = sourceState(f.sqlite);
    expect(() => f.dispatcher.dispatch(commandInsert('L2', 'B', 'A'))).toThrow();
    expect(sourceState(f.sqlite)).toEqual(before); expect(f.sqlite.inTransaction).toBe(false);
  });
  it('validates the full final batch rather than admitting individually plausible edges', () => {
    const f = fixture(); const before = sourceState(f.sqlite);
    expect(() => f.dispatcher.dispatch(commandBatch([intent('L2', 'B', 'C'), intent('L3', 'C', 'A')], []))).toThrow();
    expect(sourceState(f.sqlite)).toEqual(before);
  });
  it('rejects self edges, duplicate endpoint edges, missing tasks and foreign-project endpoints', () => {
    const f = fixture(); const before = sourceState(f.sqlite);
    for (const cmd of [commandInsert('L2', 'A', 'A'), commandInsert('L2', 'A', 'B'), commandInsert('L2', 'A', 'missing'), commandInsert('L2', 'A', 'X')]) {
      expect(() => f.dispatcher.dispatch(cmd)).toThrow(); expect(sourceState(f.sqlite)).toEqual(before);
    }
  });
  it('rejects repeated insert IDs instead of overwriting a staged candidate silently', () => {
    const f = fixture(); const before = sourceState(f.sqlite);
    expect(() => f.dispatcher.dispatch(commandBatch([intent('L2', 'A', 'C'), intent('L2', 'B', 'C')], []))).toThrow(); expect(sourceState(f.sqlite)).toEqual(before);
  });
  it('retains global dependency IDs and scoped reference protection across projects', () => {
    const f = fixture(); addForeignEdge(f); const before = sourceState(f.sqlite);
    expect(() => f.dispatcher.dispatch(commandInsert('LX', 'B', 'C'))).toThrow();
    expect(() => f.dispatcher.dispatch(commandRemove('LX'))).toThrow();
    expect(() => f.dispatcher.dispatch(commandRemove('missing'))).toThrow();
    expect(sourceState(f.sqlite)).toEqual(before);
  });
  it('treats same-ID edge removal/reinsertion as semantic no-op without replacing created_at', () => {
    const f = fixture(); const before = sourceState(f.sqlite);
    expect(() => f.dispatcher.dispatch(commandBatch([intent('L1', 'A', 'B')], ['L1']))).toThrow();
    expect(sourceState(f.sqlite)).toEqual(before);
  });
  it('rejects add-then-remove cancellation with no timestamp or Revision changes', () => {
    const f = fixture({ handlers: { 'F3-06': (cap) => { const c = cap as BatchCapability; c.stageDependencyInsert(); c.stageDependencyRemove(); } } });
    const before = sourceState(f.sqlite);
    expect(() => f.dispatcher.dispatch(commandBatch([intent('L2', 'B', 'C')], ['L2']))).toThrow(); expect(sourceState(f.sqlite)).toEqual(before);
  });
  it.each(['F3-04', 'F3-05', 'F3-06'] as const)('%s cannot obtain capabilities under disabled trusted policy or a forged caller flag', (operationId) => {
    let called = false;
    const f = fixture({ f3Enabled: false, handlers: { [operationId]: () => { called = true; } } });
    const cmd = operationId === 'F3-04' ? commandInsert() : operationId === 'F3-05' ? commandRemove() : commandBatch([intent('L2', 'B', 'C')], []);
    const before = sourceState(f.sqlite);
    expect(() => f.dispatcher.dispatch(cmd)).toThrow(); expect(called).toBe(false);
    expect(() => f.dispatcher.dispatch({ ...cmd, f3Enabled: true })).toThrow(); expect(called).toBe(false); expect(sourceState(f.sqlite)).toEqual(before);
  });
  it('trusted enabled policy does not authorize a MEMBER or allow policy injection in payload', () => {
    const f = fixture({ actorId: 'U2', f3Enabled: true }); const before = sourceState(f.sqlite);
    expect(() => f.dispatcher.dispatch(commandInsert())).toThrow();
    expect(() => f.dispatcher.dispatch({ ...commandInsert(), payload: { ...commandInsert().payload, f3Enabled: true } })).toThrow();
    expect(sourceState(f.sqlite)).toEqual(before);
  });
  it('does not invent a F3 feature prerequisite for a legal name-only update', () => {
    const f = fixture({ f3Enabled: false }); expect(f.dispatcher.dispatch(commandName()).revision).toBe(2);
  });
  it('rechecks trusted policy before capability use and before COMMIT', () => {
    let f: ReturnType<typeof createHarnessFixture>;
    f = fixture({ handlers: { 'F3-04': (cap) => {
      f.state.f3Enabled = false;
      try { (cap as InsertCapability).stageDependencyInsert(); } catch { /* Must poison the entire operation. */ }
    } } });
    const before = sourceState(f.sqlite); expect(() => f.dispatcher.dispatch(commandInsert())).toThrow(); expect(sourceState(f.sqlite)).toEqual(before);
    let finalPolicy: ReturnType<typeof createHarnessFixture>;
    finalPolicy = fixture({ hooks: () => ({ beforeCommit: () => { finalPolicy.state.f3Enabled = false; } }) });
    const prior = sourceState(finalPolicy.sqlite); expect(() => finalPolicy.dispatcher.dispatch(commandInsert())).toThrow(); expect(sourceState(finalPolicy.sqlite)).toEqual(prior);
  });
  it('refuses retained intent capabilities and extra unbound method arguments', () => {
    let retained!: InsertCapability;
    const f = fixture({ handlers: { 'F3-04': (cap) => { retained = cap as InsertCapability; retained.stageDependencyInsert(); } } });
    f.dispatcher.dispatch(commandInsert()); const after = sourceState(f.sqlite);
    expect(() => retained.stageDependencyInsert()).toThrow(); expect(sourceState(f.sqlite)).toEqual(after);
    const bad = fixture({ handlers: { 'F3-04': (cap) => { Reflect.apply((cap as InsertCapability).stageDependencyInsert, undefined, [{ dependencyId: 'outside', prerequisiteId: 'A', dependentId: 'X' }]); } } });
    const before = sourceState(bad.sqlite); expect(() => bad.dispatcher.dispatch(commandInsert())).toThrow(); expect(sourceState(bad.sqlite)).toEqual(before);
  });
  it('rejects stale expected Revision after another graph mutation instead of trusting an earlier preview', () => {
    const f = fixture(); f.dispatcher.dispatch(commandInsert()); const after = sourceState(f.sqlite);
    expect(() => f.dispatcher.dispatch(commandInsert('L3', 'C', 'A', 1))).toThrow(); expect(sourceState(f.sqlite)).toEqual(after);
    expect(() => f.dispatcher.dispatch(commandInsert('L3', 'C', 'A', 2))).toThrow(); expect(sourceState(f.sqlite)).toEqual(after);
  });
  it('requires the private Finalizer even if the ordinary handler claims graph validation succeeded', () => {
    const f = fixture({ handlers: { 'F3-04': (cap) => {
      const view = cap as unknown as Record<string, unknown>;
      for (const name of ['validateFinalCandidate', 'listCompleteTasks', 'listCompleteDependencies', 'finalizer', 'skipDAG']) expect(view[name]).toBeUndefined();
      (cap as InsertCapability).stageDependencyInsert();
    } } });
    const before = sourceState(f.sqlite); expect(() => f.dispatcher.dispatch(commandInsert('L2', 'B', 'A'))).toThrow(); expect(sourceState(f.sqlite)).toEqual(before);
  });
  it('rolls back every edge and CAS if a fault occurs after a valid batch was persisted', () => {
    const f = fixture({ hooks: () => ({ beforeCommit: () => { throw new Error('Controlled post-persistence fault'); } }) });
    const before = sourceState(f.sqlite);
    expect(() => f.dispatcher.dispatch(commandBatch([intent('L2', 'B', 'C'), intent('L3', 'A', 'C')], []))).toThrow('Controlled'); expect(sourceState(f.sqlite)).toEqual(before);
  });
  it('protects task deletion with the unchanged database RESTRICT constraints and never issues a task-delete capability', () => {
    const f = fixture(); const before = sourceState(f.sqlite);
    expect(() => f.dispatcher.dispatch({ ...commandName(), operationId: 'F2-12', payload: { taskId: 'A' } })).toThrow();
    expect(() => f.sqlite.prepare('DELETE FROM tasks WHERE task_id=?').run('A')).toThrow();
    expect(sourceState(f.sqlite)).toEqual(before);
  });
});
