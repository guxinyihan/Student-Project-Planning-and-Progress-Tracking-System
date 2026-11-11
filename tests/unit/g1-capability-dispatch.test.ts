import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import {
  CAPABILITY_METHODS, ENABLED_OPERATIONS, G1_A_EXTERNAL_API_EXPOSURE, OPERATION_CATALOG, parseInternalCommand,
} from '../../src/backend/application/operation-capabilities.js';
import type { BatchCapability, EnabledOperation, InsertCapability, OperationCapability, RemoveCapability, TaskNameCapability } from '../../src/backend/application/unit-of-work.js';
import { commandBatch, commandInsert, commandName, commandRemove, createHarnessFixture, isolatedSourceRoot, sourceState } from '../fixtures/g1-b2-disposable-database.js';

import { commandRole } from '../fixtures/g1-f203-command.js';

const fixtures: ReturnType<typeof createHarnessFixture>[] = [];
const fixture = (options: Parameters<typeof createHarnessFixture>[0] = {}) => { const f = createHarnessFixture(options); fixtures.push(f); return f; };
afterEach(() => { for (const f of fixtures.splice(0)) f.close(); });
function commandFor(id: EnabledOperation) {
  if (id === 'F2-03') return commandRole();
  if (id === 'F2-07') return commandName();
  if (id === 'F3-04') return commandInsert();
  if (id === 'F3-05') return commandRemove();
  return commandBatch([commandInsert().payload as Parameters<typeof commandBatch>[0][number]], ['L1']);
}
function stage(id: EnabledOperation, cap: OperationCapability): void {
  if (id === 'F2-03') (cap as { stageTargetRole(): void }).stageTargetRole();
  else if (id === 'F2-07') (cap as TaskNameCapability).stageTaskAllowedFields({ name: 'Renamed A' });
  else if (id === 'F3-04') (cap as InsertCapability).stageDependencyInsert();
  else if (id === 'F3-05') (cap as RemoveCapability).stageDependencyRemove();
  else { (cap as BatchCapability).stageDependencyRemove(); (cap as BatchCapability).stageDependencyInsert(); }
}
describe('G1-A trusted internal dispatch and exact capabilities', () => {
  it('type-checks the unchanged project configuration without emitting files or executing inherited tests', () => {
    const filename = join(isolatedSourceRoot, 'tsconfig.check.json');
    const loaded = ts.readConfigFile(filename, ts.sys.readFile);
    expect(loaded.error).toBeUndefined();
    const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, isolatedSourceRoot, { noEmit: true }, filename);
    const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
    const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
    const formatted = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (name) => name,
      getCurrentDirectory: () => isolatedSourceRoot,
      getNewLine: () => '\n',
    });
    expect(formatted).toBe('');
  }, 60_000);
  it('retains the 27-row catalog but enables only the five approved internal harness operations', () => {
    expect(OPERATION_CATALOG).toHaveLength(27); expect(new Set(OPERATION_CATALOG).size).toBe(27);
    expect(OPERATION_CATALOG.filter((x) => x !== 'F1-04')).toHaveLength(26);
    expect(ENABLED_OPERATIONS).toEqual(['F2-03', 'F2-07', 'F3-04', 'F3-05', 'F3-06']); expect(G1_A_EXTERNAL_API_EXPOSURE).toBe(false);
  });
  it('denies all unenabled catalog rows, including Bootstrap and private Finalizer IDs', () => {
    const f = fixture(); const before = sourceState(f.sqlite);
    for (const operationId of OPERATION_CATALOG.filter((x) => !ENABLED_OPERATIONS.includes(x as EnabledOperation)))
      expect(() => f.dispatcher.dispatch({ ...commandName(), operationId })).toThrow();
    expect(sourceState(f.sqlite)).toEqual(before);
  });
  it.each(ENABLED_OPERATIONS)('%s receives only its exact null-prototype frozen runtime methods', (id) => {
    let captured: OperationCapability | undefined;
    const f = fixture({ handlers: { [id]: (cap: OperationCapability) => {
      captured = cap; expect(Object.getPrototypeOf(cap)).toBeNull(); expect(Object.isFrozen(cap)).toBe(true);
      expect(Reflect.ownKeys(cap).sort()).toEqual([...CAPABILITY_METHODS[id]].sort());
      for (const forbidden of ['management', 'dependencies', 'database', 'sqlite', 'prepare', 'exec', 'commit', 'rollback', 'incrementRevision', 'getCapability', 'dispatch', 'listCompleteTasks', 'listCompleteDependencies'])
        expect(Reflect.get(cap, forbidden)).toBeUndefined();
      expect(Reflect.set(cap, 'escape', () => undefined)).toBe(false); stage(id, cap);
    } } });
    const result = f.dispatcher.dispatch(commandFor(id)); expect(result.ok).toBe(true); expect(result.revision).toBe(2);
    expect(captured).toBeDefined(); expect(f.sqlite.inTransaction).toBe(false);
  });
  it('rejects a caller-supplied handler or authority instead of treating request data as composition', () => {
    const f = fixture(); const before = sourceState(f.sqlite);
    for (const extra of ['handler', 'handlers', 'authorize', 'verifiedActorId', 'authority', 'runtimePolicy'])
      expect(() => f.dispatcher.dispatch({ ...commandName(), [extra]: () => true })).toThrow();
    expect(sourceState(f.sqlite)).toEqual(before);
  });
  it('rejects an accessor without executing caller code', () => {
    let accessed = false; const cmd = { ...commandName() };
    Object.defineProperty(cmd, 'payload', { get() { accessed = true; return { taskId: 'A', name: 'Injected' }; }, enumerable: true });
    expect(() => parseInternalCommand(cmd)).toThrow(); expect(accessed).toBe(false);
  });
  it('rejects symbol payload fields and prototype-bearing request objects', () => {
    expect(() => parseInternalCommand({ ...commandName(), payload: { taskId: 'A', name: 'Changed', [Symbol('authority')]: true } })).toThrow();
    expect(() => parseInternalCommand(Object.assign(Object.create({ authority: true }), commandName()))).toThrow();
  });
  it('rejects sparse or accessor-bearing batch arrays without invoking the getter', () => {
    let accessed = false; const inserts: unknown[] = [];
    Object.defineProperty(inserts, '0', { get() { accessed = true; return commandInsert().payload; }, enumerable: true });
    expect(() => parseInternalCommand({ ...commandBatch([], []), payload: { inserts, removes: [] } })).toThrow();
    expect(accessed).toBe(false);
    expect(() => parseInternalCommand({ ...commandBatch([], []), payload: { inserts: new Array(1), removes: [] } })).toThrow();
  });
  it('freezes detached parsed commands so later caller mutation cannot change target or intent', () => {
    const raw = { operationId: 'F2-07', projectId: 'P1', expectedRevision: 1, payload: { taskId: 'A', name: 'Initial' } };
    const parsed = parseInternalCommand(raw); raw.payload.name = 'Later'; raw.projectId = 'P2';
    expect(parsed.projectId).toBe('P1'); expect(parsed.payload).toMatchObject({ taskId: 'A', name: 'Initial' });
    expect(Object.isFrozen(parsed)).toBe(true); expect(Object.isFrozen(parsed.payload)).toBe(true);
  });
  it('has no Dispatcher import or route binding in the unchanged application entrypoints', () => {
    for (const name of ['app.ts', 'server.ts']) {
      const text = readFileSync(join(isolatedSourceRoot, 'src/backend', name), 'utf8');
      expect(text).not.toContain('operation-dispatcher'); expect(text).not.toContain('createOperationDispatcher');
    }
  });
  it('rejects the historical broad callback API instead of leaving a B2 bypass', () => {
    const f = fixture(); let called = false; const before = sourceState(f.sqlite);
    expect(() => f.uow.run({ verifiedActorId: 'U1' as never, projectId: 'P1' as never, expectedRevision: 1, authorize() {} }, () => { called = true; })).toThrow();
    expect(called).toBe(false); expect(sourceState(f.sqlite)).toEqual(before);
  });
});
