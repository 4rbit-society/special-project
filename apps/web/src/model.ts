import type { ApiCard, ProgressSummary, PublicUser } from '@starter/shared';

export type StaffPage = 'dashboard' | 'profiles' | 'schedules' | 'tasks' | 'progress' | 'settings' | 'cards';
export type Page = StaffPage | 'child' | 'login' | 'register';

export interface ChildProfile {
  id: number;
  name: string;
  age: number;
  delayDomain: string;
  notes: string;
  avatar: string;
}

export interface ScheduleTask {
  id: string;
  activityId: string;
  name: string;
  icon: string;
  category: string;
  startTime: string;
  duration: number | null;
  status: 'pending' | 'done';
  completedAt?: string | null;
}

export interface DailySchedule {
  id: string;
  childId: number;
  date: string;
  tasks: ScheduleTask[];
  revision?: string;
}

export interface Preferences {
  fontSize: 'small' | 'medium' | 'large';
  contrast: 'normal' | 'high';
  soundOn: boolean;
}

export interface AppData {
  children: ChildProfile[];
  schedules: DailySchedule[];
  preferences: Preferences;
  user: PublicUser | null;
  activities: Array<Pick<ScheduleTask, 'activityId' | 'name' | 'icon' | 'category'>>;
  cards: Record<number, ApiCard[]>;
  progress: Record<number, ProgressSummary>;
}

export interface AppActions {
  navigate: (page: Page) => void;
  openChild: (childId: number) => void;
  selectChild: (childId: number) => void;
  addChild: (child: Omit<ChildProfile, 'id'>) => Promise<boolean>;
  updateChild: (child: ChildProfile) => Promise<boolean>;
  deleteChild: (id: number) => Promise<boolean>;
  updatePreferences: (preferences: Preferences, name?: string) => Promise<boolean>;
  updateSchedule: (schedule: DailySchedule, base?: DailySchedule) => Promise<DailySchedule | undefined>;
  setNavigationGuard: (guard: () => boolean) => () => void;
  markTask: (childId: number, taskId: string, done: boolean, date?: string) => Promise<boolean>;
  loadSchedule: (childId: number, date: string) => Promise<DailySchedule | null | undefined>;
  copySchedule: (childId: number, date: string, from: string) => Promise<boolean>;
  moveSchedule: (schedule: DailySchedule, date: string) => Promise<boolean>;
  deleteSchedule: (schedule: DailySchedule) => Promise<boolean>;
  addTask: (schedule: DailySchedule, activityId: string) => Promise<boolean>;
  moveTask: (schedule: DailySchedule, taskId: string, position: number) => Promise<boolean>;
  removeTask: (schedule: DailySchedule, taskId: string) => Promise<boolean>;
  addCard: (input: { childId: number; label: string; category: ApiCard['category']; icon: string }) => Promise<boolean>;
  hideCard: (childId: number, id: number, hidden: boolean) => Promise<boolean>;
  deleteCard: (childId: number, id: number) => Promise<boolean>;
}

export interface SharedPageProps {
  data: AppData;
  selectedChildId: number;
  today: string;
  actions: AppActions;
}
