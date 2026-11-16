import type { HealthResponse } from '@starter/shared';
import { ApiClient } from './client';

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return new ApiClient(null, undefined, import.meta.env.VITE_API_BASE_URL ?? '').request<HealthResponse>('/health', 'GET', undefined, signal);
}
