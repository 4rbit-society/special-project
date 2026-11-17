import { describe, expect, it } from 'vitest';
import { countdownLabel, countdownPercent, speechRateFor } from '../src/lib/timer';

describe('child timer helpers', () => {
  it('formats countdown values safely', () => {
    expect(countdownLabel(0)).toBe('0:00');
    expect(countdownLabel(65)).toBe('1:05');
    expect(countdownLabel(25 * 60)).toBe('25:00');
    expect(countdownLabel(-5)).toBe('0:00');
    expect(countdownLabel(999999)).toBe('99:59');
  });

  it('converts remaining time to a bounded percentage', () => {
    expect(countdownPercent(60, 120)).toBe(50);
    expect(countdownPercent(0, 120)).toBe(0);
    expect(countdownPercent(120, 120)).toBe(100);
    expect(countdownPercent(10, 0)).toBe(0);
    expect(countdownPercent(200, 120)).toBe(100);
  });

  it('maps voice speed preferences to speech rates', () => {
    expect(speechRateFor('slow')).toBe(0.65);
    expect(speechRateFor('normal')).toBe(0.85);
    expect(speechRateFor('fast')).toBe(1.1);
  });
});
