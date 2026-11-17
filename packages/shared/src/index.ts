export * from './schemas.js';

export type HealthResponse = {
  status: 'ok';
  database: 'connected';
  message: string;
  timestamp: string;
} | {
  status: 'error';
  database: 'disconnected';
  error: string;
  timestamp: string;
};

export type DelayDomain = 'speech' | 'motor' | 'cognitive' | 'social' | 'general';

export interface ChildProfileInput {
  name: string;
  age: number;
  delay_domain: DelayDomain;
  notes?: string | null;
  avatar?: string;
}

export type ChildProfileUpdate = Partial<ChildProfileInput>;

export interface Child extends ChildProfileInput {
  id: number;
  user_id: number;
  notes: string | null;
  avatar: string;
  created_at: string;
}

export interface Activity {
  id: number;
  name: string;
  icon: string;
  category: 'hygiene' | 'food' | 'school' | 'play' | 'other';
}

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: 'caregiver' | 'ot' | 'sped_teacher';
}
export interface ApiTask {
  id: number; schedule_id: number; activity_id: number | null;
  name: string; icon: string; start_time: string | null; duration_min: number | null;
  position: number; status: 'pending' | 'done'; completed_at: string | null;
}
export interface ApiSchedule {
  id: number; child_id: number; schedule_date: string; created_at: string; tasks: ApiTask[]; revision: string;
}
export type VoiceSpeed = 'slow' | 'normal' | 'fast';
export interface ApiSettings {
  font_size: 'small' | 'medium' | 'large'; contrast: 'normal' | 'high'; sound_on: boolean; voice_speed: VoiceSpeed;
}
export interface ApiCard {
  id: number; child_id: number | null; label: string; icon: string;
  category: 'Food' | 'Emotions' | 'Activities' | 'Needs'; is_hidden: boolean;
}
export interface ProgressDay { date: string; done: number; total: number; percentage: number }
export type ProgressRange = '7d' | '30d';
export interface ActivityProgress {
  name: string;
  icon: string;
  total: number;
  completed: number;
  percentage: number;
  last_completed_at: string | null;
}
export interface ActivityProgressSummary {
  child_id: number;
  range: ProgressRange;
  activities: ActivityProgress[];
}
export interface ProgressSummary {
  child_id: number; range: '7d'; today: ProgressDay; last_7_days: ProgressDay[];
  recent_completions: Array<{ task_id: number; name: string; icon: string; schedule_date: string; completed_at: string }>;
}
