import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchConcepts, putConcept } from '../api/client';
import { isDue, nudgeConfidence } from '../utils/srs';
import type { Concept } from '../types/training';

/**
 * The studied concepts, with the SRS the schema always implied.
 *
 * `concepts` has carried `confidence` and `last_reviewed` since it was created
 * — the column comment even says they exist so concepts can "ride the same SRS
 * helpers as drills" — but nothing ever read them back. The table was
 * write-only: one `fetchConcepts` call in one tab, and no way for a concept to
 * come back and ask to be recalled. This is the missing half.
 */

export interface UseConcepts {
  concepts: Concept[];
  loading: boolean;
  error: string | null;
  /** Concepts due for review, ignoring any quota. */
  dueCount: number;
  /**
   * A concept with no game of yours attached was read, not learned — the rule
   * the training program states and the Concepts tab already displays.
   */
  appliedCount: number;
  review: (id: string, correct: boolean) => Promise<void>;
  refetch: () => Promise<void>;
}

export const useConcepts = (): UseConcepts => {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Frozen at mount, matching useDailyQueue: a card must not flip out of "due"
  // mid-session and reorder the list under the user.
  const [now] = useState(() => Date.now());

  const refetch = useCallback(async () => {
    setConcepts(await fetchConcepts());
  }, []);

  useEffect(() => {
    setLoading(true);
    refetch()
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load concepts'))
      .finally(() => setLoading(false));
  }, [refetch]);

  const dueCount = useMemo(
    () => concepts.filter(c => isDue(c.lastReviewed, c.confidence, now)).length,
    [concepts, now]
  );

  const appliedCount = useMemo(
    () => concepts.filter(c => c.gameIds.length > 0).length,
    [concepts]
  );

  const review = useCallback(
    async (id: string, correct: boolean) => {
      const current = concepts.find(c => c.id === id);
      if (!current) return;
      // Only these three fields travel: the PUT writes whatever is present, so
      // sending the whole concept back would make a review a full rewrite.
      const updated = await putConcept(id, {
        confidence: nudgeConfidence(current.confidence, correct),
        lastReviewed: Date.now(),
        reviewCountInc: 1,
      });
      setConcepts(prev => prev.map(c => (c.id === id ? updated : c)));
    },
    [concepts]
  );

  return { concepts, loading, error, dueCount, appliedCount, review, refetch };
};
