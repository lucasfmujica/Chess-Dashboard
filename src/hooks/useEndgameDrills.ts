import { useCallback, useEffect, useState } from 'react';
import { fetchEndgameDrills, postEndgameDrills, putEndgameDrill } from '../api/client';
import { mineAllEndgames } from '../engine/mineEndgames';
import { nudgeConfidence } from '../utils/srs';
import { useGames } from '../context/GamesContext';
import type { EndgameDrill } from '../types/endgames';

export interface UseEndgameDrills {
  drills: EndgameDrill[];
  loading: boolean;
  mining: boolean;
  error: string | null;
  /** Scan every game for an endgame snapshot and insert new ones — instant, no Stockfish needed. */
  mine: () => Promise<void>;
  /** Record a review outcome (nudges confidence via SRS). */
  review: (id: string, correct: boolean) => Promise<void>;
}

export const useEndgameDrills = (): UseEndgameDrills => {
  const { games } = useGames();
  const [drills, setDrills] = useState<EndgameDrill[]>([]);
  const [loading, setLoading] = useState(true);
  const [mining, setMining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setDrills(await fetchEndgameDrills());
  }, []);

  useEffect(() => {
    setLoading(true);
    refetch()
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load endgame drills'))
      .finally(() => setLoading(false));
  }, [refetch]);

  const mine = useCallback(async () => {
    setMining(true);
    setError(null);
    try {
      const mined = mineAllEndgames(games);
      if (mined.length > 0) {
        await postEndgameDrills(mined);
        await refetch();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mine endgames');
    } finally {
      setMining(false);
    }
  }, [games, refetch]);

  const review = useCallback(
    async (id: string, correct: boolean) => {
      const current = drills.find(d => d.id === id);
      if (!current) return;
      const confidence = nudgeConfidence(current.confidence, correct);
      const updated = await putEndgameDrill(id, {
        confidence,
        lastReviewed: Date.now(),
        reviewCount: current.reviewCount + 1,
      });
      setDrills(prev => prev.map(d => (d.id === id ? updated : d)));
    },
    [drills]
  );

  return { drills, loading, mining, error, mine, review };
};
