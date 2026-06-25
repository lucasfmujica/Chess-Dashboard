import { useCallback, useEffect, useRef, useState } from 'react';
import { analyzeGame } from '../engine/analyzeGame';
import type { GameAnalysis } from '../engine/analyzeGame';

const DEPTH = 13;

/** Small stable hash for cache keys. */
const hash = (s: string): string => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
};

const cacheKey = (pgn: string): string => `chess-dashboard-analysis-${hash(pgn)}-d${DEPTH}`;

const loadCache = (pgn?: string): GameAnalysis | null => {
  if (!pgn) return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(pgn));
    return raw ? (JSON.parse(raw) as GameAnalysis) : null;
  } catch {
    return null;
  }
};

/** Read a previously-cached analysis for a game (null if not analysed yet). */
export const getCachedAnalysis = (pgn?: string): GameAnalysis | null => loadCache(pgn);

/**
 * Analyse a game and persist it to the same cache `getCachedAnalysis` reads.
 * Used for batch ("analyze all") runs. Returns null when there's nothing to do.
 */
export const analyzeAndCacheGame = async (
  pgn: string,
  fens: string[],
  opts: { signal?: AbortSignal; onProgress?: (done: number, total: number) => void } = {}
): Promise<GameAnalysis | null> => {
  if (!pgn || fens.length < 2) return null;
  const result = await analyzeGame(fens, opts);
  try {
    window.localStorage.setItem(cacheKey(pgn), JSON.stringify(result));
  } catch {
    /* cache best-effort */
  }
  return result;
};

export interface UseGameAnalysis {
  analysis: GameAnalysis | null;
  analyzing: boolean;
  /** 0..1 */
  progress: number;
  error: string | null;
  analyze: () => void;
  cancel: () => void;
}

/**
 * Manage on-demand Stockfish analysis for a game, with localStorage caching,
 * progress reporting and cancellation.
 */
export const useGameAnalysis = (pgn: string | undefined, fens: string[]): UseGameAnalysis => {
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(() => loadCache(pgn));
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Reset / load cache when the game changes.
  useEffect(() => {
    abortRef.current?.abort();
    setAnalysis(loadCache(pgn));
    setAnalyzing(false);
    setProgress(0);
    setError(null);
  }, [pgn]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setAnalyzing(false);
  }, []);

  const analyze = useCallback(() => {
    if (!pgn || fens.length < 2) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setAnalyzing(true);
    setProgress(0);
    setError(null);

    analyzeGame(fens, {
      signal: controller.signal,
      onProgress: (done, total) => setProgress(done / total),
    })
      .then(result => {
        if (controller.signal.aborted) return;
        setAnalysis(result);
        try {
          window.localStorage.setItem(cacheKey(pgn), JSON.stringify(result));
        } catch {
          /* cache best-effort */
        }
      })
      .catch((e: unknown) => {
        if ((e as Error)?.name === 'AbortError') return;
        setError((e as Error)?.message || 'Analysis failed.');
      })
      .finally(() => {
        if (abortRef.current === controller) {
          setAnalyzing(false);
        }
      });
  }, [pgn, fens]);

  // Cancel any running analysis on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  return { analysis, analyzing, progress, error, analyze, cancel };
};
