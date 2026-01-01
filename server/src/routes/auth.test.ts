import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import express, { type Express } from 'express';
import authRouter from './auth';

describe('POST /api/auth/token', () => {
  let app: Express;
  let server: ReturnType<Express['listen']>;
  const PORT = 3098; // Use a different port for tests

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    server = app.listen(PORT);
  });

  afterAll(() => {
    server.close();
  });

  it('returns 400 if code is missing', async () => {
    const response = await fetch(`http://localhost:${PORT}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Missing authorization code');
  });

  it('returns 400 if code is empty', async () => {
    const response = await fetch(`http://localhost:${PORT}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '' }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Missing authorization code');
  });
});
