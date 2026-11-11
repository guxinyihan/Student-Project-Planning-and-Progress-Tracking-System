import { describe, expect, it } from 'vitest';
import { CAPABILITY_METHODS, parseInternalCommand } from '../../src/backend/application/operation-capabilities.js';
import { commandRole } from '../fixtures/g1-f203-command.js';

describe('F2-03 internal role command and exact capability contract', () => {
  it.each(['LEADER', 'MEMBER'] as const)('binds only the project, Revision, target MemberId and requested %s role', (role) => {
    const input = { operationId: 'F2-03', projectId: 'P1', expectedRevision: 7, payload: { memberId: 'M2', role } };
    const parsed = parseInternalCommand(input);
    input.projectId = 'P2';
    input.expectedRevision = 8;
    input.payload.memberId = 'M4';
    expect(parsed).toEqual(commandRole(role, 'M2', 7));
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.payload)).toBe(true);
    expect(CAPABILITY_METHODS['F2-03']).toEqual(['stageTargetRole']);
  });

  it('rejects missing, invalid and non-string role values', () => {
    const command = commandRole();
    for (const role of [undefined, null, 0, 'leader', 'OWNER', { role: 'LEADER' }])
      expect(() => parseInternalCommand({ ...command, payload: { memberId: 'M2', role } })).toThrow();
    expect(() => parseInternalCommand({ ...command, payload: { memberId: 'M2' } })).toThrow();
  });

  it('requires a bound MemberId, project and positive safe Revision', () => {
    const command = commandRole();
    for (const memberId of [undefined, null, 0, ''])
      expect(() => parseInternalCommand({ ...command, payload: { memberId, role: 'LEADER' } })).toThrow();
    for (const expectedRevision of [undefined, 0, -1, 1.5, '1', Number.MAX_SAFE_INTEGER + 1])
      expect(() => parseInternalCommand({ ...command, expectedRevision })).toThrow();
    expect(() => parseInternalCommand({ ...command, projectId: '' })).toThrow();
  });

  it('rejects identity, callbacks, full-state writes and other unbound payload fields', () => {
    const command = commandRole();
    for (const extra of ['actorId', 'verifiedActorId', 'handler', 'authorize', 'mutationPlan', 'repository', 'memberships'])
      expect(() => parseInternalCommand({ ...command, [extra]: null })).toThrow();
    for (const extra of ['userId', 'projectId', 'active', 'leftAt', 'updatedAt', 'expectedRevision', 'roleChange'])
      expect(() => parseInternalCommand({ ...command, payload: { ...command.payload, [extra]: null } })).toThrow();
  });

  it('rejects role and target accessors without invoking them', () => {
    for (const field of ['memberId', 'role']) {
      let accessed = false;
      const payload = { memberId: 'M2', role: 'LEADER' };
      Object.defineProperty(payload, field, { get() { accessed = true; return 'LEADER'; }, enumerable: true });
      expect(() => parseInternalCommand({ ...commandRole(), payload })).toThrow();
      expect(accessed).toBe(false);
    }
  });
});
