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
