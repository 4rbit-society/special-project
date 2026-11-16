import type { Activity, Child, ChildProfileInput, ChildProfileUpdate } from '@starter/shared';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import * as mock from '../mocks/data.js';
import { getDatabasePool } from './pool.js';

export type { Activity, Child } from '@starter/shared';

export interface Schedule {
  id: number;
  child_id: number;
  schedule_date: string;
  created_at: string;
}

export interface Task {
  id: number;
  schedule_id: number;
  activity_id: number | null;
  name: string;
  icon: string;
  start_time: string | null;
  duration_min: number | null;
  position: number;
  status: 'pending' | 'done';
  completed_at: string | null;
}

interface ChildRow extends RowDataPacket, Child {}

interface ActivityRow extends RowDataPacket, Activity {}

interface ScheduleRow extends RowDataPacket, Schedule {}

interface TaskRow extends RowDataPacket, Task {}

function useMockStore(): boolean {
  return process.env.NODE_ENV === 'test' && process.env.DB_HOST === undefined;
}

function normalizeTask(row: TaskRow): Task {
  return {
    id: Number(row.id),
    schedule_id: Number(row.schedule_id),
    activity_id: row.activity_id === null ? null : Number(row.activity_id),
    name: row.name,
    icon: row.icon,
    start_time: row.start_time === null ? null : row.start_time.slice(0, 5),
    duration_min: row.duration_min === null ? null : Number(row.duration_min),
    position: Number(row.position),
    status: row.status,
    completed_at: row.completed_at,
  };
}

function normalizeChild(row: ChildRow): Child {
  return {
    ...row,
    id: Number(row.id),
    user_id: Number(row.user_id),
    age: Number(row.age),
  };
}

function normalizeActivity(row: ActivityRow): Activity {
  return { ...row, id: Number(row.id) };
}

function normalizeSchedule(row: ScheduleRow): Schedule {
  return { ...row, id: Number(row.id), child_id: Number(row.child_id) };
}

async function selectTask(connection: PoolConnection, taskId: number): Promise<Task> {
  const [rows] = await connection.query<TaskRow[]>('SELECT * FROM tasks WHERE id = ?', [taskId]);
  const row = rows[0];
  if (!row) {
    throw new Error('Expected task row was not found after write.');
  }
  return normalizeTask(row);
}

export async function listChildrenForUser(userId: number): Promise<Child[]> {
  if (useMockStore()) {
    return mock.listChildrenForUser(userId);
  }

  const [rows] = await getDatabasePool().query<ChildRow[]>(
    `SELECT id, user_id, name, age, delay_domain, notes, avatar, created_at
     FROM children
     WHERE user_id = ?
     ORDER BY created_at ASC, id ASC`,
    [userId],
  );
  return rows.map(normalizeChild);
}

export async function findChildForUser(childId: number, userId: number): Promise<Child | undefined> {
  if (useMockStore()) {
    return mock.findChildForUser(childId, userId);
  }

  const [rows] = await getDatabasePool().query<ChildRow[]>(
    `SELECT id, user_id, name, age, delay_domain, notes, avatar, created_at
     FROM children
     WHERE id = ? AND user_id = ?`,
    [childId, userId],
  );
  return rows[0] ? normalizeChild(rows[0]) : undefined;
}

export async function createChildForUser(userId: number, input: ChildProfileInput): Promise<Child> {
  if (useMockStore()) {
    return mock.createChildForUser(userId, input);
  }

  const pool = getDatabasePool();
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO children (user_id, name, age, delay_domain, notes, avatar)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, input.name, input.age, input.delay_domain, input.notes ?? null, input.avatar ?? '🦊'],
  );
  const [rows] = await pool.query<ChildRow[]>(
    `SELECT id, user_id, name, age, delay_domain, notes, avatar, created_at
     FROM children WHERE id = ?`,
    [result.insertId],
  );
  const row = rows[0];
  if (!row) {
    throw new Error('Expected child row was not found after insert.');
  }
  return normalizeChild(row);
}

export async function updateChildForUser(
  childId: number,
  userId: number,
  patch: ChildProfileUpdate,
): Promise<Child | undefined> {
  if (useMockStore()) {
    return mock.updateChildForUser(childId, userId, patch);
  }

  const fields: string[] = [];
  const values: Array<string | number | null> = [];
  for (const field of ['name', 'age', 'delay_domain', 'notes', 'avatar'] as const) {
    if (patch[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(patch[field]);
    }
  }

  const pool = getDatabasePool();
  if (fields.length > 0) {
    await pool.execute(
      `UPDATE children SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      [...values, childId, userId],
    );
  }

  const [rows] = await pool.query<ChildRow[]>(
    `SELECT id, user_id, name, age, delay_domain, notes, avatar, created_at
     FROM children WHERE id = ? AND user_id = ?`,
    [childId, userId],
  );
  return rows[0] ? normalizeChild(rows[0]) : undefined;
}

export async function deleteChildForUser(childId: number, userId: number): Promise<boolean> {
  if (useMockStore()) {
    return mock.deleteChildForUser(childId, userId);
  }

  const [result] = await getDatabasePool().execute<ResultSetHeader>(
    'DELETE FROM children WHERE id = ? AND user_id = ?',
    [childId, userId],
  );
  return result.affectedRows > 0;
}

export async function listActivities(): Promise<Activity[]> {
  if (useMockStore()) {
    return mock.listActivities();
  }

  const [rows] = await getDatabasePool().query<ActivityRow[]>(
    'SELECT id, name, icon, category FROM activities ORDER BY id ASC',
  );
  return rows.map(normalizeActivity);
}

export async function findActivity(id: number): Promise<Activity | undefined> {
  if (useMockStore()) {
    return mock.findActivity(id);
  }

  const [rows] = await getDatabasePool().query<ActivityRow[]>(
    'SELECT id, name, icon, category FROM activities WHERE id = ?',
    [id],
  );
  return rows[0] ? normalizeActivity(rows[0]) : undefined;
}

export function isPredefinedIcon(icon: string): boolean {
  return mock.isPredefinedIcon(icon);
}

export async function findScheduleForUser(scheduleId: number, userId: number): Promise<Schedule | undefined> {
  if (useMockStore()) {
    return mock.findScheduleForUser(scheduleId, userId);
  }

  const [rows] = await getDatabasePool().query<ScheduleRow[]>(
    `SELECT s.id, s.child_id, s.schedule_date, s.created_at
     FROM schedules s
     INNER JOIN children c ON c.id = s.child_id
     WHERE s.id = ? AND c.user_id = ?`,
    [scheduleId, userId],
  );
  return rows[0] ? normalizeSchedule(rows[0]) : undefined;
}

export async function findScheduleByChildAndDate(childId: number, date: string): Promise<Schedule | undefined> {
  if (useMockStore()) {
    return mock.findScheduleByChildAndDate(childId, date);
  }

  const [rows] = await getDatabasePool().query<ScheduleRow[]>(
    `SELECT id, child_id, schedule_date, created_at
     FROM schedules WHERE child_id = ? AND schedule_date = ?`,
    [childId, date],
  );
  return rows[0] ? normalizeSchedule(rows[0]) : undefined;
}

export async function createSchedule(childId: number, date: string): Promise<Schedule> {
  if (useMockStore()) {
    return mock.createSchedule(childId, date);
  }

  const pool = getDatabasePool();
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO schedules (child_id, schedule_date) VALUES (?, ?)',
    [childId, date],
  );
  const [rows] = await pool.query<ScheduleRow[]>(
    `SELECT id, child_id, schedule_date, created_at FROM schedules WHERE id = ?`,
    [result.insertId],
  );
  const row = rows[0];
  if (!row) {
    throw new Error('Expected schedule row was not found after insert.');
  }
  return normalizeSchedule(row);
}

export async function setScheduleDate(schedule: Schedule, date: string): Promise<void> {
  if (useMockStore()) {
    mock.setScheduleDate(schedule, date);
    return;
  }

  await getDatabasePool().execute('UPDATE schedules SET schedule_date = ? WHERE id = ?', [date, schedule.id]);
  schedule.schedule_date = date;
}

export async function deleteSchedule(scheduleId: number): Promise<void> {
  if (useMockStore()) {
    mock.deleteSchedule(scheduleId);
    return;
  }

  await getDatabasePool().execute('DELETE FROM schedules WHERE id = ?', [scheduleId]);
}

export async function tasksForSchedule(scheduleId: number): Promise<Task[]> {
  if (useMockStore()) {
    return mock.tasksForSchedule(scheduleId);
  }

  const [rows] = await getDatabasePool().query<TaskRow[]>(
    `SELECT id, schedule_id, activity_id, name, icon, start_time, duration_min, position, status, completed_at
     FROM tasks WHERE schedule_id = ? ORDER BY position ASC, id ASC`,
    [scheduleId],
  );
  return rows.map(normalizeTask);
}

export async function addTask(
  scheduleId: number,
  input: { activity_id: number | null; name: string; icon: string },
): Promise<Task> {
  if (useMockStore()) {
    return mock.addTask(scheduleId, input);
  }

  const pool = getDatabasePool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('SELECT id FROM schedules WHERE id = ? FOR UPDATE', [scheduleId]);
    const [positions] = await connection.query<Array<RowDataPacket & { next_position: number }>>(
      'SELECT COALESCE(MAX(position), 0) + 1 AS next_position FROM tasks WHERE schedule_id = ?',
      [scheduleId],
    );
      const nextPosition = positions[0]?.next_position;
      if (nextPosition === undefined) {
        throw new Error('Could not determine the next task position.');
      }
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO tasks (schedule_id, activity_id, name, icon, position, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [scheduleId, input.activity_id, input.name, input.icon, nextPosition],
    );
    const task = await selectTask(connection, Number(result.insertId));
    await connection.commit();
    return task;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function copyTasks(fromScheduleId: number, toScheduleId: number): Promise<void> {
  const sourceTasks = await tasksForSchedule(fromScheduleId);
  for (const source of sourceTasks) {
    const copied = await addTask(toScheduleId, {
      activity_id: source.activity_id,
      name: source.name,
      icon: source.icon,
    });
    await applyTaskUpdate(copied, {
      start_time: source.start_time,
      duration_min: source.duration_min,
    });
  }
}

export async function findTaskForUser(taskId: number, userId: number): Promise<Task | undefined> {
  if (useMockStore()) {
    return mock.findTaskForUser(taskId, userId);
  }

  const [rows] = await getDatabasePool().query<TaskRow[]>(
    `SELECT t.id, t.schedule_id, t.activity_id, t.name, t.icon, t.start_time,
            t.duration_min, t.position, t.status, t.completed_at
     FROM tasks t
     INNER JOIN schedules s ON s.id = t.schedule_id
     INNER JOIN children c ON c.id = s.child_id
     WHERE t.id = ? AND c.user_id = ?`,
    [taskId, userId],
  );
  return rows[0] ? normalizeTask(rows[0]) : undefined;
}

export async function applyTaskUpdate(
  task: Task,
  patch: { start_time?: string | null; duration_min?: number | null; position?: number },
): Promise<Task> {
  if (useMockStore()) {
    mock.applyTaskUpdate(task, patch);
    return task;
  }

  const pool = getDatabasePool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    if (patch.position !== undefined) {
      const [rows] = await connection.query<Array<RowDataPacket & { id: number; position: number }>>(
        'SELECT id, position FROM tasks WHERE schedule_id = ? ORDER BY position ASC FOR UPDATE',
        [task.schedule_id],
      );
      const currentIndex = rows.findIndex((row) => Number(row.id) === task.id);
      if (currentIndex < 0 || patch.position > rows.length) {
        throw new Error('Task position changed before the update could be applied.');
      }

      const targetIndex = patch.position - 1;
      if (currentIndex !== targetIndex) {
        const [moved] = rows.splice(currentIndex, 1);
        if (!moved) {
          throw new Error('Task position changed before the update could be applied.');
        }
        const temporaryPosition = rows.length + 2;
        await connection.execute('UPDATE tasks SET position = ? WHERE id = ?', [temporaryPosition, moved.id]);

        if (currentIndex < targetIndex) {
          for (let index = currentIndex; index < targetIndex; index += 1) {
            const shifted = rows[index];
            if (!shifted) {
              throw new Error('Task order changed before the update could be applied.');
            }
            await connection.execute('UPDATE tasks SET position = ? WHERE id = ?', [index + 1, shifted.id]);
          }
        } else {
          for (let index = currentIndex - 1; index >= targetIndex; index -= 1) {
            const shifted = rows[index];
            if (!shifted) {
              throw new Error('Task order changed before the update could be applied.');
            }
            await connection.execute('UPDATE tasks SET position = ? WHERE id = ?', [index + 2, shifted.id]);
          }
        }
        await connection.execute('UPDATE tasks SET position = ? WHERE id = ?', [patch.position, moved.id]);
      }
    }

    const fields: string[] = [];
    const values: Array<string | number | null> = [];
    if (patch.start_time !== undefined) {
      fields.push('start_time = ?');
      values.push(patch.start_time);
    }
    if (patch.duration_min !== undefined) {
      fields.push('duration_min = ?');
      values.push(patch.duration_min);
    }
    if (fields.length > 0) {
      await connection.execute(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, [...values, task.id]);
    }

    const updated = await selectTask(connection, task.id);
    await connection.commit();
    return updated;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function removeTask(task: Task): Promise<void> {
  if (useMockStore()) {
    mock.removeTask(task);
    return;
  }

  const pool = getDatabasePool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('DELETE FROM tasks WHERE id = ?', [task.id]);
    const [rows] = await connection.query<Array<RowDataPacket & { id: number }>>(
      'SELECT id FROM tasks WHERE schedule_id = ? ORDER BY position ASC',
      [task.schedule_id],
    );
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (!row) {
        throw new Error('Task order changed while removing a task.');
      }
      await connection.execute('UPDATE tasks SET position = ? WHERE id = ?', [index + 1, row.id]);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function setTaskCompletion(task: Task, done: boolean): Promise<Task> {
  if (useMockStore()) {
    mock.setTaskCompletion(task, done);
    return task;
  }

  const pool = getDatabasePool();
  if (done) {
    await pool.execute(
      `UPDATE tasks
       SET status = 'done', completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
       WHERE id = ?`,
      [task.id],
    );
  } else {
    await pool.execute(
      `UPDATE tasks SET status = 'pending', completed_at = NULL WHERE id = ?`,
      [task.id],
    );
  }
  const [rows] = await pool.query<TaskRow[]>('SELECT * FROM tasks WHERE id = ?', [task.id]);
  const row = rows[0];
  if (!row) {
    throw new Error('Expected task row was not found after completion update.');
  }
  return normalizeTask(row);
}
