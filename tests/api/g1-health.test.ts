import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/backend/app.js';
import { readEnvironment } from '../../src/backend/environment.js';
import { isHealthResponse } from '@group9/shared';

describe('G1-T10 real Express application through Supertest', () => {
  it('returns the shared technical health shape without enabling business endpoints', async () => {
    const response = await request(createApp()).get('/health').expect(200);
    expect(isHealthResponse(response.body)).toBe(true);
    expect(response.body).toEqual({
      ok: true,
      service: 'group9-backend',
      stage: 'G1_FOUNDATION',
      businessEndpointsEnabled: false,
    });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it.each(['get', 'post'] as const)(
    'does not fake a successful %s business endpoint',
    async (method) => {
      const response = await request(createApp())[method]('/projects').expect(404);
      expect(response.body).toMatchObject({
        ok: false,
        error: { code: 'ENDPOINT_NOT_IMPLEMENTED' },
      });
    },
  );

  it('rejects malformed JSON without reflecting its private contents', async () => {
    const response = await request(createApp())
      .post('/projects')
      .set('Content-Type', 'application/json')
      .send('{"secretToken":"private-fragment"')
      .expect(400);
    expect(response.body).toEqual({
      ok: false,
      error: { code: 'INVALID_INPUT', message: 'Invalid JSON request body.' },
    });
    expect(response.text).not.toContain('private-fragment');
    expect(response.text).not.toContain('SyntaxError');
  });

  it('bounds JSON payload size with a safe error envelope', async () => {
    const response = await request(createApp())
      .post('/projects')
      .send({ payload: 'x'.repeat(17 * 1024) })
      .expect(413);
    expect(response.body).toEqual({
      ok: false,
      error: { code: 'INVALID_INPUT', message: 'Request body is too large.' },
    });
  });
});

describe('explicit development environment validation', () => {
  it('uses local development settings with no production configuration', () => {
    expect(readEnvironment({})).toEqual({ host: '127.0.0.1', port: 3001, mode: 'development' });
    expect(readEnvironment({ G1_HOST: '::1', G1_BACKEND_PORT: '4100', NODE_ENV: 'test' })).toEqual({
      host: '::1',
      port: 4100,
      mode: 'test',
    });
  });

  it.each(['0', '65536', '-1', '1.2', '3001x', '', '9007199254740992'])(
    'rejects invalid port %s',
    (port) => expect(() => readEnvironment({ G1_BACKEND_PORT: port })).toThrow(),
  );

  it('rejects public binding and unsupported production mode', () => {
    expect(() => readEnvironment({ G1_HOST: '0.0.0.0' })).toThrow();
    expect(() => readEnvironment({ NODE_ENV: 'production' })).toThrow();
  });
});
