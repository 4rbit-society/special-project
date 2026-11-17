export type VoiceSpeed = 'slow' | 'normal' | 'fast';

export function speechRateFor(speed: VoiceSpeed): number {
  return speed === 'slow' ? 0.65 : speed === 'fast' ? 1.1 : 0.85;
}

export function countdownLabel(seconds: number): string {
  const safe = Math.max(0, Math.min(99 * 60 + 59, Math.round(seconds)));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

export function countdownPercent(remaining: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));
}
