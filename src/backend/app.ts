import express, { type ErrorRequestHandler } from 'express';
import type { Failure, HealthResponse } from '@group9/shared';

export function createApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb', strict: true }));
  app.get('/health', (_request, response) => {
    const body: HealthResponse = {
      ok: true,
      service: 'group9-backend',
      stage: 'G1_FOUNDATION',
      businessEndpointsEnabled: false,
    };
    response.set('Cache-Control', 'no-store').json(body);
  });
  app.use((_request, response) => {
    const body: Failure = {
      ok: false,
      error: {
        code: 'ENDPOINT_NOT_IMPLEMENTED',
        message: 'This endpoint is not implemented in the G1 foundation.',
      },
    };
    response.status(404).json(body);
  });
  const safeErrors: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
    const type = typeof error === 'object' && error !== null && 'type' in error ? error.type : null;
    const status = type === 'entity.too.large' ? 413 : type === 'entity.parse.failed' ? 400 : 500;
    const body: Failure = {
      ok: false,
      error: {
        code: status === 500 ? 'INTERNAL_ERROR' : 'INVALID_INPUT',
        message:
          status === 413
            ? 'Request body is too large.'
            : status === 400
              ? 'Invalid JSON request body.'
              : 'Unable to process request.',
      },
    };
    response.status(status).json(body);
  };
  app.use(safeErrors);
  return app;
}
