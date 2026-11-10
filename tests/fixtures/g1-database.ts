import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  openFoundationDatabase,
  type FoundationDatabase,
} from '../../src/backend/persistence/connection.js';
import { migrateFoundationDatabase } from '../../src/backend/persistence/migrate.js';

export const foundationWorkspaceRoot = fileURLToPath(new URL('../../', import.meta.url));
/** Independent synthetic identities, not authentication or a business admission flow. */
export function createSeededFoundationDatabase(): FoundationDatabase {
  const db = openFoundationDatabase({
    workspaceRoot: foundationWorkspaceRoot,
    relativePath: `work/g1-foundation/test-databases/${randomUUID()}.sqlite`,
    mode: 'create-new',
  });
  migrateFoundationDatabase(db);
  db.sqlite.exec(`
    INSERT INTO users VALUES ('U1','Synthetic leader','2026-10-30T00:00:00Z','2026-10-30T00:00:00Z'),('U2','Historical author','2026-10-30T00:00:00Z','2026-10-30T00:00:00Z'),('U3','Other leader','2026-10-30T00:00:00Z','2026-10-30T00:00:00Z');
    INSERT INTO projects VALUES ('P1','Synthetic project',NULL,NULL,NULL,NULL,1,'2026-10-30T00:00:00Z','2026-10-30T00:00:00Z'),('P2','Other project',NULL,NULL,NULL,NULL,1,'2026-10-30T00:00:00Z','2026-10-30T00:00:00Z');
    INSERT INTO project_members VALUES ('M1','P1','U1','LEADER',1,NULL,'2026-10-30T00:00:00Z','2026-10-30T00:00:00Z'),('M2','P1','U2','MEMBER',0,'2026-10-30T00:00:00Z','2026-10-30T00:00:00Z','2026-10-30T00:00:00Z'),('M3','P2','U3','LEADER',1,NULL,'2026-10-30T00:00:00Z','2026-10-30T00:00:00Z');
    INSERT INTO tasks VALUES ('A','P1','Synthetic A',NULL,'M1','0.10',NULL,'COMPLETED','2026-10-30T00:00:00Z','2026-10-30T00:00:00Z'),('B','P1','Synthetic B',NULL,NULL,'2',NULL,'IN_PROGRESS','2026-10-30T00:00:00Z','2026-10-30T00:00:00Z'),('X','P2','Other X',NULL,'M3',NULL,NULL,'NOT_STARTED','2026-10-30T00:00:00Z','2026-10-30T00:00:00Z');
    INSERT INTO task_dependencies VALUES ('L1','P1','A','B','2026-10-30T00:00:00Z');
    INSERT INTO progress_notes VALUES ('N1','P1','A','M2','Retained synthetic note.','2026-10-30T00:00:00Z');
  `);
  return db;
}
