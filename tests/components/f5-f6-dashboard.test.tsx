import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildDashboard } from '@group9/domain';
import { MonitoringPrototype } from '../../src/frontend/src/monitoring/MonitoringPrototype.js';
import * as demoFixture from '../../src/frontend/src/monitoring/demoFixture.js';
import {
  AS_OF_DATE,
  PROJECT_TIME_ZONE,
  VIEWER_MEMBER_ID,
  VIEWER_USER_ID,
  baseTasks,
  makeDependencies,
  makePolicy,
  makeSchedule,
  makeSnapshot,
} from '../fixtures/f5-f6-fixtures.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('F5/F6 fixture-driven dashboard prototype', () => {
  it('renders a visibly labelled demo with 50 percent completion', () => {
    render(<MonitoringPrototype />);
    expect(screen.getByText('DEMO DATA · NO API')).toBeVisible();
    expect(
      screen.getByRole('img', { name: /50% complete; 2 of 4 tasks completed/i }),
    ).toBeVisible();
    expect(screen.getByText('2 of 4 tasks')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Campus event planning' })).toBeVisible();
  });

  it('shows one blocked reason, one overdue fact and the three warning categories', () => {
    render(<MonitoringPrototype />);
    expect(screen.getAllByText('Backend development').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3 days overdue/).length).toBeGreaterThan(0);
    const warnings = screen.getByRole('region', { name: /Schedule warnings/i });
    expect(within(warnings).getAllByText('Blocked critical task').length).toBeGreaterThan(0);
    expect(within(warnings).getAllByText('Project deadline conflict').length).toBeGreaterThan(0);
    expect(within(warnings).getAllByText('Overdue task').length).toBeGreaterThan(0);
    expect(within(warnings).getByText(/Estimated project finish 2026-10-30/i)).toBeVisible();
  });

  it('shows critical and blocked task badges without inventing priority', () => {
    render(<MonitoringPrototype />);
    expect(screen.getAllByText('Critical').length).toBeGreaterThan(0);
    expect(screen.getByText(/Sorted in source order/)).toBeVisible();
    expect(screen.queryByText(/priority score assigned/i)).toBeNull();
  });

  it('treats F3 unavailable as unknown rather than zero blocked', () => {
    render(<MonitoringPrototype initialScenario="f3-unavailable" />);
    expect(screen.getByText('Blocked information is unavailable')).toBeVisible();
    expect(screen.getByText(/unknown, not zero blocked tasks/i)).toBeVisible();
    expect(screen.queryByText('No blocked tasks in the current valid plan.')).toBeNull();
  });

  it('keeps basic F5 information visible when F4 is unavailable', () => {
    render(<MonitoringPrototype initialScenario="f4-unavailable" />);
    expect(screen.getByText('2 of 4 tasks')).toBeVisible();
    expect(screen.getByText('Blocked work')).toBeVisible();
    expect(screen.getByText('UNAVAILABLE')).toBeVisible();
    expect(screen.getByText(/Schedule analysis is unavailable/i)).toBeVisible();
  });

  it('shows FR-15 as not enabled rather than no risk when F6 is off', () => {
    render(<MonitoringPrototype initialScenario="f6-off" />);
    expect(screen.getByText('F6 warning composition is not enabled')).toBeVisible();
    expect(screen.getByText(/FR-15 remains Could Have/i)).toBeVisible();
    expect(screen.queryByText(/No warnings were produced/i)).toBeNull();
  });

  it('distinguishes a known empty blocked set from unknown dependency data', () => {
    render(<MonitoringPrototype initialScenario="no-blockers" />);
    expect(screen.getByText('No blocked tasks in the current valid plan.')).toBeVisible();
  });

  it('shows dates as not evaluated when timezone/date context is missing', () => {
    render(<MonitoringPrototype initialScenario="dates-unknown" />);
    expect(screen.getByText(/task date comparison\(s\) not evaluated/i)).toBeVisible();
    expect(screen.getByText(/not proof that the task is on time/i)).toBeVisible();
  });

  it('uses a neutral empty-project state instead of zero percent', () => {
    render(<MonitoringPrototype initialScenario="empty" />);
    expect(screen.getAllByText('No tasks yet').length).toBeGreaterThan(0);
    expect(screen.queryByText('0%')).toBeNull();
    expect(screen.getAllByText(/Completion is undefined/i).length).toBeGreaterThan(0);
  });

  it('renders a loading skeleton with an accessible busy status', () => {
    render(<MonitoringPrototype initialScenario="loading" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Loading dashboard data')).toBeInTheDocument();
  });

  it('renders a safe error for an inaccessible project', () => {
    render(<MonitoringPrototype initialScenario="access-denied" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid or inaccessible project.');
    expect(screen.queryByText('Campus event planning')).not.toBeInTheDocument();
  });

  it('renders a safe source error without private project data', () => {
    render(<MonitoringPrototype initialScenario="source-error" />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The project source could not be read consistently',
    );
    expect(screen.queryByText('Campus event planning')).not.toBeInTheDocument();
  });

  it('switches scenarios through labelled, keyboard-operable buttons', () => {
    render(<MonitoringPrototype />);
    const f4 = screen.getByRole('button', { name: 'F4 unavailable' });
    expect(f4).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(f4);
    expect(f4).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Schedule analysis is unavailable/i)).toBeVisible();
  });

  it.each([
    {
      scenario: 'shows partial overdue evaluation without an all-clear',
      deadline: '2026-10-29',
      explanation: 'Overdue status could not be evaluated for 1 of 2 unfinished tasks. Overdue risk remains unknown for those tasks.',
      hasOverdue: false,
    },
    {
      scenario: 'explains all unfinished dates are unevaluable',
      deadline: null,
      explanation: 'No candidate task date comparison could be evaluated; overdue risk remains unknown.',
      hasOverdue: false,
    },
    {
      scenario: 'keeps the confirmed overdue item and explains the unevaluated remainder',
      deadline: '2026-10-22',
      explanation: 'Overdue status could not be evaluated for 1 of 2 unfinished tasks. Confirmed overdue tasks are still shown.',
      hasOverdue: true,
    },
  ])('IT-C10 $scenario', ({ deadline, explanation, hasOverdue }) => {
    const tasks = baseTasks().map((task) => ({
      ...task,
      taskDeadline: task.taskId === 'C' ? deadline : null,
    }));
    const policy = makePolicy();
    const result = buildDashboard(
      {
        context: {
          actorId: VIEWER_USER_ID,
          viewerMemberId: VIEWER_MEMBER_ID,
          asOfDate: AS_OF_DATE,
          snapshot: makeSnapshot({ tasks }),
        },
        dependencies: makeDependencies({ edges: [] }),
        schedule: makeSchedule({ estimatedProjectFinish: '2026-10-29' }),
      },
      policy,
      { projectTimeZone: PROJECT_TIME_ZONE },
    );
    if (!result.ok) throw new Error(result.error.message);
    expect(result.summary.warnings.evaluationByType?.OVERDUE_TASK.explanation).toBe(explanation);
    vi.spyOn(demoFixture, 'demoResult').mockReturnValue({
      scenario: 'healthy',
      result,
      policy,
      projectTimeZone: PROJECT_TIME_ZONE,
    });

    render(<MonitoringPrototype />);

    const warnings = screen.getByRole('region', { name: /Schedule warnings/i });
    expect(within(warnings).getByText(explanation)).toBeVisible();
    expect(within(warnings).queryByText(/No warnings were produced/i)).toBeNull();
    if (hasOverdue) {
      expect(within(warnings).getByText(/Backend development is unfinished and 3 days overdue/)).toBeVisible();
    } else {
      expect(within(warnings).getByText('Unknown')).toBeVisible();
      expect(within(warnings).queryByText(/is unfinished and .* overdue/)).toBeNull();
    }
  });

  it('marks warning categories individually and never claims an all-clear', () => {
    render(<MonitoringPrototype initialScenario="f4-unavailable" />);
    const warnings = screen.getByRole('region', { name: /Schedule warnings/i });
    expect(within(warnings).getAllByText('Unknown').length).toBeGreaterThanOrEqual(2);
    expect(within(warnings).queryByText(/No warnings were produced/)).toBeNull();
    expect(
      within(warnings).getByText(/Backend development is unfinished and 3 days overdue/),
    ).toBeVisible();
  });
});
