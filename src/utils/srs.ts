const DAY = 24 * 60 * 60 * 1000;

/** Spaced-repetition interval (days) keyed by self-assessed confidence 1-5. */
export const CONFIDENCE_DAYS: Record<number, number> = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };

export const reviewIntervalMs = (confidence?: number) => (CONFIDENCE_DAYS[confidence ?? 1] ?? 1) * DAY;

/** An item is due when never reviewed, or its confidence-based interval has elapsed. */
export const isDue = (lastReviewed: number | undefined, confidence: number | undefined, now: number): boolean =>
  !lastReviewed || now - lastReviewed >= reviewIntervalMs(confidence);

/** Sort key: never-reviewed (0) first, then by soonest next-review time. */
export const nextReviewAt = (lastReviewed: number | undefined, confidence: number | undefined): number =>
  lastReviewed ? lastReviewed + reviewIntervalMs(confidence) : 0;

/** Nudge confidence 1-5 up/down by one step in response to a review outcome. */
export const nudgeConfidence = (confidence: number | undefined, correct: boolean): number =>
  correct ? Math.min(5, (confidence ?? 3) + 1) : Math.max(1, (confidence ?? 3) - 1);
