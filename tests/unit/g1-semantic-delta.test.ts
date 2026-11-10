import { describe, expect, it } from 'vitest';
import { asDependencyId, asProjectId, asTaskId, type DependencyView } from '@group9/shared';
import { detectSemanticDelta, hasSemanticChanges } from '../../src/backend/persistence/source-semantic-delta.js';

const edge = (id = 'L1', from = 'A', to = 'B', project = 'P1'): DependencyView => ({
  dependencyId: asDependencyId(id), projectId: asProjectId(project), prerequisiteId: asTaskId(from), dependentId: asTaskId(to),
});
const names = (...pairs: [string, string][]) => new Map(pairs);
describe('G1-A semantic source delta', () => {
  it('rejects a dirty history whose final task name equals its original value', () => {
    const before = names(['A', 'Original']); const after = new Map(before);
    after.set('A', 'Temporary'); after.set('A', 'Original');
    expect(hasSemanticChanges(detectSemanticDelta(before, after, [], []))).toBe(false);
  });
  it('detects a real name change without mutating either input map', () => {
    const before = names(['A', 'Original']); const after = names(['A', 'Updated']);
    const delta = detectSemanticDelta(before, after, [], []);
    expect(delta.taskNames).toEqual([{ taskId: 'A', beforeName: 'Original', afterName: 'Updated' }]);
    expect(hasSemanticChanges(delta)).toBe(true); expect(before.get('A')).toBe('Original');
  });
  it('preserves exact source strings instead of silently trimming name updates', () => {
    expect(hasSemanticChanges(detectSemanticDelta(names(['A', 'Name']), names(['A', 'Name ']), [], []))).toBe(true);
  });
  it('detects a real new dependency', () => {
    const delta = detectSemanticDelta(names(), names(), [edge()], [edge(), edge('L2', 'B', 'C')]);
    expect(delta.inserted.map((x) => x.dependencyId)).toEqual(['L2']); expect(delta.removed).toEqual([]);
  });
  it('detects an existing dependency removal', () => {
    const delta = detectSemanticDelta(names(), names(), [edge()], []);
    expect(delta.removed.map((x) => x.dependencyId)).toEqual(['L1']); expect(delta.inserted).toEqual([]);
  });
  it('treats add/remove cancellation as no business delta', () => {
    const original = [edge()]; const candidate = [...original, edge('L2', 'B', 'C')]; candidate.pop();
    expect(hasSemanticChanges(detectSemanticDelta(names(), names(), original, candidate))).toBe(false);
  });
  it('ignores ordering while retaining dependency identity and endpoints', () => {
    expect(hasSemanticChanges(detectSemanticDelta(names(), names(), [edge(), edge('L2', 'B', 'C')], [edge('L2', 'B', 'C'), edge()]))).toBe(false);
  });
  it('does not conflate equal endpoints with a different dependency ID', () => {
    const delta = detectSemanticDelta(names(), names(), [edge()], [edge('L2')]);
    expect(delta.removed.map((x) => x.dependencyId)).toEqual(['L1']); expect(delta.inserted.map((x) => x.dependencyId)).toEqual(['L2']);
  });
  it('represents a changed endpoint under one ID as remove plus insert', () => {
    const delta = detectSemanticDelta(names(), names(), [edge()], [edge('L1', 'A', 'C')]);
    expect(delta.removed).toEqual([edge()]); expect(delta.inserted).toEqual([edge('L1', 'A', 'C')]);
  });
  it('includes project binding in dependency comparison', () => {
    expect(hasSemanticChanges(detectSemanticDelta(names(), names(), [edge()], [edge('L1', 'A', 'B', 'P2')]))).toBe(true);
  });
  it('returns immutable detached delta arrays and records', () => {
    const source = edge(); const delta = detectSemanticDelta(names(), names(), [], [source]);
    expect(Object.isFrozen(delta)).toBe(true); expect(Object.isFrozen(delta.inserted)).toBe(true); expect(Object.isFrozen(delta.inserted[0])).toBe(true);
    expect(delta.inserted[0]).not.toBe(source);
  });
});
