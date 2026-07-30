import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchRepertoireMoves, patchRepertoireMove } from '../api/client';
import { nudgeConfidence, isDue } from '../utils/srs';
import type { RepertoireMove } from '../types/chess';

/**
 * The per-move repertoire, grouped into the lines a session actually plays.
 *
 * Rows arrive flat and ordered by (chapter, depth, path). What the trainer
 * needs is a chapter at a time, front to back, so the grouping happens here
 * once rather than in the component on every render.
 */

/** One chapter's trainable moves, plus the traps and alternates behind them. */
export interface ChapterMoves {
  chapterNo: number;
  chapterName: string;
  eco?: string;
  color: 'W' | 'B';
  /** Scheduled moves, ordered by depth — the cards of this chapter. */
  main: RepertoireMove[];
  /**
   * Every non-`main` row indexed by `pathSan`, so a wrong move can be answered
   * with the study's own refutation instead of a generic "incorrecto".
   */
  byPath: Map<string, RepertoireMove[]>;
}

export interface UseRepertoireMoves {
  moves: RepertoireMove[];
  chapters: ChapterMoves[];
  loading: boolean;
  error: string | null;
  /** Due `main` moves, ignoring any quota. */
  dueCount: number;
  /** Record an outcome: nudges confidence and stamps lastReviewed. */
  review: (id: string, correct: boolean) => Promise<void>;
  refetch: () => Promise<void>;
}

export const useRepertoireMoves = (): UseRepertoireMoves => {
  const [moves, setMoves] = useState<RepertoireMove[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Frozen at mount, matching useDailyQueue: recomputing `now` per render
  // would let a card flip out of "due" mid-session and reorder under the user.
  const [now] = useState(() => Date.now());

  const refetch = useCallback(async () => {
    setMoves(await fetchRepertoireMoves());
  }, []);

  useEffect(() => {
    setLoading(true);
    refetch()
      .catch(err =>
        setError(err instanceof Error ? err.message : 'Failed to load repertoire moves')
      )
      .finally(() => setLoading(false));
  }, [refetch]);

  const chapters = useMemo<ChapterMoves[]>(() => {
    const byChapter = new Map<number, ChapterMoves>();

    for (const move of moves) {
      let chapter = byChapter.get(move.chapterNo);
      if (!chapter) {
        chapter = {
          chapterNo: move.chapterNo,
          chapterName: move.chapterName,
          eco: move.eco,
          color: move.color,
          main: [],
          byPath: new Map(),
        };
        byChapter.set(move.chapterNo, chapter);
      }

      if (move.role === 'main') {
        chapter.main.push(move);
      } else {
        chapter.byPath.set(move.pathSan, [...(chapter.byPath.get(move.pathSan) ?? []), move]);
      }
    }

    return [...byChapter.values()].sort((a, b) => a.chapterNo - b.chapterNo);
  }, [moves]);

  const dueCount = useMemo(
    () =>
      moves.filter(m => m.role === 'main' && isDue(m.lastReviewed, m.confidence, now)).length,
    [moves, now]
  );

  const review = useCallback(
    async (id: string, correct: boolean) => {
      const current = moves.find(m => m.id === id);
      if (!current) return;
      const updated = await patchRepertoireMove(id, {
        confidence: nudgeConfidence(current.confidence, correct),
        lastReviewed: Date.now(),
        // Incremented server-side so the trainer and the daily queue can't
        // overwrite each other's count with a stale total.
        reviewCountInc: 1,
      });
      setMoves(prev => prev.map(m => (m.id === id ? updated : m)));
    },
    [moves]
  );

  return { moves, chapters, loading, error, dueCount, review, refetch };
};
