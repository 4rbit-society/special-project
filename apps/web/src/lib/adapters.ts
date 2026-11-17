import type { Activity, ApiSchedule, ApiSettings, ApiTask, Child, ChildProfileInput, ScheduleDraftInput } from '@starter/shared';
import type { AppData, ChildProfile, DailySchedule, Preferences, ScheduleTask } from '../model';
export const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
export const childFromApi = (child: Child): ChildProfile => ({ id: child.id, name: child.name, age: child.age, delayDomain: titleCase(child.delay_domain), notes: child.notes ?? '', avatar: child.avatar });
export const childToApi = (child: Omit<ChildProfile, 'id'>): ChildProfileInput => ({ name: child.name, age: child.age, delay_domain: child.delayDomain.toLowerCase() as ChildProfileInput['delay_domain'], notes: child.notes || null, avatar: child.avatar });
export const preferencesFromApi = (value: ApiSettings): Preferences => ({ fontSize: value.font_size, contrast: value.contrast, soundOn: value.sound_on, voiceSpeed: value.voice_speed });
export const preferencesToApi = (value: Preferences): ApiSettings => ({ font_size: value.fontSize, contrast: value.contrast, sound_on: value.soundOn, voice_speed: value.voiceSpeed });
export const activityFromApi = (value: Activity) => ({ activityId: String(value.id), name: value.name, icon: value.icon, category: titleCase(value.category) });
export function taskFromApi(task: ApiTask, activities: AppData['activities']): ScheduleTask {
  return { id: String(task.id), activityId: task.activity_id === null ? '' : String(task.activity_id), name: task.name, icon: task.icon, category: activities.find((item) => item.activityId === String(task.activity_id))?.category ?? 'Other', startTime: task.start_time ?? '', duration: task.duration_min, status: task.status, completedAt: task.completed_at };
}
export const scheduleFromApi = (value: ApiSchedule, activities: AppData['activities']): DailySchedule => ({ id: String(value.id), childId: value.child_id, date: value.schedule_date, revision: value.revision, tasks: value.tasks.map((task) => taskFromApi(task, activities)) });
export function draftToApi(draft: DailySchedule, saved?: DailySchedule): ScheduleDraftInput {
  return { childId: draft.childId, date: draft.date, ...(saved ? { scheduleId: Number(saved.id), expectedRevision: saved.revision } : {}), expectedTaskIds: saved?.tasks.map((task) => Number(task.id)) ?? [], tasks: draft.tasks.map((task) => ({ ...(/^\d+$/.test(task.id) ? { id: Number(task.id) } : /^\d+$/.test(task.activityId) ? { activityId: Number(task.activityId) } : { name: task.name, icon: task.icon }), start_time: task.startTime || null, duration_min: task.duration })) };
}
export const emptyData = (): AppData => ({ user: null, children: [], schedules: [], activities: [], cards: {}, progress: {}, preferences: { fontSize: 'medium', contrast: 'normal', soundOn: true, voiceSpeed: 'normal' } });
export function mergeSchedule(data: AppData, schedule: DailySchedule): AppData {
  return { ...data, schedules: [...data.schedules.filter((item) => !(item.childId === schedule.childId && item.date === schedule.date)), schedule] };
}
