import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError } from '../src/lib/client';
import { draftToApi, emptyData, scheduleFromApi } from '../src/lib/adapters';
afterEach(() => vi.unstubAllGlobals());
describe('API transport', () => {
  it('sends real authentication and JSON mutations to a configured API origin', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 7 }), { status: 201 }));
    vi.stubGlobal('fetch', fetch);
    await new ApiClient('signed-token', undefined, 'https://api.example/').createChild({ name: 'Child', age: 6, delay_domain: 'speech', avatar: '🦊' });
    expect(fetch).toHaveBeenCalledWith('https://api.example/api/children', expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer signed-token', 'Content-Type': 'application/json' }, body: expect.stringContaining('"delay_domain":"speech"') }));
  });
  it('clears an expired session and reports the server error', async () => {
    const expired = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 401 })));
    await expect(new ApiClient('old-token', expired).me()).rejects.toMatchObject({ status: 401, message: 'Invalid or expired token' });
    expect(expired).toHaveBeenCalledOnce();
  });
  it('does not expire a session on validation failures or public login failures', async () => {
    const expired = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(new Response('{"error":"Invalid input"}', { status: 400 }))));
    await expect(new ApiClient('token', expired).children()).rejects.toBeInstanceOf(ApiError);
    expect(expired).not.toHaveBeenCalled();
  });
  it('reports connection failures without substituting demo data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(new ApiClient('token').children()).rejects.toMatchObject({ status: 0, message: expect.stringContaining('Cannot reach the server') });
    expect(emptyData().children).toEqual([]);
  });
});
describe('schedule contract adapters', () => {
  it('preserves server ids and completion times while excluding status from draft mutations', () => {
    const saved = scheduleFromApi({ id: 12, revision: 'a'.repeat(64), child_id: 5, schedule_date: '2099-01-01', created_at: '', tasks: [{ id: 9, schedule_id: 12, activity_id: null, name: 'Custom', icon: '⭐', start_time: null, duration_min: null, position: 1, status: 'done', completed_at: '2026-11-17T00:00:00Z' }] }, []);
    expect(saved.tasks[0]?.completedAt).toBe('2026-11-17T00:00:00Z');
    const payload = draftToApi({ ...saved, tasks: [...saved.tasks, { id: 'draft-1', activityId: '3', name: 'Play', icon: '🧸', category: 'Play', startTime: '', duration: null, status: 'pending' }] }, saved);
    expect(payload.expectedTaskIds).toEqual([9]);
    expect(payload.expectedRevision).toBe('a'.repeat(64));
    expect(payload.tasks).toEqual([{ id: 9, start_time: null, duration_min: null }, { activityId: 3, start_time: null, duration_min: null }]);
  });
});
