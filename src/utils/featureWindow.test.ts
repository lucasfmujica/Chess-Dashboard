import { describe, it, expect } from 'vitest';
import { artDateKey, hidePrepDistractions, PREP_DISTRACTION_TABS } from './featureWindow';

describe('artDateKey', () => {
  it('reads the Argentine calendar day, not the UTC one', () => {
    // 02:30 UTC on Dec 4 is still 23:30 on Dec 3 in Buenos Aires.
    expect(artDateKey(new Date('2026-12-04T02:30:00Z'))).toBe('2026-12-03');
    expect(artDateKey(new Date('2026-12-04T03:00:00Z'))).toBe('2026-12-04');
  });
});

describe('hidePrepDistractions', () => {
  it('hides today (2026-11-09)', () => {
    expect(hidePrepDistractions(new Date('2026-11-09T16:00:00Z'))).toBe(true);
  });

  it('is still hidden through the last evening of December 3rd ART', () => {
    expect(hidePrepDistractions(new Date('2026-12-04T02:59:59Z'))).toBe(true);
  });

  it('lifts at ART midnight on December 4th', () => {
    expect(hidePrepDistractions(new Date('2026-12-04T03:00:00Z'))).toBe(false);
    expect(hidePrepDistractions(new Date('2027-01-15T12:00:00Z'))).toBe(false);
  });
});

describe('PREP_DISTRACTION_TABS', () => {
  it('covers exactly the four sections the plan hides', () => {
    expect([...PREP_DISTRACTION_TABS].sort()).toEqual(
      ['geography', 'norm-tracker', 'records', 'streaks']
    );
  });
});
