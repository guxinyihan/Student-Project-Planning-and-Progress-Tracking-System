// Isolated F3/F4 pure engines only; no persistence, business routes or integration acceptance.
export type { ProjectSnapshot, DashboardInput, TaskSnapshot } from '@group9/shared';
export * from './scheduling/graph.js';
export * from './scheduling/cpm.js';
export const domainImplementationStage = 'ISOLATED_F3_F4' as const;
