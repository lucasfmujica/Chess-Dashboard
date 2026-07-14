import { useCallback, useEffect, useState } from 'react';
import { fetchBlunderDrills, postBlunderDrills, putBlunderDrill } from '../api/client';
import { mineAllBlunders } from '../engine/mineBlunders';
import { nudgeConfidence } from '../utils/srs';
import { useGames } from '../context/GamesContext';
import type { BlunderDrill } from '../types/blunders';

export interface UseBlunderDrills {
  drills: BlunderDrill[];
  loading: boolean;
  mining: boolean;
  error: string | null;
  /** Scan all loaded games for newly-analyzed blunders and insert them. */
  mine: () => Promise<void>;
  /** Record a review-mode outcome (nudges confidence via SRS). */
  review: (id: string, correct: boolean) => Promise<void>;
  /** Record a solve-mode outcome (grades exact-UCI, nudges confidence). */
  solve: (id: string, correct: boolean) => Promise<void>;
}

export const useBlunderDrills = (): UseBlunderDrills => {
  const { games } = useGames();
  const [drills, setDrills] = useState<BlunderDrill[]>([]);
  const [loading, setLoading] = useState(true);
  const [mining, setMining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setDrills(await fetchBlunderDrills());
  }, []);

  useEffect(() => {
    setLoading(true);
    refetch()
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load blunder drills'))
      .finally(() => setLoading(false));
  }, [refetch]);

  const mine = useCallback(async () => {
    setMining(true);
    setError(null);
    try {
      const mined = mineAllBlunders(games);
      if (mined.length > 0) {
        await postBlunderDrills(mined);
        await refetch();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mine blunders');
    } finally {
      setMining(false);
    }
  }, [games, refetch]);

  const applyOutcome = useCallback(
    async (id: string, correct: boolean, counterField: 'reviewCount' | 'solvedCount') => {
      const current = drills.find(d => d.id === id);
      if (!current) return;
      const confidence = nudgeConfidence(current.confidence, correct);
      const patch = {
        confidence,
        lastReviewed: Date.now(),
        [counterField]: (counterField === 'reviewCount' ? current.reviewCount : current.solvedCount) + 1,
      };
      const updated = await putBlunderDrill(id, patch);
      setDrills(prev => prev.map(d => (d.id === id ? updated : d)));
    },
    [drills]
  );

  const review = useCallback((id: string, correct: boolean) => applyOutcome(id, correct, 'reviewCount'), [applyOutcome]);
  const solve = useCallback((id: string, correct: boolean) => applyOutcome(id, correct, 'solvedCount'), [applyOutcome]);

  return { drills, loading, mining, error, mine, review, solve };
};
