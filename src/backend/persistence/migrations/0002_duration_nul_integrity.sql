-- Forward-only integrity supplement; 0001_initial.sql remains immutable.
-- Triggers avoid rebuilding tasks and disturbing its dependent foreign keys/indexes.
CREATE TRIGGER tasks_duration_no_nul_insert
BEFORE INSERT ON tasks
FOR EACH ROW
WHEN NEW.duration_days IS NOT NULL AND instr(NEW.duration_days, char(0)) > 0
BEGIN
  SELECT RAISE(ABORT, 'Invalid duration_days: embedded NUL is not allowed.');
END;

CREATE TRIGGER tasks_duration_no_nul_update
BEFORE UPDATE ON tasks
FOR EACH ROW
WHEN NEW.duration_days IS NOT NULL AND instr(NEW.duration_days, char(0)) > 0
BEGIN
  SELECT RAISE(ABORT, 'Invalid duration_days: embedded NUL is not allowed.');
END;
