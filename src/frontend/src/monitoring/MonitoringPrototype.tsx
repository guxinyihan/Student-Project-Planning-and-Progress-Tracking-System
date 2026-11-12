import { useState, type ReactNode } from 'react';
import type {
  Availability,
  DashboardResult,
  DashboardSummary,
  TaskDisplayView,
  TaskStatus,
  WarningEvaluation,
  WarningType,
} from '@group9/shared';
import { DEMO_SCENARIOS, DEMO_TIME_ZONE, demoResult, type DemoScenario } from './demoFixture.js';

const STATUS_LABEL: Record<TaskStatus, string> = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
};

const WARNING_LABEL: Record<WarningType, string> = {
  OVERDUE_TASK: 'Overdue task',
  BLOCKED_CRITICAL_TASK: 'Blocked critical task',
  PROJECT_DEADLINE_CONFLICT: 'Project deadline conflict',
};

const EVALUATION_LABEL: Record<Availability, string> = {
  VALID: 'Evaluated',
  NO_TASKS: 'No tasks',
  NOT_ENABLED: 'Not enabled',
  UNAVAILABLE: 'Unknown',
};

function displayPercent(value: number | null): string {
  if (value === null) return 'No tasks';
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

function evaluationClass(evaluation: WarningEvaluation | undefined): string {
  if (!evaluation) return 'evaluation evaluation--unknown';
  if (evaluation.availability === 'VALID') return 'evaluation evaluation--valid';
  if (evaluation.availability === 'NO_TASKS') return 'evaluation evaluation--neutral';
  return 'evaluation evaluation--unknown';
}

function warningCount(summary: DashboardSummary, type: WarningType): number {
  return summary.warnings.items?.filter((item) => item.type === type).length ?? 0;
}

function taskNameMap(summary: DashboardSummary): Map<string, string> {
  const names = new Map<string, string>();
  for (const item of summary.assignedTasks.items) names.set(item.task.taskId, item.task.name);
  return names;
}

function scenarioLabel(scenario: DemoScenario): string {
  return DEMO_SCENARIOS.find((item) => item.id === scenario)?.label ?? scenario;
}

function ProgressCard({ summary }: { summary: DashboardSummary }) {
  const progress = summary.progress;
  const percent = progress.percentage ?? 0;
  const circumference = 2 * Math.PI * 48;
  const dash = (percent / 100) * circumference;
  return (
    <section className="panel panel--progress" aria-labelledby="progress-title">
      <div className="panel-heading">
        <h2 id="progress-title">Overall completion</h2>
        <span className="eyebrow">Task count, not effort</span>
      </div>
      {progress.availability === 'NO_TASKS' ? (
        <div className="empty-inline">
          <strong>No tasks yet</strong>
          <p>Completion is undefined. This is not 0% complete.</p>
        </div>
      ) : (
        <div className="progress-layout">
          <div
            className="donut"
            role="img"
            aria-label={`${displayPercent(progress.percentage)} complete; ${progress.completedTasks} of ${progress.totalTasks} tasks completed`}
          >
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle className="donut-track" cx="60" cy="60" r="48" />
              <circle
                className="donut-value"
                cx="60"
                cy="60"
                r="48"
                strokeDasharray={`${dash} ${circumference}`}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="donut-label">
              <strong>{displayPercent(progress.percentage)}</strong>
              <span>complete</span>
            </div>
          </div>
          <div className="progress-copy">
            <p className="metric">
              {progress.completedTasks} of {progress.totalTasks} tasks
            </p>
            <p>
              Raw status every task contributes exactly one count. Unassigned tasks stay in the
              project total.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function StatusCard({ summary }: { summary: DashboardSummary }) {
  const counts = summary.rawStatusCounts;
  const total = summary.progress.totalTasks;
  const ordered: { status: TaskStatus; className: string }[] = [
    { status: 'COMPLETED', className: 'status-completed' },
    { status: 'IN_PROGRESS', className: 'status-progress' },
    { status: 'NOT_STARTED', className: 'status-not-started' },
  ];
  return (
    <section className="panel" aria-labelledby="status-title">
      <div className="panel-heading">
        <h2 id="status-title">Raw task status</h2>
        <span className="eyebrow">Blocked is a separate overlay</span>
      </div>
      <div className="status-bar" aria-hidden="true">
        {total === 0 ? (
          <span className="status-empty" />
        ) : (
          ordered.map(({ status, className }) =>
            counts[status] > 0 ? (
              <span
                key={status}
                className={`status-segment ${className}`}
                style={{ width: `${(counts[status] / total) * 100}%` }}
              />
            ) : null,
          )
        )}
      </div>
      <ul className="status-legend" aria-label="Raw status counts">
        {ordered.map(({ status, className }) => (
          <li key={status}>
            <span className={`legend-dot ${className}`} aria-hidden="true" />
            <span>{STATUS_LABEL[status]}</span>
            <strong>{counts[status]}</strong>
          </li>
        ))}
        <li className="legend-blocked">
          <span className="legend-dot status-blocked" aria-hidden="true" />
          <span>Blocked overlay</span>
          <strong>
            {summary.blockedResult.availability === 'VALID' ||
            summary.blockedResult.availability === 'NO_TASKS'
              ? `${summary.blockedResult.blockedTaskIds?.length ?? 0}`
              : 'unknown'}
          </strong>
        </li>
      </ul>
      <p className="fineprint">
        The overlay does not add a fourth denominator entry or hide a raw status.
      </p>
    </section>
  );
}

function HealthCard({ summary }: { summary: DashboardSummary }) {
  const warnings = summary.warnings;
  const known = warnings.availability === 'VALID' || warnings.availability === 'NO_TASKS';
  const valueFor = (type: WarningType): string | number => {
    const evaluation = warnings.evaluationByType?.[type];
    if (
      !evaluation ||
      (evaluation.availability !== 'VALID' && evaluation.availability !== 'NO_TASKS')
    ) {
      return 'Unknown';
    }
    return warningCount(summary, type);
  };
  return (
    <section className="panel" aria-labelledby="health-title">
      <div className="panel-heading">
        <h2 id="health-title">Risk at a glance</h2>
        <span className="eyebrow">FR-15 · Could Have</span>
      </div>
      {!known ? (
        <div className="unknown-inline">
          <strong>Warnings are not available</strong>
          <p>
            {warnings.reasonCode === 'FEATURE_NOT_ENABLED'
              ? 'F6 is not enabled in this configuration.'
              : 'No current warning set could be composed.'}
          </p>
        </div>
      ) : (
        <div className="health-list">
          <div>
            <span>Project conflict</span>
            <strong>{valueFor('PROJECT_DEADLINE_CONFLICT')}</strong>
          </div>
          <div>
            <span>Blocked critical</span>
            <strong>{valueFor('BLOCKED_CRITICAL_TASK')}</strong>
          </div>
          <div>
            <span>Overdue</span>
            <strong>{valueFor('OVERDUE_TASK')}</strong>
          </div>
          <p className="fineprint">
            Counts of evaluated warnings; unknown is not zero. Not a risk score.
          </p>
        </div>
      )}
    </section>
  );
}

function statusBadge(item: TaskDisplayView): ReactNode {
  if (item.isBlocked === true) return <span className="badge badge--blocked">Blocked</span>;
  if (item.isBlocked === false) return <span className="badge badge--neutral">Not blocked</span>;
  return <span className="badge badge--unknown">Unknown</span>;
}

function criticalBadge(item: TaskDisplayView): ReactNode {
  if (item.isCritical === true) return <span className="badge badge--critical">Critical</span>;
  if (item.isCritical === false) return <span className="badge badge--neutral">Not critical</span>;
  return <span className="badge badge--unknown">Unknown</span>;
}

function AssignedTable({ summary }: { summary: DashboardSummary }) {
  const items = summary.assignedTasks.items;
  return (
    <section className="panel panel--wide" aria-labelledby="assigned-title">
      <div className="panel-heading">
        <h2 id="assigned-title">Assigned to me</h2>
        <span className="eyebrow">Membership ID match · source order</span>
      </div>
      {summary.assignedTasks.availability === 'NO_TASKS' ? (
        <p className="empty-copy">No tasks exist in this project.</p>
      ) : items.length === 0 ? (
        <p className="empty-copy">
          No tasks are assigned to this project member. Project totals still include all tasks.
        </p>
      ) : (
        <div className="table-scroll">
          <table>
            <caption className="sr-only">Tasks assigned to the current member</caption>
            <thead>
              <tr>
                <th scope="col">Task</th>
                <th scope="col">Raw status</th>
                <th scope="col">Deadline</th>
                <th scope="col">Blocked</th>
                <th scope="col">Critical</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.task.taskId}>
                  <th scope="row">
                    <span>{item.task.name}</span>
                    <small>Task {item.task.taskId}</small>
                  </th>
                  <td data-label="Raw status">
                    <span
                      className={`badge badge--${item.rawStatus.toLowerCase().replace('_', '-')}`}
                    >
                      {STATUS_LABEL[item.rawStatus]}
                    </span>
                  </td>
                  <td data-label="Deadline">
                    {item.task.taskDeadline ?? <span className="muted">Not set</span>}
                  </td>
                  <td data-label="Blocked">{statusBadge(item)}</td>
                  <td data-label="Critical">{criticalBadge(item)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="fineprint">Sorted in source order. No priority score or ranking is inferred.</p>
    </section>
  );
}

function BlockedCard({ summary }: { summary: DashboardSummary }) {
  const blocked = summary.blockedResult;
  const known = blocked.availability === 'VALID' || blocked.availability === 'NO_TASKS';
  const entries = Object.entries(blocked.byTaskId ?? {});
  const names = taskNameMap(summary);
  return (
    <section className="panel panel--blocked" aria-labelledby="blocked-title">
      <div className="panel-heading">
        <h2 id="blocked-title">Blocked work</h2>
        <span className="eyebrow">Direct prerequisites only</span>
      </div>
      {!known ? (
        <div className="unknown-inline">
          <strong>Blocked information is unavailable</strong>
          <p>
            {blocked.availability === 'NOT_ENABLED'
              ? 'Dependency tracking is not enabled.'
              : 'The current dependency view could not be trusted.'}{' '}
            This is unknown, not zero blocked tasks.
          </p>
        </div>
      ) : blocked.availability === 'NO_TASKS' || entries.length === 0 ? (
        <p className="empty-copy">
          {blocked.availability === 'NO_TASKS'
            ? 'No tasks yet.'
            : 'No blocked tasks in the current valid plan.'}
        </p>
      ) : (
        <ul className="blocked-list">
          {entries.map(([taskId, reason]) => (
            <li key={taskId}>
              <div className="blocked-heading">
                <strong>{names.get(taskId) ?? `Task ${taskId}`}</strong>
                <span className="badge badge--blocked">Blocked</span>
              </div>
              <p>
                Waiting for{' '}
                {reason.incompletePrerequisites.map((prerequisite, index) => (
                  <span key={prerequisite.taskId}>
                    {index > 0 ? ', ' : ''}
                    <b>{prerequisite.name}</b> ({STATUS_LABEL[prerequisite.rawStatus]})
                  </span>
                ))}
                .
              </p>
              <small>
                Raw task status remains stored. An authorized status update is still possible.
              </small>
            </li>
          ))}
        </ul>
      )}
      <p className="fineprint">Completed tasks are never listed as unfinished blocked work.</p>
    </section>
  );
}

function OverdueCard({ summary }: { summary: DashboardSummary }) {
  const overdue = summary.overdueResult;
  const names = taskNameMap(summary);
  return (
    <section className="panel panel--overdue" aria-labelledby="overdue-title">
      <div className="panel-heading">
        <h2 id="overdue-title">Overdue facts</h2>
        <span className="eyebrow">Unfinished tasks only</span>
      </div>
      {overdue.availability === 'NO_TASKS' ? (
        <p className="empty-copy">No tasks yet.</p>
      ) : overdue.items.length > 0 ? (
        <ul className="overdue-list">
          {overdue.items.map((item) => (
            <li key={item.taskId}>
              <strong>{names.get(item.taskId) ?? `Task ${item.taskId}`}</strong>
              <span>
                {item.daysOverdue} {item.daysOverdue === 1 ? 'day' : 'days'} overdue
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-copy">No evaluated task is overdue.</p>
      )}
      {overdue.notEvaluatedTaskIds.length > 0 ? (
        <div className="unknown-inline unknown-inline--compact">
          <strong>
            {overdue.notEvaluatedTaskIds.length} task date comparison(s) not evaluated
          </strong>
          <p>Missing dates or a missing project timezone are not proof that the task is on time.</p>
        </div>
      ) : null}
    </section>
  );
}

function WarningsCard({ summary }: { summary: DashboardSummary }) {
  const warnings = summary.warnings;
  const names = taskNameMap(summary);
  const evaluations = warnings.evaluationByType;
  const overdueExplanation = evaluations?.OVERDUE_TASK.explanation;
  const anyUnknown =
    evaluations !== null &&
    Object.values(evaluations).some(
      (entry) => entry.availability === 'UNAVAILABLE' || entry.availability === 'NOT_ENABLED',
    );
  return (
    <section className="panel panel--wide" aria-labelledby="warnings-title">
      <div className="panel-heading">
        <h2 id="warnings-title">Schedule warnings</h2>
        <span className="eyebrow">Each category has its own status</span>
      </div>
      {warnings.availability === 'NOT_ENABLED' ? (
        <div className="unknown-inline">
          <strong>F6 warning composition is not enabled</strong>
          <p>
            FR-15 remains Could Have. Basic progress and overdue facts above are still F5
            information.
          </p>
        </div>
      ) : warnings.availability === 'NO_TASKS' ? (
        <p className="empty-copy">No tasks yet. There are no warning categories to evaluate.</p>
      ) : (
        <>
          <div className="evaluation-grid" aria-label="Warning category evaluation status">
            {(Object.keys(WARNING_LABEL) as WarningType[]).map((type) => {
              const entry = evaluations?.[type];
              return (
                <div key={type} className="evaluation-row">
                  <span>{WARNING_LABEL[type]}</span>
                  <span className={evaluationClass(entry)}>
                    {entry ? EVALUATION_LABEL[entry.availability] : 'Unknown'}
                  </span>
                </div>
              );
            })}
          </div>
          {overdueExplanation ? <p className="fineprint">{overdueExplanation}</p> : null}
          {warnings.items && warnings.items.length > 0 ? (
            <ul className="warning-list" aria-live="polite">
              {warnings.items.map((warning, index) => (
                <li key={`${warning.type}-${warning.taskId ?? 'project'}-${index}`}>
                  <span className="warning-type">{WARNING_LABEL[warning.type]}</span>
                  <p>{warning.message}</p>
                  {warning.taskId ? (
                    <small>Task {names.get(warning.taskId) ?? warning.taskId}</small>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : anyUnknown ? (
            <p className="unknown-copy">
              No warning can be asserted for an unevaluated category. Empty is not a no-risk result.
            </p>
          ) : (
            <p className="empty-copy">
              No warnings were produced for the three evaluated categories.
            </p>
          )}
        </>
      )}
      <p className="fineprint">
        No pop-ups, AI prediction, CPM recalculation or automatic reassignment.
      </p>
    </section>
  );
}

function ScheduleCard({ summary }: { summary: DashboardSummary }) {
  const schedule = summary.schedule;
  const names = taskNameMap(summary);
  const valid = schedule.availability === 'VALID';
  return (
    <section className="panel panel--schedule" aria-labelledby="schedule-title">
      <div className="panel-heading">
        <h2 id="schedule-title">Schedule context</h2>
        <span className="eyebrow">Consumed from F4</span>
      </div>
      <div className="schedule-grid">
        <div>
          <span className="schedule-label">Availability</span>
          <strong className={`availability availability--${schedule.availability.toLowerCase()}`}>
            {schedule.availability}
          </strong>
        </div>
        <div>
          <span className="schedule-label">Estimated finish</span>
          <strong>{schedule.estimatedProjectFinish ?? 'Unknown'}</strong>
        </div>
        <div>
          <span className="schedule-label">Relative duration</span>
          <strong>{schedule.durationDays ? `${schedule.durationDays} days` : 'Unknown'}</strong>
        </div>
        <div>
          <span className="schedule-label">Critical tasks</span>
          <strong>
            {schedule.criticalTaskIds
              ? schedule.criticalTaskIds.map((id) => names.get(id) ?? id).join(', ')
              : 'Unknown'}
          </strong>
        </div>
      </div>
      {!valid ? (
        <p className="fineprint">
          {schedule.reasonCode ?? schedule.finishReasonCode ?? 'No current schedule result'} ·
          unknown is not an empty critical set.
        </p>
      ) : (
        <p className="fineprint">
          Critical IDs and finish are supplied by F4; this prototype never runs CPM.
        </p>
      )}
    </section>
  );
}

function Notices({ summary }: { summary: DashboardSummary }) {
  if (summary.notices.length === 0) return null;
  return (
    <section className="notices" aria-labelledby="notices-title">
      <h2 id="notices-title">Capability notices</h2>
      <ul>
        {summary.notices.map((notice) => (
          <li key={notice.capability}>
            <strong>{notice.capability}</strong>
            <span>{notice.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DashboardView({ result, timeZone }: { result: DashboardResult; timeZone: string | null }) {
  if (!result.ok) {
    return (
      <section className="state-card state-card--error" role="alert">
        <span className="state-kicker">Dashboard unavailable</span>
        <h2>{result.error.message}</h2>
        <p>Private project data is not shown for an inaccessible or inconsistent source.</p>
      </section>
    );
  }
  const summary = result.summary;
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Project overview</p>
          <h1>{summary.name}</h1>
          <p className="subtitle">Progress and schedule risk from one coherent project revision.</p>
        </div>
        <div className="asof">
          <span>As of {summary.asOfDate}</span>
          <span>Revision {summary.revision}</span>
          <span>{timeZone ?? 'Project timezone not supplied'}</span>
        </div>
      </div>
      <div className="dashboard-grid">
        <ProgressCard summary={summary} />
        <StatusCard summary={summary} />
        <HealthCard summary={summary} />
        <AssignedTable summary={summary} />
        <BlockedCard summary={summary} />
        <OverdueCard summary={summary} />
        <WarningsCard summary={summary} />
        <ScheduleCard summary={summary} />
      </div>
      <Notices summary={summary} />
    </>
  );
}

function LoadingState() {
  return (
    <div className="loading-grid" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading dashboard data</span>
      <div className="skeleton skeleton--hero" />
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton skeleton--wide" />
    </div>
  );
}

export function MonitoringPrototype({
  initialScenario = 'healthy',
}: {
  initialScenario?: DemoScenario;
}) {
  const [scenario, setScenario] = useState<DemoScenario>(initialScenario);
  const demo = demoResult(scenario);

  return (
    <>
      <a className="skip-link" href="#monitoring-main">
        Skip to dashboard
      </a>
      <header className="prototype-header">
        <div className="prototype-header__inner">
          <div className="brand">
            <strong>XINGMANG</strong>
            <span>Group 9 · F5 / F6</span>
          </div>
          <span className="demo-badge">DEMO DATA · NO API</span>
        </div>
      </header>
      <main id="monitoring-main" className="prototype-main">
        <section className="prototype-intro" aria-labelledby="prototype-title">
          <p className="eyebrow">Isolated frontend prototype</p>
          <h1 id="prototype-title">Progress &amp; risk dashboard</h1>
          <p>
            Every view below is built from an explicit fixture snapshot. There is no production
            authentication, database read or business API call. F5 is Must Have; optional F6
            warnings stay labelled as Could Have.
          </p>
        </section>

        <nav className="scenario-bar" aria-label="Demo scenarios">
          <span className="scenario-label">Preview scenario</span>
          <div className="scenario-buttons">
            {DEMO_SCENARIOS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={
                  scenario === item.id
                    ? 'scenario-button scenario-button--active'
                    : 'scenario-button'
                }
                aria-pressed={scenario === item.id}
                title={item.hint}
                onClick={() => setScenario(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        <p className="sr-only" aria-live="polite">
          {scenarioLabel(scenario)} fixture selected.
        </p>

        <div className="prototype-canvas">
          {scenario === 'loading' ? (
            <LoadingState />
          ) : demo ? (
            <DashboardView result={demo.result} timeZone={demo.projectTimeZone} />
          ) : (
            <LoadingState />
          )}
        </div>
      </main>
      <footer className="prototype-footer">
        <span>
          Isolated F5/F6 prototype · fixture-driven · {DEMO_TIME_ZONE} candidate fixture only
        </span>
        <span>Zhang Yuyang · Group 9</span>
      </footer>
    </>
  );
}
