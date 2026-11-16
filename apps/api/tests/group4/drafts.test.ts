import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../../src/testing/testApp.js';
import { resetStore } from '../../src/mocks/data.js';
const { app, alice, bob } = await createTestApp();
const date = '2099-12-15';
const libraryTask = { activityId: 1, start_time: '08:00', duration_min: 10 };
beforeEach(() => resetStore());
const save = (body: object, headers = alice) => request(app).put('/api/schedules').set(headers).send(body);
describe('atomic schedule drafts', () => {
  it('creates a complete draft and preserves completion when reordered and edited', async () => {
    const created = await save({ childId: 1, date, expectedTaskIds: [], tasks: [libraryTask, { name: 'Custom', icon: '⭐', start_time: null, duration_min: null }] });
    expect(created.status).toBe(200);
    const [first, second] = created.body.tasks;
    const completed = await request(app).patch(`/api/tasks/${first.id}/complete`).set(alice).send({ done: true });
    const edited = await save({ childId: 1, date, scheduleId: created.body.id, expectedTaskIds: [first.id, second.id], tasks: [{ id: second.id, start_time: null, duration_min: 5 }, { id: first.id, start_time: '09:00', duration_min: 20 }] });
    expect(edited.status).toBe(200);
    expect(edited.body.tasks).toMatchObject([{ id: second.id, position: 1, duration_min: 5 }, { id: first.id, position: 2, status: 'done', completed_at: completed.body.completed_at }]);
  });
  it('validates every new task before creating any records', async () => {
    const result = await save({ childId: 1, date, expectedTaskIds: [], tasks: [libraryTask, { ...libraryTask, activityId: 999999 }] });
    expect(result.status).toBe(400);
    expect((await request(app).get('/api/schedules').set(alice).query({ childId: 1, date })).status).toBe(404);
  });
  it('rejects stale snapshots instead of deleting newly added tasks', async () => {
    const created = await save({ childId: 1, date, expectedTaskIds: [], tasks: [libraryTask] });
    await request(app).post('/api/tasks').set(alice).send({ scheduleId: created.body.id, activityId: 2 });
    expect((await save({ childId: 1, date, scheduleId: created.body.id, expectedTaskIds: [created.body.tasks[0].id], tasks: [] })).status).toBe(409);
    const current = await request(app).get('/api/schedules').set(alice).query({ childId: 1, date });
    expect(current.body.tasks).toHaveLength(2);
  });
  it('rejects foreign ownership and requires authentication', async () => {
    const draft = { childId: 1, date, expectedTaskIds: [], tasks: [libraryTask] };
    expect((await save(draft, bob)).status).toBe(404);
    expect((await request(app).put('/api/schedules').send(draft)).status).toBe(401);
  });
  it('rejects forged task identities, status fields, and duplicate ids', async () => {
    const created = await save({ childId: 1, date, expectedTaskIds: [], tasks: [libraryTask] });
    const draft = { childId: 1, date, scheduleId: created.body.id, expectedTaskIds: [created.body.tasks[0].id] };
    expect((await save({ ...draft, tasks: [{ id: 999, start_time: null, duration_min: null }] })).status).toBe(400);
    expect((await save({ ...draft, tasks: [{ ...libraryTask, status: 'done' }] })).status).toBe(400);
    const task = { id: created.body.tasks[0].id, start_time: null, duration_min: null };
    expect((await save({ ...draft, tasks: [task, task] })).status).toBe(400);
  });
});
