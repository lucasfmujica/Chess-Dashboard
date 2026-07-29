import { isDue, nextReviewAt } from './srs';

/**
 * Selection policy for the daily training queue.
 *
 * Kept out of the hook so the ordering rules — which decide what actually
 * gets trained each day — can be tested without React.
 */

/**
 * Stable per-day tiebreak. Selection must not reshuffle when the component
 * re-renders or the page is refreshed mid-session, so ordering among equally
 * due items is a pure hash of (day, item id) rather than Math.random().
 * FNV-1a: cheap, no dependencies, and well spread for short string keys.
 */
export const dayHash = (id: string, dayKey: string): number => {
  let hash = 2166136261;
  const input = `${dayKey}:${id}`;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

/** What the selector needs to know about an item, however it's shaped. */
export interface QueueAccessors<T> {
  getId: (item: T) => string;
  getConfidence: (item: T) => number | undefined;
  getLastReviewed: (item: T) => number | undefined;
}

/**
 * Pick `count` items: everything due first (soonest next-review first), then
 * lowest-confidence items as filler so a day is never short just because the
 * SRS intervals happen not to have elapsed. Ties broken by the day hash.
 */
export const pickDueFirst = <T>(
  items: T[],
  count: number,
  now: number,
  dayKey: string,
  accessors: QueueAccessors<T>
): T[] => {
  if (count <= 0 || items.length === 0) return [];
  const { getId, getConfidence, getLastReviewed } = accessors;

  return [...items]
    .map(item => ({
      item,
      // Due items always precede filler; within a tier, soonest next review,
      // then lowest confidence, then the stable hash.
      tier: isDue(getLastReviewed(item), getConfidence(item), now) ? 0 : 1,
      next: nextReviewAt(getLastReviewed(item), getConfidence(item)),
      confidence: getConfidence(item) ?? 0,
      hash: dayHash(getId(item), dayKey),
    }))
    .sort(
      (a, b) =>
        a.tier - b.tier || a.next - b.next || a.confidence - b.confidence || a.hash - b.hash
    )
    .slice(0, count)
    .map(entry => entry.item);
};
