-- G1 disposable foundation only. project_timezone is a nullable proposed refinement.
CREATE TABLE users (
 user_id TEXT PRIMARY KEY NOT NULL CHECK(length(trim(user_id))>0),
 display_name TEXT NOT NULL CHECK(length(trim(display_name))>0),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
) STRICT;
CREATE TABLE projects (
 project_id TEXT PRIMARY KEY NOT NULL CHECK(length(trim(project_id))>0),
 name TEXT NOT NULL CHECK(length(trim(name))>0), description TEXT,
 planned_start_date TEXT, project_deadline TEXT, project_timezone TEXT,
 revision INTEGER NOT NULL CHECK(revision BETWEEN 1 AND 9007199254740991),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
) STRICT;
CREATE TABLE project_members (
 member_id TEXT PRIMARY KEY NOT NULL, project_id TEXT NOT NULL, user_id TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('LEADER','MEMBER')),
 active INTEGER NOT NULL CHECK(active IN (0,1)), left_at TEXT,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 UNIQUE(project_id,user_id), UNIQUE(project_id,member_id),
 CHECK((active=1 AND left_at IS NULL) OR (active=0 AND left_at IS NOT NULL)),
 FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE RESTRICT ON UPDATE RESTRICT
) STRICT;
CREATE TABLE tasks (
 task_id TEXT PRIMARY KEY NOT NULL, project_id TEXT NOT NULL,
 name TEXT NOT NULL CHECK(length(trim(name))>0), description TEXT,
 assignee_id TEXT, duration_days TEXT, task_deadline TEXT,
 status TEXT NOT NULL CHECK(status IN ('NOT_STARTED','IN_PROGRESS','COMPLETED')),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 UNIQUE(project_id,task_id),
 CHECK(duration_days IS NULL OR (
   length(duration_days)>0 AND duration_days NOT GLOB '*[^0-9.]*'
   AND duration_days NOT GLOB '*.*.*' AND substr(duration_days,1,1)<>'.'
   AND substr(duration_days,-1)<>'.'
   AND (substr(duration_days,1,1)<>'0' OR length(duration_days)=1 OR substr(duration_days,2,1)='.')
   AND duration_days GLOB '*[1-9]*'
 )),
 FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 FOREIGN KEY(project_id,assignee_id) REFERENCES project_members(project_id,member_id) ON DELETE RESTRICT ON UPDATE RESTRICT
) STRICT;
CREATE TABLE task_dependencies (
 dependency_id TEXT PRIMARY KEY NOT NULL, project_id TEXT NOT NULL,
 prerequisite_id TEXT NOT NULL, dependent_id TEXT NOT NULL, created_at TEXT NOT NULL,
 UNIQUE(project_id,prerequisite_id,dependent_id), CHECK(prerequisite_id<>dependent_id),
 FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 FOREIGN KEY(project_id,prerequisite_id) REFERENCES tasks(project_id,task_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 FOREIGN KEY(project_id,dependent_id) REFERENCES tasks(project_id,task_id) ON DELETE RESTRICT ON UPDATE RESTRICT
) STRICT;
CREATE TABLE progress_notes (
 note_id TEXT PRIMARY KEY NOT NULL, project_id TEXT NOT NULL,
 task_id TEXT NOT NULL, author_member_id TEXT NOT NULL,
 text TEXT NOT NULL CHECK(length(trim(text))>0), created_at TEXT NOT NULL,
 FOREIGN KEY(project_id) REFERENCES projects(project_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 FOREIGN KEY(project_id,task_id) REFERENCES tasks(project_id,task_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 FOREIGN KEY(project_id,author_member_id) REFERENCES project_members(project_id,member_id) ON DELETE RESTRICT ON UPDATE RESTRICT
) STRICT;
CREATE INDEX members_user_active ON project_members(user_id,active,project_id);
CREATE INDEX members_project_active ON project_members(project_id,active);
CREATE INDEX tasks_assignment ON tasks(project_id,assignee_id);
CREATE INDEX dependencies_incoming ON task_dependencies(project_id,dependent_id,prerequisite_id);
CREATE INDEX notes_task ON progress_notes(project_id,task_id,created_at,note_id);
CREATE INDEX notes_author ON progress_notes(project_id,author_member_id);
