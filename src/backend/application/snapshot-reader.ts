import { and, asc, eq } from 'drizzle-orm';
import {
  asMemberId,
  asProjectId,
  asRevision,
  asTaskId,
  asUserId,
  asDependencyId,
  type AuthorizedReadContext,
  type MembershipRecord,
  type ProjectId,
  type TaskSnapshot,
  type UserId,
} from '@group9/shared';
import type { FoundationDatabase } from '../persistence/connection.js';
import { projects, projectMembers, tasks, taskDependencies } from '../persistence/schema.js';
import { SourceTransactionError } from './unit-of-work.js';

function freezeDeep<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) freezeDeep(item);
    Object.freeze(value);
  }
  return value;
}

/** Caller supplies an already-verified identity; this is not a public identity selector. */
export function readAuthorizedSnapshot(
  database: FoundationDatabase,
  verifiedActorId: UserId,
  projectId: ProjectId,
  options: { f3Enabled: boolean },
): AuthorizedReadContext {
  if (database.sqlite.inTransaction)
    throw new SourceTransactionError(
      'INVALID_INPUT',
      'Snapshot read needs its own coherent transaction.',
    );
  return database.sqlite
    .transaction((): AuthorizedReadContext => {
      const member = database.orm
        .select()
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, verifiedActorId),
            eq(projectMembers.active, true),
          ),
        )
        .get();
      const project = database.orm
        .select()
        .from(projects)
        .where(eq(projects.projectId, projectId))
        .get();
      if (!member || !project)
        throw new SourceTransactionError(
          'INVALID_OR_INACCESSIBLE_PROJECT',
          'Invalid or inaccessible project.',
        );
      const members: MembershipRecord[] = database.orm
        .select()
        .from(projectMembers)
        .where(eq(projectMembers.projectId, projectId))
        .orderBy(asc(projectMembers.memberId))
        .all()
        .map((m) => ({
          ...m,
          memberId: asMemberId(m.memberId),
          projectId: asProjectId(m.projectId),
          userId: asUserId(m.userId),
        }));
      const taskRecords: TaskSnapshot[] = database.orm
        .select()
        .from(tasks)
        .where(eq(tasks.projectId, projectId))
        .orderBy(asc(tasks.taskId))
        .all()
        .map((t) => ({
          ...t,
          taskId: asTaskId(t.taskId),
          projectId: asProjectId(t.projectId),
          assigneeId: t.assigneeId === null ? null : asMemberId(t.assigneeId),
        }));
      let dependencySource: AuthorizedReadContext['snapshot']['dependencySource'];
      if (!options.f3Enabled)
        dependencySource = {
          availability: 'NOT_ENABLED',
          links: null,
          reasonCode: 'FEATURE_NOT_ENABLED',
        };
      else {
        try {
          const links = database.orm
            .select()
            .from(taskDependencies)
            .where(eq(taskDependencies.projectId, projectId))
            .orderBy(asc(taskDependencies.dependencyId))
            .all()
            .map(({ dependencyId, projectId: p, prerequisiteId, dependentId }) => ({
              dependencyId: asDependencyId(dependencyId),
              projectId: asProjectId(p),
              prerequisiteId: asTaskId(prerequisiteId),
              dependentId: asTaskId(dependentId),
            }));
          // VALID means complete raw reading; only F3 can subsequently validate a DAG.
          dependencySource = {
            availability: taskRecords.length === 0 && links.length === 0 ? 'NO_TASKS' : 'VALID',
            links,
          };
        } catch {
          dependencySource = {
            availability: 'UNAVAILABLE',
            links: null,
            reasonCode: 'DEPENDENCY_INPUT_UNAVAILABLE',
          };
        }
      }
      return freezeDeep({
        actorId: verifiedActorId,
        viewerMemberId: asMemberId(member.memberId),
        snapshot: {
          projectId: asProjectId(project.projectId),
          name: project.name,
          description: project.description,
          plannedStartDate: project.plannedStartDate,
          projectDeadline: project.projectDeadline,
          members,
          tasks: taskRecords,
          dependencySource,
          revision: asRevision(project.revision),
        },
      });
    })
    .deferred();
}
