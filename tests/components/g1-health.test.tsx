import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HealthResponse } from '@group9/shared';
import { App } from '../../src/frontend/src/App.js';

const healthy: HealthResponse = {
  ok: true,
  service: 'group9-backend',
  stage: 'G1_FOUNDATION',
  businessEndpointsEnabled: false,
};
const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('G1 frontend health presentation (mocked HTTP, not G1-T12)', () => {
  it('shows loading and requests the relative backend health path', () => {
    fetchMock.mockReturnValue(new Promise<Response>(() => undefined));
    render(<App />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Checking connection…')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Checking…' })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledWith(
      '/health',
      expect.objectContaining({ signal: expect.any(AbortSignal), cache: 'no-store' }),
    );
    expect(screen.queryByText('Connected')).not.toBeInTheDocument();
  });

  it('shows connected only after a verified shared health response', async () => {
    fetchMock.mockResolvedValue(jsonResponse(healthy));
    render(<App />);

    expect(await screen.findByText('Connected')).toBeVisible();
    expect(
      screen.getByText('The backend is responding. Business endpoints are disabled.'),
    ).toBeVisible();
    expect(screen.getAllByText('Not implemented')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Check again' })).toBeEnabled();
  });

  it('does not show connected for an HTTP200 response with an incompatible payload', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ...healthy, businessEndpointsEnabled: true }));
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'health response was not recognized',
    );
    expect(screen.queryByText('Connected')).not.toBeInTheDocument();
  });

  it('reports malformed JSON as an invalid health response', async () => {
    fetchMock.mockResolvedValue(new Response('{', { status: 200 }));
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'did not return a valid health response',
    );
    expect(screen.queryByText('Connected')).not.toBeInTheDocument();
  });

  it('reports an unsuccessful backend HTTP status without claiming connectivity', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 503));
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 503');
    expect(screen.queryByText('Connected')).not.toBeInTheDocument();
  });

  it('lets the user retry a failed request and validates the new response', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse(healthy));
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the backend');
    fireEvent.click(screen.getByRole('button', { name: 'Retry connection' }));
    expect(await screen.findByText('Connected')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('aborts an outstanding request when its component is unmounted', () => {
    fetchMock.mockReturnValue(new Promise<Response>(() => undefined));
    const { unmount } = render(<App />);
    const request = fetchMock.mock.calls[0]?.[1];

    expect(request?.signal?.aborted).toBe(false);
    unmount();
    expect(request?.signal?.aborted).toBe(true);
  });

  it('ignores the late result of the cleaned-up StrictMode request', async () => {
    let completeOldRequest: (response: Response) => void = () => undefined;
    const oldRequest = new Promise<Response>((resolve) => {
      completeOldRequest = resolve;
    });
    fetchMock.mockReturnValueOnce(oldRequest).mockResolvedValueOnce(jsonResponse(healthy));
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    expect(await screen.findByText('Connected')).toBeVisible();
    await act(async () => {
      completeOldRequest(jsonResponse({ ok: false }));
    });
    expect(screen.getByText('Connected')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('times out a request that never finishes and enables retry', () => {
    vi.useFakeTimers();
    fetchMock.mockReturnValue(new Promise<Response>(() => undefined));
    render(<App />);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByRole('alert')).toHaveTextContent('connection check timed out');
    expect(screen.getByRole('button', { name: 'Retry connection' })).toBeEnabled();
  });
});
