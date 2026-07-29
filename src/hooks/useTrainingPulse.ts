import { useEffect, useState } from 'react';
import { fetchTrainingAttempts, fetchTrainingSessions } from '../api/client';
import { candidateSplit, type CandidateSplit } from '../utils/candidateSplit';
import { daysAgoKey, localDateKey, dateFromKey, weekdayIndex } from '../utils/localDate';

/**
 * The two process numbers for the Overview hero: how much was actually
 * trained this week, and what share of the failures were candidate misses.
 *
 * Two windows on purpose. Volume is only meaningful against the weekly quota,
 * but a single week rarely holds enough failures for a percentage to mean
 * anything, so the split is read over 30 days — the same default range as
 * Training -> Registro. The subtitles say which is which; a hero that mixed
 * them silently would be worse than no hero.
 *
 * Deliberately light: two plain fetches, no chess.js and no engine. TodayStrip
 * documents why the landing page must not pull the drill queue, and the same
 * constraint applies here.
 */

/** Days the split is read over. Matches the default range in TrainingLog. */
export const SPLIT_WINDOW_DAYS = 30;

export interface TrainingPulse {
  /** Attempts recorded since Monday, by the day they belong to. */
  attemptsThisWeek: number;
  /** Candidate split over the last SPLIT_WINDOW_DAYS. */
  split: CandidateSplit;
  /** Local date key of the most recent session, or null if there is none. */
  lastSessionDate: string | null;
  /** Whole days since that session. Null when nothing was ever recorded. */
  daysSinceLastSession: number | null;
  loading: boolean;
  error: string | null;
}

/** Local date key of the Monday starting the current week. */
export const startOfWeekKey = (today: Date = new Date()): string => {
  const monday = new Date(today);
  monday.setDate(monday.getDate() - weekdayIndex(localDateKey(today)));
  return localDateKey(monday);
};

const EMPTY_SPLIT: CandidateSplit = { asked: 0, missed: 0, rejected: 0, missedPct: 0 };

export const useTrainingPulse = (): TrainingPulse => {
  const [pulse, setPulse] = useState<Omit<TrainingPulse, 'loading' | 'error'>>({
    attemptsThisWeek: 0,
    split: EMPTY_SPLIT,
    lastSessionDate: null,
    daysSinceLastSession: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // The server filters on COALESCE(session_date, created_at::date), so a
        // session logged for an earlier day lands in the right week without
        // the client having to re-derive it.
        const [weekAttempts, windowAttempts, sessions] = await Promise.all([
          fetchTrainingAttempts(startOfWeekKey()),
          fetchTrainingAttempts(daysAgoKey(SPLIT_WINDOW_DAYS)),
          fetchTrainingSessions(daysAgoKey(SPLIT_WINDOW_DAYS)),
        ]);
        if (cancelled) return;

        const lastSessionDate = sessions.reduce<string | null>(
          (latest, s) => (latest === null || s.sessionDate > latest ? s.sessionDate : latest),
          null
        );
        const daysSinceLastSession =
          lastSessionDate === null
            ? null
            : Math.max(
                0,
                Math.round(
                  (dateFromKey(localDateKey()).getTime() - dateFromKey(lastSessionDate).getTime()) /
                    86_400_000
                )
              );

        setPulse({
          attemptsThisWeek: weekAttempts.length,
          split: candidateSplit(windowAttempts),
          lastSessionDate,
          daysSinceLastSession,
        });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'No se pudo leer el entrenamiento');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { ...pulse, loading, error };
};
