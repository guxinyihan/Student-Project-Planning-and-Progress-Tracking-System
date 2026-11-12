import { cleanup, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { MonitoringPrototype } from '../../src/frontend/src/monitoring/MonitoringPrototype.js';
import { demoResult } from '../../src/frontend/src/monitoring/demoFixture.js';

afterEach(() => cleanup());

describe('F5/F6 disabled-capability prototype regressions', () => {
  it('keeps the F3-off fixture current but discards the supplied schedule', () => {
    const demo = demoResult('f3-unavailable');
    expect(demo?.policy.f3Enabled).toBe(false);
    expect(demo?.result.ok).toBe(true);
    if (!demo?.result.ok) throw new Error('Expected a safely degraded dashboard.');
    expect(demo.result.summary.schedule).toMatchObject({
      availability: 'UNAVAILABLE',
      reasonCode: 'DEPENDENCY_INPUT_UNAVAILABLE',
      criticalTaskIds: null,
      estimatedProjectFinish: null,
    });
  });

  it('shows F3-off unknown criticality while keeping independent overdue facts', () => {
    render(<MonitoringPrototype initialScenario="f3-unavailable" />);
    const schedule = screen.getByRole('region', { name: 'Schedule context' });
    expect(within(schedule).getByText('UNAVAILABLE')).toBeVisible();
    expect(within(schedule).queryByText('2026-10-30')).toBeNull();
    expect(screen.getByText('2 of 4 tasks')).toBeVisible();
    expect(screen.getAllByText(/3 days overdue/).length).toBeGreaterThan(0);
    const table = screen.getByRole('region', { name: 'Assigned to me' });
    expect(within(table).queryAllByText('Critical')).toHaveLength(1);
    expect(within(table).getAllByText('Unknown').length).toBeGreaterThanOrEqual(4);
  });

  it('discards a valid old schedule in the explicit F4-off fixture', () => {
    const demo = demoResult('f4-off');
    expect(demo?.policy.f4Enabled).toBe(false);
    expect(demo?.result.ok).toBe(true);
    if (!demo?.result.ok) throw new Error('Expected a safely degraded dashboard.');
    expect(demo.result.summary.schedule).toMatchObject({
      availability: 'NOT_ENABLED',
      reasonCode: 'FEATURE_NOT_ENABLED',
      criticalTaskIds: null,
      estimatedProjectFinish: null,
    });
    render(<MonitoringPrototype initialScenario="f4-off" />);
    const schedule = screen.getByRole('region', { name: 'Schedule context' });
    expect(within(schedule).getByText('NOT_ENABLED')).toBeVisible();
    expect(within(schedule).queryByText('2026-10-30')).toBeNull();
    const warnings = screen.getByRole('region', { name: 'Schedule warnings' });
    expect(within(warnings).getAllByText('Unknown')).toHaveLength(2);
    expect(screen.getAllByText(/3 days overdue/).length).toBeGreaterThan(0);
  });
});
