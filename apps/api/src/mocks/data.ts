// Mock stand-in for Group 1 persistence, used by child, schedule, task, and progress routes.
// In-memory only; replace with parameterized SQL while keeping these signatures.
import type { Activity, ActivityProgress, Child, ChildProfileInput, ChildProfileUpdate, CreateActivityInput } from '@starter/shared';
import { PREDEFINED_ICONS } from '@starter/shared';

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

export { PREDEFINED_ICONS } from '@starter/shared';

const ACTIVITIES: Activity[] = [
  { id: 1, name: 'Wake up', icon: '☀️', category: 'other' },
  { id: 2, name: 'Brush teeth', icon: '🪥', category: 'hygiene' },
  { id: 3, name: 'Wash hands', icon: '🧼', category: 'hygiene' },
  { id: 4, name: 'Eat breakfast', icon: '🍎', category: 'food' },
  { id: 5, name: 'Get dressed', icon: '👕', category: 'other' },
  { id: 6, name: 'Toilet', icon: '🚽', category: 'hygiene' },
  { id: 7, name: 'Go to school', icon: '🚌', category: 'school' },
  { id: 8, name: 'Learning activity', icon: '📚', category: 'school' },
  { id: 9, name: 'Play', icon: '🧸', category: 'play' },
  { id: 10, name: 'Bath', icon: '🛁', category: 'hygiene' },
  { id: 11, name: 'Get ready for bed', icon: '🌙', category: 'other' },
  { id: 12, name: 'Eat lunch', icon: '🥪', category: 'food' },
];

interface Store {
  customActivities: Array<{ userId: number; activity: Activity }>;
  nextActivityId: number;
  children: Child[];
  schedules: Schedule[];
  tasks: Task[];
  nextChildId: number;
  nextScheduleId: number;
  nextTaskId: number;
}

function seed(): Store {
  return {
    customActivities: [],
    nextActivityId: ACTIVITIES.at(-1)!.id + 1,
    children: [
      { id: 1, user_id: 1, name: 'Mia', age: 6, delay_domain: 'speech', notes: null, avatar: '🦊', created_at: '2026-11-01T08:00:00.000Z' },
      { id: 2, user_id: 1, name: 'Leo', age: 8, delay_domain: 'motor', notes: null, avatar: '🐼', created_at: '2026-11-01T08:00:00.000Z' },
      { id: 3, user_id: 2, name: 'Ava', age: 7, delay_domain: 'cognitive', notes: null, avatar: '🐰', created_at: '2026-11-01T08:00:00.000Z' },
    ],
    schedules: [],
    tasks: [],
    nextChildId: 4,
    nextScheduleId: 1,
    nextTaskId: 1,
  };
}

let store = seed();

export function resetStore(): void {
  store = seed();
}

export function findChildForUser(childId: number, userId: number): Child | undefined {
  return store.children.find((c) => c.id === childId && c.user_id === userId);
}

export function listChildrenForUser(userId: number): Child[] {
  return store.children.filter((child) => child.user_id === userId);
}

export function createChildForUser(userId: number, input: ChildProfileInput): Child {
  const child: Child = {
    id: store.nextChildId++,
    user_id: userId,
    name: input.name,
    age: input.age,
    delay_domain: input.delay_domain,
    notes: input.notes ?? null,
    avatar: input.avatar ?? '🦊',
    created_at: new Date().toISOString(),
  };
  store.children.push(child);
  return child;
}

export function updateChildForUser(
  childId: number,
  userId: number,
  patch: ChildProfileUpdate,
): Child | undefined {
  const child = findChildForUser(childId, userId);
  if (!child) return undefined;
  if (patch.name !== undefined) child.name = patch.name;
  if (patch.age !== undefined) child.age = patch.age;
  if (patch.delay_domain !== undefined) child.delay_domain = patch.delay_domain;
  if (patch.notes !== undefined) child.notes = patch.notes;
  if (patch.avatar !== undefined) child.avatar = patch.avatar;
  return child;
}

export function deleteChildForUser(childId: number, userId: number): boolean {
  if (!findChildForUser(childId, userId)) return false;
  for (const schedule of store.schedules.filter((item) => item.child_id === childId)) {
    deleteSchedule(schedule.id);
  }
  store.children = store.children.filter((child) => child.id !== childId);
  return true;
}

export function listActivities(userId: number): Activity[] {
  return [...store.customActivities.filter((entry) => entry.userId === userId).map((entry) => entry.activity), ...ACTIVITIES];
}

export function findActivity(id: number, userId: number): Activity | undefined {
  return listActivities(userId).find((activity) => activity.id === id);
}

export function createActivity(userId: number, input: CreateActivityInput): Activity {
  const existing = store.customActivities.find((entry) => entry.userId === userId && entry.activity.name.toLowerCase() === input.name.toLowerCase());
  if (existing) return existing.activity;
  const activity = { id: store.nextActivityId++, ...input };
  store.customActivities.unshift({ userId, activity });
  return activity;
}

export function isPredefinedIcon(icon: string): boolean {
  return PREDEFINED_ICONS.includes(icon);
}

export function findScheduleForUser(scheduleId: number, userId: number): Schedule | undefined {
  const schedule = store.schedules.find((s) => s.id === scheduleId);
  if (!schedule) return undefined;
  return findChildForUser(schedule.child_id, userId) ? schedule : undefined;
}

export function findScheduleByChildAndDate(childId: number, date: string): Schedule | undefined {
  return store.schedules.find((s) => s.child_id === childId && s.schedule_date === date);
}

export function createSchedule(childId: number, date: string): Schedule {
  const schedule: Schedule = {
    id: store.nextScheduleId++,
    child_id: childId,
    schedule_date: date,
    created_at: new Date().toISOString(),
  };
  store.schedules.push(schedule);
  return schedule;
}

export function setScheduleDate(schedule: Schedule, date: string): void {
  schedule.schedule_date = date;
}

export function deleteSchedule(scheduleId: number): void {
  store.schedules = store.schedules.filter((s) => s.id !== scheduleId);
  store.tasks = store.tasks.filter((t) => t.schedule_id !== scheduleId);
}

export function tasksForSchedule(scheduleId: number): Task[] {
  return store.tasks.filter((t) => t.schedule_id === scheduleId).sort((a, b) => a.position - b.position);
}

export function addTask(
  scheduleId: number,
  input: { activity_id: number | null; name: string; icon: string },
): Task {
  const task: Task = {
    id: store.nextTaskId++,
    schedule_id: scheduleId,
    activity_id: input.activity_id,
    name: input.name,
    icon: input.icon,
    start_time: null,
    duration_min: null,
    position: tasksForSchedule(scheduleId).length + 1,
    status: 'pending',
    completed_at: null,
  };
  store.tasks.push(task);
  return task;
}

export function copyTasks(fromScheduleId: number, toScheduleId: number): void {
  for (const source of tasksForSchedule(fromScheduleId)) {
    const copy = addTask(toScheduleId, {
      activity_id: source.activity_id,
      name: source.name,
      icon: source.icon,
    });
    copy.start_time = source.start_time;
    copy.duration_min = source.duration_min;
  }
}

export function findTaskForUser(taskId: number, userId: number): Task | undefined {
  const task = store.tasks.find((t) => t.id === taskId);
  if (!task) return undefined;
  return findScheduleForUser(task.schedule_id, userId) ? task : undefined;
}

function resequence(scheduleId: number): void {
  tasksForSchedule(scheduleId).forEach((t, i) => {
    t.position = i + 1;
  });
}

export function applyTaskUpdate(
  task: Task,
  patch: { start_time?: string | null; duration_min?: number | null; position?: number },
): void {
  if (patch.position !== undefined && patch.position !== task.position) {
    const tasks = tasksForSchedule(task.schedule_id);
    tasks.splice(tasks.indexOf(task), 1);
    tasks.splice(patch.position - 1, 0, task);
    tasks.forEach((t, i) => {
      t.position = i + 1;
    });
  }
  if (patch.start_time !== undefined) task.start_time = patch.start_time;
  if (patch.duration_min !== undefined) task.duration_min = patch.duration_min;
}

export function removeTask(task: Task): void {
  store.tasks = store.tasks.filter((t) => t.id !== task.id);
  resequence(task.schedule_id);
}

export function setTaskCompletion(task: Task, done: boolean): void {
  if (done) {
    if (task.status !== 'done') {
      task.status = 'done';
      task.completed_at = new Date().toISOString();
    }
  } else {
    task.status = 'pending';
    task.completed_at = null;
  }
}

export function activityCompletionForChild(
  childId: number,
  startDate: string,
  endDate: string,
): ActivityProgress[] {
  const grouped = new Map<string, ActivityProgress>();
  for (const schedule of store.schedules.filter((item) => item.child_id === childId && item.schedule_date >= startDate && item.schedule_date <= endDate)) {
    for (const task of tasksForSchedule(schedule.id)) {
      const entry = grouped.get(task.name) ?? {
        name: task.name,
        icon: task.icon,
        total: 0,
        completed: 0,
        percentage: 0,
        last_completed_at: null,
      };
      entry.total += 1;
      if (task.status === 'done') {
        entry.completed += 1;
        if (task.completed_at && (!entry.last_completed_at || task.completed_at > entry.last_completed_at)) {
          entry.last_completed_at = task.completed_at;
        }
      }
      grouped.set(task.name, entry);
    }
  }
  return [...grouped.values()]
    .map((entry) => ({ ...entry, percentage: entry.total === 0 ? 0 : Math.round((entry.completed / entry.total) * 100) }))
    .sort((a, b) => b.completed - a.completed || b.total - a.total || a.name.localeCompare(b.name));
}
