import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { setTimeout as pause } from 'node:timers/promises';
import { expect, it } from 'vitest';

it('starts a real backend and reports a bind failure without a false listening message', async () => {
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const address = probe.address();
  if (!address || typeof address === 'string') throw new Error('No test TCP port allocated.');
  const port = address.port;
  await new Promise<void>((resolve, reject) =>
    probe.close((error) => (error ? reject(error) : resolve())),
  );

  function launch() {
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/backend/server.ts'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'test',
        G1_HOST: '127.0.0.1',
        G1_BACKEND_PORT: String(port),
      },
      windowsHide: true,
      stdio: 'pipe',
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    const done = once(child, 'close');
    return { child, done, stdout: () => stdout, stderr: () => stderr };
  }

  const first = launch();
  try {
    const deadline = Date.now() + 5_000;
    while (!first.stdout().includes('G1 backend listening') && Date.now() < deadline) {
      if (first.child.exitCode !== null) throw new Error(first.stderr());
      await pause(25);
    }
    expect(first.stdout()).toContain(`http://127.0.0.1:${port}`);
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, stage: 'G1_FOUNDATION' });

    const second = launch();
    try {
      const [exitCode] = await second.done;
      expect(exitCode).toBe(1);
      expect(second.stderr()).toContain('EADDRINUSE');
      expect(second.stdout()).not.toContain('G1 backend listening');
    } finally {
      if (second.child.exitCode === null) second.child.kill();
      await second.done;
    }
  } finally {
    if (first.child.exitCode === null) first.child.kill();
    await first.done;
  }
}, 15_000);
