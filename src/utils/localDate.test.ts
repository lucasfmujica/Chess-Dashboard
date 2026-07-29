import { describe, it, expect, vi, afterEach } from 'vitest';
import { localDateKey, daysAgoKey, dateFromKey, weekdayIndex } from './localDate';

afterEach(() => {
  vi.useRealTimers();
});

describe('localDateKey', () => {
  it('formats a date as YYYY-MM-DD with zero padding', () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(localDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('uses the local calendar day, not the UTC one', () => {
    // 21:15 local on Jul 28 is already Jul 29 in UTC for any negative offset.
    // toISOString() would report the 29th; the local day is still the 28th.
    const evening = new Date(2026, 6, 28, 21, 15);
    expect(localDateKey(evening)).toBe('2026-07-28');
    if (evening.getTimezoneOffset() > 0) {
      // Only meaningful west of UTC, where the bug this guards actually bites.
      expect(evening.toISOString().slice(0, 10)).toBe('2026-07-29');
    }
  });
});

describe('daysAgoKey', () => {
  it('counts back whole days from today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 28, 12, 0));
    expect(daysAgoKey(0)).toBe('2026-07-28');
    expect(daysAgoKey(1)).toBe('2026-07-27');
    expect(daysAgoKey(28)).toBe('2026-06-30');
  });

  it('crosses year boundaries', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 2, 12, 0));
    expect(daysAgoKey(3)).toBe('2025-12-30');
  });
});

describe('dateFromKey', () => {
  it('parses to local midnight, not UTC midnight', () => {
    const parsed = dateFromKey('2026-07-28');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(6);
    expect(parsed.getDate()).toBe(28);
    expect(parsed.getHours()).toBe(0);
  });

  it('round-trips with localDateKey', () => {
    expect(localDateKey(dateFromKey('2026-03-01'))).toBe('2026-03-01');
  });
});

describe('weekdayIndex', () => {
  it('is Monday-based: 0 = Monday, 6 = Sunday', () => {
    // 2026-07-27 is a Monday.
    expect(weekdayIndex('2026-07-27')).toBe(0);
    expect(weekdayIndex('2026-07-28')).toBe(1);
    expect(weekdayIndex('2026-08-01')).toBe(5);
    expect(weekdayIndex('2026-08-02')).toBe(6);
  });
});
