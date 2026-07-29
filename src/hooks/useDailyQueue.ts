import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchRepertoireLines, putRepertoireLine } from '../api/client';
import { useBlunderDrills } from './useBlunderDrills';
import { useEndgameDrills } from './useEndgameDrills';
import { isDue, nudgeConfidence } from '../utils/srs';
import { pickDueFirst } from '../utils/queueSelection';
import { localDateKey, weekdayIndex } from '../utils/localDate';
import { programForWeekday, type QueueQuota } from '../constants/trainingProgram';
import type { BlunderDrill } from '../types/blunders';
import type { EndgameDrill } from '../types/endgames';
import type { RepertoireLine } from '../types/chess';

/**
 * The unified "what do I do today" queue.
 *
 * Blunder drills, endgame drills and repertoire lines each already carry
 * confidence + lastReviewed and are already scored by utils/srs. What was
 * missing was any view that crossed the three, so ~1000 mined exercises sat
 * unserved while each tab reported its own due count in isolation. This hook
 * is that crossing: it takes the weekday's quota from the training program
 * and returns a fixed, ordered list — no filters, no choosing.
 */

export type QueueItem =
  | { kind: 'blunder'; id: string; drill: BlunderDrill }
  | { kind: 'endgame'; id: string; drill: EndgameDrill }
  | { kind: 'repertoire'; id: string; line: RepertoireLine };

/** Accessors for the three item shapes, all of which carry the same SRS pair. */
const drillAccessors = {
  getId: (d: BlunderDrill | EndgameDrill) => d.id,
  getConfidence: (d: BlunderDrill | EndgameDrill) => d.confidence,
  getLastReviewed: (d: BlunderDrill | EndgameDrill) => d.lastReviewed,
};

const lineAccessors = {
  getId: (l: RepertoireLine) => l.id,
  getConfidence: (l: RepertoireLine) => l.confidence,
  getLastReviewed: (l: RepertoireLine) => l.lastReviewed,
};

export interface UseDailyQueue {
  items: QueueItem[];
  loading: boolean;
  error: string | null;
  /** Today's local calendar day, 'YYYY-MM-DD'. */
  dayKey: string;
  quota: QueueQuota;
  /** How many items are due across all three sources, ignoring the quota. */
  dueTotals: { blunder: number; endgame: number; repertoire: number; total: number };
  /**
   * Persist one item's outcome: nudges confidence and stamps lastReviewed via
   * the same SRS the drill tabs use. Does NOT write training_attempts — the
   * caller batches those so a session is one bulk insert.
   */
  resolve: (item: QueueItem, correct: boolean) => Promise<void>;
  refetchRepertoire: () => Promise<void>;
}

export const useDailyQueue = (): UseDailyQueue => {
  const blunders = useBlunderDrills();
  const endgames = useEndgameDrills();
  const [lines, setLines] = useState<RepertoireLine[]>([]);
  const [linesLoading, setLinesLoading] = useState(true);
  const [linesError, setLinesError] = useState<string | null>(null);

  // Frozen at mount: recomputing `now` on every render would let an item flip
  // out of "due" mid-session and reorder the list under the user.
  const [now] = useState(() => Date.now());
  const dayKey = useMemo(() => localDateKey(), []);
  const quota = useMemo(() => programForWeekday(weekdayIndex(dayKey)).quota, [dayKey]);

  const refetchRepertoire = useCallback(async () => {
    setLines(await fetchRepertoireLines());
  }, []);

  useEffect(() => {
    setLinesLoading(true);
    refetchRepertoire()
      .catch(err =>
        setLinesError(err instanceof Error ? err.message : 'Failed to load repertoire lines')
      )
      .finally(() => setLinesLoading(false));
  }, [refetchRepertoire]);

  const items = useMemo<QueueItem[]>(() => {
    const chosenBlunders = pickDueFirst(
      blunders.drills,
      quota.blunder,
      now,
      dayKey,
      drillAccessors
    ).map<QueueItem>(drill => ({ kind: 'blunder', id: drill.id, drill }));

    const chosenEndgames = pickDueFirst(
      endgames.drills,
      quota.endgame,
      now,
      dayKey,
      drillAccessors
    ).map<QueueItem>(drill => ({ kind: 'endgame', id: drill.id, drill }));

    const chosenLines = pickDueFirst(
      lines,
      quota.repertoire,
      now,
      dayKey,
      lineAccessors
    ).map<QueueItem>(line => ({ kind: 'repertoire', id: line.id, line }));

    return [...chosenBlunders, ...chosenEndgames, ...chosenLines];
  }, [blunders.drills, endgames.drills, lines, quota, now, dayKey]);

  const dueTotals = useMemo(() => {
    const blunder = blunders.drills.filter(d => isDue(d.lastReviewed, d.confidence, now)).length;
    const endgame = endgames.drills.filter(d => isDue(d.lastReviewed, d.confidence, now)).length;
    const repertoire = lines.filter(l => isDue(l.lastReviewed, l.confidence, now)).length;
    return { blunder, endgame, repertoire, total: blunder + endgame + repertoire };
  }, [blunders.drills, endgames.drills, lines, now]);

  const resolve = useCallback(
    async (item: QueueItem, correct: boolean) => {
      if (item.kind === 'blunder') {
        await blunders.solve(item.id, correct);
        return;
      }
      if (item.kind === 'endgame') {
        await endgames.review(item.id, correct);
        return;
      }
      // PUT /repertoire-lines is a *full replace*, not a patch: sending only
      // {confidence, lastReviewed} would null out plan, goldenRule and notes.
      // Spread the whole line and override, matching OpeningsFlashcardsTab.
      const updated = await putRepertoireLine(item.id, {
        ...item.line,
        confidence: nudgeConfidence(item.line.confidence, correct),
        lastReviewed: Date.now(),
        reviewCountInc: 1,
      });
      setLines(prev => prev.map(l => (l.id === item.id ? updated : l)));
    },
    [blunders, endgames]
  );

  return {
    items,
    loading: blunders.loading || endgames.loading || linesLoading,
    error: blunders.error || endgames.error || linesError,
    dayKey,
    quota,
    dueTotals,
    resolve,
    refetchRepertoire,
  };
};
