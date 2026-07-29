import { describe, it, expect } from 'vitest';
import { pickDueFirst, dayHash, type QueueAccessors } from './queueSelection';
import { CONFIDENCE_DAYS } from './srs';

interface Item {
  id: string;
  confidence?: number;
  lastReviewed?: number;
}

const accessors: QueueAccessors<Item> = {
  getId: i => i.id,
  getConfidence: i => i.confidence,
  getLastReviewed: i => i.lastReviewed,
};

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;
const KEY = '2026-07-28';

/** An item last reviewed `days` ago at the given confidence. */
const item = (id: string, confidence: number, daysAgo: number): Item => ({
  id,
  confidence,
  lastReviewed: NOW - daysAgo * DAY,
});

describe('pickDueFirst', () => {
  it('returns nothing when the quota is zero or there are no items', () => {
    expect(pickDueFirst([item('a', 1, 5)], 0, NOW, KEY, accessors)).toEqual([]);
    expect(pickDueFirst([], 5, NOW, KEY, accessors)).toEqual([]);
  });

  it('puts never-reviewed items first — they are the most overdue', () => {
    const fresh: Item = { id: 'never', confidence: undefined, lastReviewed: undefined };
    const picked = pickDueFirst(
      [item('reviewed', 1, 2), fresh],
      2,
      NOW,
      KEY,
      accessors
    );
    expect(picked[0].id).toBe('never');
  });

  it('serves every due item before any not-yet-due filler', () => {
    // confidence 5 = 30-day interval, reviewed yesterday -> not due.
    const notDue = item('notDue', 5, 1);
    // confidence 1 = 1-day interval, reviewed 3 days ago -> due.
    const due = item('due', 1, 3);
    const picked = pickDueFirst([notDue, due], 2, NOW, KEY, accessors);
    expect(picked.map(i => i.id)).toEqual(['due', 'notDue']);
  });

  it('falls back to filler so a day is never short of its quota', () => {
    const notDue = [item('a', 5, 1), item('b', 5, 2), item('c', 5, 3)];
    const picked = pickDueFirst(notDue, 3, NOW, KEY, accessors);
    expect(picked).toHaveLength(3);
  });

  it('orders due items by soonest next review, i.e. longest overdue first', () => {
    // Both confidence 1 (1-day interval); the older review is further overdue.
    const picked = pickDueFirst(
      [item('recent', 1, 2), item('ancient', 1, 40)],
      2,
      NOW,
      KEY,
      accessors
    );
    expect(picked.map(i => i.id)).toEqual(['ancient', 'recent']);
  });

  it('breaks ties among filler by lowest confidence', () => {
    // Same lastReviewed, so next-review differs only via the interval; the
    // lower-confidence item has the earlier next review and comes first.
    const shaky = { id: 'shaky', confidence: 4, lastReviewed: NOW };
    const solid = { id: 'solid', confidence: 5, lastReviewed: NOW };
    const picked = pickDueFirst([solid, shaky], 2, NOW, KEY, accessors);
    expect(picked.map(i => i.id)).toEqual(['shaky', 'solid']);
    // Guard the assumption the ordering rests on.
    expect(CONFIDENCE_DAYS[4]).toBeLessThan(CONFIDENCE_DAYS[5]);
  });

  it('is deterministic: the same day and inputs give the same order', () => {
    // All identical except id, so only the tiebreak hash can order them.
    const items = ['a', 'b', 'c', 'd', 'e'].map(id => ({ id, lastReviewed: undefined }));
    const first = pickDueFirst(items, 3, NOW, KEY, accessors).map(i => i.id);
    const second = pickDueFirst([...items].reverse(), 3, NOW, KEY, accessors).map(i => i.id);
    // Input order must not matter — a refresh that refetches in a different
    // order must not reshuffle the queue mid-session.
    expect(second).toEqual(first);
  });

  it('varies the tiebreak across days so the same items are not always first', () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      id: `item-${i}`,
      lastReviewed: undefined,
    }));
    const monday = pickDueFirst(items, 5, NOW, '2026-07-27', accessors).map(i => i.id);
    const tuesday = pickDueFirst(items, 5, NOW, '2026-07-28', accessors).map(i => i.id);
    expect(tuesday).not.toEqual(monday);
  });

  it('does not mutate the input array', () => {
    const items = [item('a', 1, 9), item('b', 1, 1)];
    const snapshot = items.map(i => i.id);
    pickDueFirst(items, 2, NOW, KEY, accessors);
    expect(items.map(i => i.id)).toEqual(snapshot);
  });
});

describe('dayHash', () => {
  it('is stable for the same id and day', () => {
    expect(dayHash('x', KEY)).toBe(dayHash('x', KEY));
  });

  it('differs across days and across ids', () => {
    expect(dayHash('x', '2026-07-28')).not.toBe(dayHash('x', '2026-07-29'));
    expect(dayHash('x', KEY)).not.toBe(dayHash('y', KEY));
  });
});
