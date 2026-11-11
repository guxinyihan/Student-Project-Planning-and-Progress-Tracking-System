import { asMemberId, asProjectId, type ProjectRole } from '@group9/shared';
import type { InternalCommand } from '../../src/backend/application/unit-of-work.js';

export function commandRole(role: ProjectRole = 'LEADER', memberId = 'M2', expectedRevision = 1, projectId = 'P1'): InternalCommand {
  return {
    operationId: 'F2-03',
    projectId: asProjectId(projectId),
    expectedRevision,
    payload: { memberId: asMemberId(memberId), role },
  };
}
