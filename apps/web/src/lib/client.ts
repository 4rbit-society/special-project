import type { Activity, ApiCard, ApiSchedule, ApiSettings, ApiTask, Child, ChildProfileInput, HealthResponse, ProgressSummary, PublicUser, ScheduleDraftInput } from '@starter/shared';

export class ApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); this.name = 'ApiError'; }
}
export class ApiClient {
  constructor(private readonly token: string | null, private readonly unauthorized: () => void = () => {}, private readonly base = '') {}

  async request<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) controller.abort();
    const timer = setTimeout(abort, 20_000);
    try {
      const response = await fetch(`${this.base.replace(/\/$/, '')}/api${path}`, {
        method, signal: controller.signal,
        headers: { ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const text = await response.text();
      if (response.status === 401 && this.token) this.unauthorized();
      let result: unknown;
      try { result = text ? JSON.parse(text) : undefined; } catch { throw new ApiError(response.status, 'The server returned an unreadable response. Please retry.'); }
      if (!response.ok) {
        const message = result && typeof result === 'object' && 'error' in result && typeof result.error === 'string' ? result.error : `Request failed (${response.status}). Please retry.`;
        throw new ApiError(response.status, message);
      }
      return result as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
      throw new ApiError(0, controller.signal.aborted ? 'The request timed out. Reload before retrying a change.' : 'Cannot reach the server. Check your connection and reload before retrying a change.');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }
  health = () => this.request<HealthResponse>('/health');
  register = (input: { name: string; email: string; password: string; role: PublicUser['role'] }) => this.request<PublicUser>('/auth/register', 'POST', input);
  login = (email: string, password: string) => this.request<{ token: string; user: PublicUser }>('/auth/login', 'POST', { email, password });
  me = (signal?: AbortSignal) => this.request<PublicUser>('/auth/me', 'GET', undefined, signal);
  updateProfile = (name: string) => this.request<PublicUser>('/auth/me', 'PATCH', { name });
  children = () => this.request<Child[]>('/children');
  child = (id: number) => this.request<Child>(`/children/${id}`);
  createChild = (input: ChildProfileInput) => this.request<Child>('/children', 'POST', input);
  updateChild = (id: number, input: ChildProfileInput) => this.request<Child>(`/children/${id}`, 'PUT', input);
  deleteChild = (id: number) => this.request<{ success: true }>(`/children/${id}`, 'DELETE');
  activities = () => this.request<Activity[]>('/activities');
  schedule = (childId: number, date: string) => this.request<ApiSchedule>(`/schedules?${new URLSearchParams({ childId: String(childId), date })}`);
  createSchedule = (childId: number, date: string, copyFrom?: string) => this.request<ApiSchedule>('/schedules', 'POST', { childId, date, copyFrom });
  saveSchedule = (input: ScheduleDraftInput) => this.request<ApiSchedule>('/schedules', 'PUT', input);
  moveSchedule = (id: number, date: string) => this.request<ApiSchedule>(`/schedules/${id}`, 'PUT', { date });
  deleteSchedule = (id: number) => this.request<{ success: true }>(`/schedules/${id}`, 'DELETE');
  createTask = (scheduleId: number, activityId: number) => this.request<ApiTask>('/tasks', 'POST', { scheduleId, activityId });
  updateTask = (id: number, patch: { position?: number; start_time?: string | null; duration_min?: number | null }) => this.request<ApiTask>(`/tasks/${id}`, 'PUT', patch);
  deleteTask = (id: number) => this.request<{ success: true }>(`/tasks/${id}`, 'DELETE');
  completeTask = (id: number, done: boolean) => this.request<ApiTask>(`/tasks/${id}/complete`, 'PATCH', { done });
  cards = (childId: number) => this.request<Record<ApiCard['category'], ApiCard[]>>(`/cards?childId=${childId}&includeHidden=true`);
  createCard = (input: { childId: number; label: string; icon: string; category: ApiCard['category'] }) => this.request<ApiCard>('/cards', 'POST', input);
  hideCard = (id: number, hidden: boolean) => this.request<ApiCard>(`/cards/${id}`, 'PATCH', { hidden });
  deleteCard = (id: number) => this.request<{ success: true }>(`/cards/${id}`, 'DELETE');
  progress = (childId: number) => this.request<ProgressSummary>(`/progress/${childId}?range=7d`);
  settings = () => this.request<ApiSettings>('/settings');
  updateSettings = (input: ApiSettings) => this.request<ApiSettings>('/settings', 'PUT', input);
}
