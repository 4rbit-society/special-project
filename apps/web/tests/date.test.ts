import { describe, expect, it } from 'vitest';
import { localDate } from '../src/lib/date';
describe('calendar dates', () => {
  it('uses local calendar fields around midnight instead of UTC conversion', () => {
    const date = new Date(2026, 10, 17, 0, 5);
    expect(localDate(date)).toBe('2026-11-17');
  });
});
