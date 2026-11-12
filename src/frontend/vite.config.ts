import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const frontendRoot = fileURLToPath(new URL('.', import.meta.url));

function backendTarget(value: string): string {
  let target: URL;
  try {
    target = new URL(value);
  } catch {
    throw new Error('G1_BACKEND_URL must be a valid local HTTP origin.');
  }
  if (
    target.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname) ||
    target.username !== '' ||
    target.password !== '' ||
    target.pathname !== '/' ||
    target.search !== '' ||
    target.hash !== ''
  ) {
    throw new Error(
      'G1_BACKEND_URL must be a local HTTP origin without credentials, path, query or fragment.',
    );
  }
  return target.origin;
}

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, repositoryRoot, 'G1_');
  const target = backendTarget(
    process.env['G1_BACKEND_URL'] ?? environment['G1_BACKEND_URL'] ?? 'http://127.0.0.1:3001',
  );
  const proxy = { '/health': { target, changeOrigin: false } };

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          main: resolve(frontendRoot, 'index.html'),
          monitoringPrototype: resolve(frontendRoot, 'monitoring-preview.html'),
        },
      },
    },
    server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy },
    preview: { host: '127.0.0.1', port: 4173, strictPort: true, proxy },
  };
});
