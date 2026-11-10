import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  sqliteTable,
  text,
  unique,
} from 'drizzle-orm/sqlite-core';

const timestamps = () => ({
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * Additional logical tasks.durationDays invariant, enforced physically by migration 0002.
 * Drizzle does not declare a fictitious table CHECK: the historical table remains as
 * created by 0001, and both trigger definitions are verified by the migration runner.
 */
export const taskDurationNulIntegrity = Object.freeze({
  migrationVersion: 2,
  predicate: 'duration_days IS NULL OR instr(duration_days, char(0)) = 0',
  insertTrigger: 'tasks_duration_no_nul_insert',
  updateTrigger: 'tasks_duration_no_nul_update',
});

export const users = sqliteTable(
  'users',
  {
    userId: text('user_id').primaryKey().notNull(),
    displayName: text('display_name').notNull(),
    ...timestamps(),
  },
  (t) => [
    check('user_id_nonblank', sql`length(trim(${t.userId}))>0`),
    check('display_name_nonblank', sql`length(trim(${t.displayName}))>0`),
  ],
);

export const projects = sqliteTable(
  'projects',
  {
    projectId: text('project_id').primaryKey().notNull(),
    name: text('name').notNull(),
    description: text('description'),
    plannedStartDate: text('planned_start_date'),
    projectDeadline: text('project_deadline'),
    // Proposed D-04 refinement only: no default and no absolute date business logic.
    projectTimezone: text('project_timezone'),
    revision: integer('revision').notNull(),
    ...timestamps(),
  },
  (t) => [
    check('project_id_nonblank', sql`length(trim(${t.projectId}))>0`),
    check('project_name_nonblank', sql`length(trim(${t.name}))>0`),
    check('revision_range', sql`${t.revision} BETWEEN 1 AND 9007199254740991`),
  ],
);

export const projectMembers = sqliteTable(
  'project_members',
  {
    memberId: text('member_id').primaryKey().notNull(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.projectId, { onDelete: 'restrict', onUpdate: 'restrict' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'restrict', onUpdate: 'restrict' }),
    role: text('role', { enum: ['LEADER', 'MEMBER'] }).notNull(),
    active: integer('active', { mode: 'boolean' }).notNull(),
    leftAt: text('left_at'),
    ...timestamps(),
  },
  (t) => [
    unique().on(t.projectId, t.userId),
    unique().on(t.projectId, t.memberId),
    check('role_values', sql`${t.role} IN ('LEADER','MEMBER')`),
    check('active_values', sql`${t.active} IN (0,1)`),
    check(
      'membership_departure',
      sql`(${t.active}=1 AND ${t.leftAt} IS NULL) OR (${t.active}=0 AND ${t.leftAt} IS NOT NULL)`,
    ),
    index('members_user_active').on(t.userId, t.active, t.projectId),
    index('members_project_active').on(t.projectId, t.active),
  ],
);

export const tasks = sqliteTable(
  'tasks',
  {
    taskId: text('task_id').primaryKey().notNull(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.projectId, { onDelete: 'restrict', onUpdate: 'restrict' }),
    name: text('name').notNull(),
    description: text('description'),
    assigneeId: text('assignee_id'),
    // TEXT/null preservation plus the migration-0002 trigger invariant above.
    durationDays: text('duration_days'),
    taskDeadline: text('task_deadline'),
    status: text('status', { enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] }).notNull(),
    ...timestamps(),
  },
  (t) => [
    unique().on(t.projectId, t.taskId),
    foreignKey({
      columns: [t.projectId, t.assigneeId],
      foreignColumns: [projectMembers.projectId, projectMembers.memberId],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    check('task_name_nonblank', sql`length(trim(${t.name}))>0`),
    check('task_status_values', sql`${t.status} IN ('NOT_STARTED','IN_PROGRESS','COMPLETED')`),
    check(
      'duration_lexical',
      sql`${t.durationDays} IS NULL OR (length(${t.durationDays})>0 AND ${t.durationDays} NOT GLOB '*[^0-9.]*' AND ${t.durationDays} NOT GLOB '*.*.*' AND substr(${t.durationDays},1,1)<>'.' AND substr(${t.durationDays},-1)<>'.' AND (substr(${t.durationDays},1,1)<>'0' OR length(${t.durationDays})=1 OR substr(${t.durationDays},2,1)='.') AND ${t.durationDays} GLOB '*[1-9]*')`,
    ),
    index('tasks_assignment').on(t.projectId, t.assigneeId),
  ],
);

export const taskDependencies = sqliteTable(
  'task_dependencies',
  {
    dependencyId: text('dependency_id').primaryKey().notNull(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.projectId, { onDelete: 'restrict', onUpdate: 'restrict' }),
    prerequisiteId: text('prerequisite_id').notNull(),
    dependentId: text('dependent_id').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    unique().on(t.projectId, t.prerequisiteId, t.dependentId),
    check('dependency_not_self', sql`${t.prerequisiteId}<>${t.dependentId}`),
    foreignKey({
      columns: [t.projectId, t.prerequisiteId],
      foreignColumns: [tasks.projectId, tasks.taskId],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    foreignKey({
      columns: [t.projectId, t.dependentId],
      foreignColumns: [tasks.projectId, tasks.taskId],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    index('dependencies_incoming').on(t.projectId, t.dependentId, t.prerequisiteId),
  ],
);

export const progressNotes = sqliteTable(
  'progress_notes',
  {
    noteId: text('note_id').primaryKey().notNull(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.projectId, { onDelete: 'restrict', onUpdate: 'restrict' }),
    taskId: text('task_id').notNull(),
    authorMemberId: text('author_member_id').notNull(),
    text: text('text').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.projectId, t.taskId],
      foreignColumns: [tasks.projectId, tasks.taskId],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    foreignKey({
      columns: [t.projectId, t.authorMemberId],
      foreignColumns: [projectMembers.projectId, projectMembers.memberId],
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    check('note_nonblank', sql`length(trim(${t.text}))>0`),
    index('notes_task').on(t.projectId, t.taskId, t.createdAt, t.noteId),
    index('notes_author').on(t.projectId, t.authorMemberId),
  ],
);
