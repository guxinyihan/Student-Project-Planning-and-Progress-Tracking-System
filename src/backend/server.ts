import { createApp } from './app.js';
import { readEnvironment } from './environment.js';
try {
  const environment = readEnvironment();
  const server = createApp().listen(environment.port, environment.host);
  server.once('listening', () => {
    const hostname = environment.host === '::1' ? '[::1]' : environment.host;
    console.log(
      `G1 backend listening at http://${hostname}:${environment.port}; business endpoints disabled.`,
    );
  });
  server.on('error', (error: NodeJS.ErrnoException) => {
    console.error(`G1 backend could not start (${error.code ?? 'STARTUP_FAILED'}).`);
    process.exitCode = 1;
  });
  let stopping = false;
  function shutdown(): void {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => {
      server.closeAllConnections();
      process.exitCode = 1;
    }, 5_000);
    deadline.unref();
    server.close(() => {
      clearTimeout(deadline);
      console.log('G1 backend stopped.');
    });
  }
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
} catch {
  console.error(
    'Invalid G1 environment configuration. Check loopback host, port and development/test mode.',
  );
  process.exitCode = 1;
}
