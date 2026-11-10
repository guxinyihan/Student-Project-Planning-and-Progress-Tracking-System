// Implemented from ROUND3 Revision 1; no business routes or approval implied.
import type {
  DecimalString,
  DependencyId,
  Instant,
  LocalDate,
  MemberId,
  NoteId,
  ProjectId,
  ProjectRole,
  Revision,
  TaskId,
  TaskStatus,
  UserId,
} from './identifiers.js';
import type { DependencySourceSnapshot } from './results.js';

export interface ProjectView {
  projectId: ProjectId;
  name: string;
  description: string | null;
  plannedStartDate: LocalDate | null;
  projectDeadline: LocalDate | null;
  revision: Revision;
  createdAt: Instant;
  updatedAt: Instant;
}

export interface MembershipRecord {
  memberId: MemberId;
  projectId: ProjectId;
  userId: UserId;
  role: ProjectRole;
  active: boolean;
  createdAt: Instant;
  updatedAt: Instant;
  leftAt: Instant | null;
}

export interface MemberView extends MembershipRecord {
  displayName: string; // authorized project-scoped read projection from User
}

export interface TaskSnapshot {
  taskId: TaskId;
  projectId: ProjectId;
  name: string;
  description: string | null;
  assigneeId: MemberId | null;
  durationDays: DecimalString | null;
  taskDeadline: LocalDate | null;
  status: TaskStatus;
  createdAt: Instant;
  updatedAt: Instant;
}

export interface DependencyEdge {
  prerequisiteId: TaskId;
  dependentId: TaskId;
}

export interface DependencyView extends DependencyEdge {
  dependencyId: DependencyId;
  projectId: ProjectId;
}

export interface ProgressNoteView {
  noteId: NoteId;
  taskId: TaskId;
  authorMemberId: MemberId;
  text: string;
  createdAt: Instant;
}

export interface ProjectSnapshot {
  projectId: ProjectId;
  name: string;
  description: string | null;
  plannedStartDate: LocalDate | null;
  projectDeadline: LocalDate | null;
  members: readonly MembershipRecord[];
  tasks: readonly TaskSnapshot[];
  dependencySource: DependencySourceSnapshot;
  revision: Revision;
}

export interface AuthorizedReadContext {
  actorId: UserId;
  viewerMemberId: MemberId;
  snapshot: Readonly<ProjectSnapshot>;
}

export interface DatedReadContext extends AuthorizedReadContext {
  asOfDate: LocalDate;
}

export interface RuntimePolicy {
  f3Enabled: boolean;
  f4Enabled: boolean;
  f6Enabled: boolean;
  datePolicy: 'UNRESOLVED' | 'EXPLICIT_CANDIDATE_FIXTURE' | 'AGREED_POLICY';
}
