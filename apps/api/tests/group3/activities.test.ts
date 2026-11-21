import type { Activity } from '@starter/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetStore } from '../../src/mocks/data.js';
import { createTestApp } from '../../src/testing/testApp.js';

const { app, alice, bob } = await createTestApp();

beforeEach(resetStore);

describe('GET /api/activities', () => {
  it('requires a valid token', async () => {
    for (const token of [undefined, 'Bearer 999']) {
      const req = request(app).get('/api/activities');
      if (token) req.set('Authorization', token);
      const res = await req;
      expect(res.status).toBe(401);
      expect(res.body.error).toBeTypeOf('string');
    }
  });

  it('serves the same predefined library to both users, with stable ids and categories', async () => {
    const first = await request(app).get('/api/activities').set(alice);
    const second = await request(app).get('/api/activities').set(bob);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body).toEqual(second.body);
    const activities = first.body as Activity[];
    expect(activities).toHaveLength(12);
    expect(activities.map((activity) => activity.name)).toEqual(expect.arrayContaining([
      'Wake up', 'Brush teeth', 'Wash hands', 'Eat breakfast', 'Get dressed',
      'Toilet', 'Go to school', 'Learning activity', 'Play', 'Bath', 'Get ready for bed',
    ]));
    expect(new Set(activities.map((activity) => activity.id)).size).toBe(activities.length);
    expect(new Set(activities.map((activity) => activity.category))).toEqual(
      new Set(['hygiene', 'food', 'school', 'play', 'other']),
    );
    for (const activity of activities) {
      expect(activity.id).toBeGreaterThan(0);
      expect(activity.name.length).toBeGreaterThan(0);
      expect(activity.icon.length).toBeGreaterThan(0);
    }
  });
});

it('keeps custom activities reusable within the owner’s library and private across accounts', async () => {
  const input = { name: 'Story time', icon: '\u2B50', category: 'school' };
  const created = await request(app).post('/api/activities').set(alice).send(input).expect(201);
  const activityId = created.body.id;
  expect(created.body).toEqual({ id: activityId, ...input });

  const retry = await request(app).post('/api/activities').set(alice).send(input).expect(201);
  expect(retry.body.id).toBe(activityId);
  await request(app).post('/api/activities').set(alice).send({ ...input, category: 'play' }).expect(409);
  const library = await request(app).get('/api/activities').set(alice).expect(200);
  expect((library.body as Activity[]).filter((activity) => activity.id === activityId)).toEqual([created.body]);
  const otherLibrary = await request(app).get('/api/activities').set(bob).expect(200);
  expect(otherLibrary.body).not.toContainEqual(created.body);

  const draft = { date: '2099-12-17', expectedTaskIds: [], tasks: [{ activityId, start_time: null, duration_min: null }] };
  const saved = await request(app).put('/api/schedules').set(alice).send({ ...draft, childId: 1 }).expect(200);
  expect(saved.body.tasks[0]).toMatchObject({ activity_id: activityId, name: input.name, icon: input.icon });
  await request(app).put('/api/schedules').set(bob).send({ ...draft, childId: 3 }).expect(400);

  const otherSchedule = await request(app).post('/api/schedules').set(bob).send({ childId: 3, date: draft.date }).expect(201);
  await request(app).post('/api/tasks').set(bob).send({ scheduleId: otherSchedule.body.id, activityId }).expect(400);
  await request(app).post('/api/activities').set(bob).send(input).expect(201);
});
