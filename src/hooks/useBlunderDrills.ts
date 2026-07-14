import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchBlunderDrills, postBlunderDrills, putBlunderDrill } from '../api/client';
import { mineAllBlunders } from '../engine/mineBlunders';
import { analyzeAndCacheGame, getCachedAnalysis } from './useGameAnalysis';
import { fensFromPgn } from '../utils/chessReplay';
import { nudgeConfidence } from '../utils/srs';
import { useGames } from '../context/GamesContext';
import type { BlunderDrill } from '../types/blunders';

export interface AnalyzeBatchState {
  done: number;
  total: number;
  name: string;
}

export interface UseBlunderDrills {
  drills: BlunderDrill[];
  loading: boolean;
  /** Mining (post-analysis) is in progress — either alone or as the tail of analyzeAndMine. */
  mining: boolean;
  /** Stockfish batch-analysis progress, non-null while analyzeAndMine is running the analysis phase. */
  batch: AnalyzeBatchState | null;
  /** Games with moves that have no cached analysis yet (what analyzeAndMine would need to run Stockfish on). */
  pendingAnalysisCount: number;
  error: string | null;
  /** Scan already-analyzed games for blunders and insert them (fast, no Stockfish). */
  mine: () => Promise<void>;
  /** Stockfish-analyze every not-yet-analyzed game, then mine — one click from empty to a full queue. */
  analyzeAndMine: () => Promise<void>;
  cancelBatch: () => void;
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
  const [batch, setBatch] = useState<AnalyzeBatchState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refetch = useCallback(async () => {
    setDrills(await fetchBlunderDrills());
  }, []);

  useEffect(() => {
    setLoading(true);
    refetch()
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load blunder drills'))
      .finally(() => setLoading(false));
  }, [refetch]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const pendingAnalysisCount = useMemo(
    () => games.filter(g => g.pgn && fensFromPgn(g.pgn).length > 1 && !getCachedAnalysis(g.pgn)).length,
    [games]
  );

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

  const analyzeAndMine = useCallback(async () => {
    setError(null);
    const list = games.filter(g => g.pgn && fensFromPgn(g.pgn).length > 1 && !getCachedAnalysis(g.pgn));

    if (list.length > 0) {
      const controller = new AbortController();
      abortRef.current = controller;
      setBatch({ done: 0, total: list.length, name: list[0].opp });

      let done = 0;
      for (const g of list) {
        if (controller.signal.aborted) break;
        setBatch({ done, total: list.length, name: g.opp });
        try {
          await analyzeAndCacheGame(g.pgn!, fensFromPgn(g.pgn), { signal: controller.signal });
        } catch (e) {
          if ((e as Error)?.name === 'AbortError') break;
          // Skip a game that errors (unreadable moves) and keep going.
        }
        done++;
        setBatch({ done, total: list.length, name: g.opp });
      }

      setBatch(null);
      abortRef.current = null;
    }

    await mine();
  }, [games, mine]);

  const cancelBatch = useCallback(() => abortRef.current?.abort(), []);

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

  return {
    drills,
    loading,
    mining,
    batch,
    pendingAnalysisCount,
    error,
    mine,
    analyzeAndMine,
    cancelBatch,
    review,
    solve,
  };
};
