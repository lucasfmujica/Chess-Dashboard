import { describe, it, expect } from 'vitest';
import { toDateString } from './_dates';

describe('toDateString', () => {
  it('keeps an already-plain date as-is', () => {
    expect(toDateString('2025-10-15')).toBe('2025-10-15');
  });

  it('cuts a full timestamp back to its calendar day', () => {
    // This is the shape that broke game ordering: JSON.stringify on the Date the
    // driver returns for a DATE column.
    expect(toDateString('2025-10-15T03:00:00.000Z')).toBe('2025-10-15');
  });

  it('formats a Date with the local getters, preserving the calendar day', () => {
    // Local midnight, which is what the driver hands back for a DATE column.
    // toISOString().slice(0,10) would report the 14th anywhere west of UTC.
    expect(toDateString(new Date(2025, 9, 15))).toBe('2025-10-15');
  });

  it('zero-pads month and day', () => {
    expect(toDateString(new Date(2025, 0, 5))).toBe('2025-01-05');
  });

  it('is undefined for null and undefined, not the epoch', () => {
    expect(toDateString(null)).toBeUndefined();
    expect(toDateString(undefined)).toBeUndefined();
  });

  it('produces values that compare correctly as strings', () => {
    // The whole point: consumers compare these with plain YYYY-MM-DD bounds.
    // The raw timestamp form failed this — it sorts after its own day.
    const day = toDateString('2025-10-15T03:00:00.000Z') as string;
    expect(day <= '2025-10-15').toBe(true);
    expect(day >= '2025-10-15').toBe(true);
    expect('2025-10-15T03:00:00.000Z' <= '2025-10-15').toBe(false);
  });
});
