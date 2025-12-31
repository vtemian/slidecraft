import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import express, { type Express } from 'express';
import healthRouter from './health';

describe('GET /api/health', () => {
  let app: Express;
  let server: ReturnType<Express['listen']>;
  const PORT = 3099; // Use a different port for tests

  beforeAll(() => {
    app = express();
    app.use('/api', healthRouter);
    server = app.listen(PORT);
  });

  afterAll(() => {
    server.close();
  });

  it('returns status ok', async () => {
    const response = await fetch(`http://localhost:${PORT}/api/health`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });
});
