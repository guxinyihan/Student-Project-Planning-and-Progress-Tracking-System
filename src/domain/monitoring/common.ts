import type {
  LocalDate,
  ProjectId,
  ProjectSnapshot,
  Revision,
  TaskId,
  TaskSnapshot,
} from '@group9/shared';
import { isLocalDate } from '@group9/shared';

/** Internal monitoring helper; not a shared DTO. */
export function revisionMatches(actual: Revision, expected: Revision): boolean {
  return actual === expected;
}

export function assertUniqueTaskIds(tasks: readonly TaskSnapshot[]): void {
  const seen = new Set<string>();
  for (const task of tasks) {
    if (seen.has(task.taskId)) {
      throw new TypeError('Duplicate taskId in coherent snapshot.');
    }
    seen.add(task.taskId);
  }
}

/** Tasks-only boundaries can validate one project universe, without choosing a caller's project. */
export function assertCoherentTasks(
  tasks: readonly TaskSnapshot[],
  projectId: ProjectId | undefined = tasks[0]?.projectId,
): void {
  assertUniqueTaskIds(tasks);
  if (tasks.some((task) => task.projectId !== projectId)) {
    throw new TypeError('Project source is not coherent.');
  }
}

/** Validate source consistency; authorization remains the caller's separate responsibility. */
export function assertCoherentSnapshot(snapshot: ProjectSnapshot): void {
  assertCoherentTasks(snapshot.tasks, snapshot.projectId);
  if (
    snapshot.members.some(
      (member) =>
        member.projectId !== snapshot.projectId || member.active !== (member.leftAt === null),
    )
  ) {
    throw new TypeError('Project source is not coherent.');
  }
}

export function taskIndex(tasks: readonly TaskSnapshot[]): Map<TaskId, TaskSnapshot> {
  assertCoherentTasks(tasks);
  const byId = new Map<TaskId, TaskSnapshot>();
  for (const task of tasks) byId.set(task.taskId, task);
  return byId;
}

/** Calendar-day difference using Gregorian components only; never the host timezone. */
export function calendarDaysBetween(from: LocalDate, to: LocalDate): number | null {
  if (!isLocalDate(from) || !isLocalDate(to)) return null;
  const ordinal = (date: LocalDate): number => {
    const year = Number(date.slice(0, 4));
    const month = Number(date.slice(5, 7));
    const day = Number(date.slice(8, 10));
    const priorYears = year - 1;
    const daysBeforeMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    const leapDay = month > 2 && year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 1 : 0;
    return (
      365 * priorYears +
      Math.floor(priorYears / 4) -
      Math.floor(priorYears / 100) +
      Math.floor(priorYears / 400) +
      daysBeforeMonth[month - 1]! +
      leapDay +
      day
    );
  };
  return ordinal(to) - ordinal(from);
}

export function pluralDays(value: number): string {
  return `${value} ${value === 1 ? 'day' : 'days'}`;
}
