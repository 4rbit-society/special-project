import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/db/pool.js', () => ({
  checkDatabaseConnection: vi.fn(),
  closeDatabasePool: vi.fn(),
}));

import { app } from '../../src/app.js';
import { checkDatabaseConnection } from '../../src/db/pool.js';

afterEach(() => vi.restoreAllMocks());

describe('health response contract', () => {
  it('returns 200 and the documented successful health body', async () => {
    vi.mocked(checkDatabaseConnection).mockResolvedValueOnce(undefined);
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      database: 'connected',
      message: 'API and database are available.',
      timestamp: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(res.body.timestamp))).toBe(false);
  });

  it('returns 503 and a public error without database internals', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(checkDatabaseConnection).mockRejectedValueOnce(new Error('private database credentials'));
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      status: 'error',
      database: 'disconnected',
      error: 'Database unavailable.',
      timestamp: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(res.body.timestamp))).toBe(false);
  });
});
