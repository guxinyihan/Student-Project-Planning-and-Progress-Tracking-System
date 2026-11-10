import { useEffect, useState } from 'react';
import { isHealthResponse, type HealthResponse } from '@group9/shared';

type ConnectionState =
  | { kind: 'loading' }
  | { kind: 'connected'; response: HealthResponse }
  | { kind: 'error'; message: string };

class HealthCheckError extends Error {}

const developmentAreas = [
  {
    scope: 'F1 / F2',
    name: 'Projects and tasks',
    description: 'Project members, task ownership and saved progress notes.',
  },
  {
    scope: 'F3 / F4',
    name: 'Dependencies and schedules',
    description: 'Task relationships, estimated schedules and critical activities.',
  },
  {
    scope: 'F5 / F6',
    name: 'Progress and warnings',
    description: 'Completion, direct blockers and understandable schedule warnings.',
  },
] as const;

export function App() {
  const [attempt, setAttempt] = useState(0);
  const [connection, setConnection] = useState<ConnectionState>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => {
      if (!active) return;
      controller.abort();
      setConnection({
        kind: 'error',
        message: 'The connection check timed out. Confirm the backend is running, then try again.',
      });
    }, 10_000);

    async function checkHealth() {
      try {
        const response = await fetch('/health', {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new HealthCheckError(
            `The backend returned HTTP ${response.status}. Check that it is running, then try again.`,
          );
        }
        let body: unknown;
        try {
          body = await response.json();
        } catch {
          throw new HealthCheckError('The server did not return a valid health response.');
        }
        if (!isHealthResponse(body)) {
          throw new HealthCheckError(
            'The server replied, but its health response was not recognized.',
          );
        }
        if (active && !controller.signal.aborted) {
          setConnection({ kind: 'connected', response: body });
        }
      } catch (error: unknown) {
        if (!active || controller.signal.aborted) return;
        setConnection({
          kind: 'error',
          message:
            error instanceof HealthCheckError
              ? error.message
              : 'Unable to reach the backend. Check that it is running, then try again.',
        });
      } finally {
        window.clearTimeout(timeout);
      }
    }

    void checkHealth();
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);

  function retryConnection() {
    setConnection({ kind: 'loading' });
    setAttempt((value) => value + 1);
  }

  const statusLabel =
    connection.kind === 'connected'
      ? 'Connected'
      : connection.kind === 'error'
        ? 'Connection unavailable'
        : 'Checking connection…';

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="page-width header-content">
          <div className="brand">
            <strong>Xingmang</strong>
            <span>Group 9</span>
          </div>
          <span className="stage-label">G1 foundation</span>
        </div>
      </header>
      <main id="main-content" className="page-width" tabIndex={-1}>
        <section className="introduction" aria-labelledby="page-title">
          <h1 id="page-title">Student project planning</h1>
          <p>Plan tasks, understand dependencies, and follow team progress.</p>
          <p className="preview-note">
            Foundation preview. Project workflows are not implemented yet.
          </p>
        </section>

        <section className="connection-panel" aria-labelledby="connection-title">
          <div className="section-heading">
            <h2 id="connection-title">Backend connection</h2>
            <p>This check makes a live request to the local service.</p>
          </div>
          <div className="connection-content">
            <div
              className={`connection-state connection-state--${connection.kind}`}
              role={connection.kind === 'error' ? 'alert' : 'status'}
              aria-live={connection.kind === 'error' ? 'assertive' : 'polite'}
              aria-atomic="true"
              aria-busy={connection.kind === 'loading'}
            >
              <span className="status-marker" aria-hidden="true" />
              <div>
                <h3>{statusLabel}</h3>
                <p>
                  {connection.kind === 'connected'
                    ? 'The backend is responding. Business endpoints are disabled.'
                    : connection.kind === 'error'
                      ? connection.message
                      : 'Waiting for a verified health response from the backend.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={retryConnection}
              disabled={connection.kind === 'loading'}
            >
              {connection.kind === 'loading'
                ? 'Checking…'
                : connection.kind === 'error'
                  ? 'Retry connection'
                  : 'Check again'}
            </button>
          </div>
        </section>

        <section className="development-section" aria-labelledby="development-title">
          <div className="section-heading">
            <h2 id="development-title">Next development areas</h2>
            <p>These module boundaries are planned. No project data is being displayed.</p>
          </div>
          <ul className="module-list">
            {developmentAreas.map((area) => (
              <li key={area.scope}>
                <span className="module-scope">{area.scope}</span>
                <div>
                  <h3>{area.name}</h3>
                  <p>{area.description}</p>
                </div>
                <span className="module-state">Not implemented</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <footer className="page-width site-footer">
        Student Project Planning and Progress Tracking System · Xingmang
      </footer>
    </>
  );
}
