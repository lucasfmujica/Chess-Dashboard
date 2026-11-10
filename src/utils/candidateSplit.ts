import type { TrainingAttempt } from '../types/training';
import type { AnnotatedGame } from '../types/chess';

/**
 * The diagnostic split: of the exercises failed, how many were failed because
 * the right move was never a candidate at all.
 *
 * `candidateMiss` is only meaningful on a wrong answer, and is undefined when
 * the question wasn't asked (endgame and repertoire items skip it — those
 * misses are knowledge gaps and would blur the distribution). So the
 * denominator is not "wrong answers", it is "wrong answers where the question
 * was actually put", and computing it any other way silently understates the
 * miss rate.
 *
 * Shared rather than duplicated because it is shown in two places — the
 * Overview hero and Training -> Registro — and the two must never disagree.
 */

export interface CandidateSplit {
  /** Wrong answers where the candidate question was asked. The denominator. */
  asked: number;
  /** Of those, the right move never occurred to me — a candidate-sweep failure. */
  missed: number;
  /** It was on my list and I rejected it — a calculation/evaluation failure. */
  rejected: number;
  /** `missed` as a whole percentage of `asked`; 0 when nothing was asked. */
  missedPct: number;
}

export const candidateSplit = (attempts: TrainingAttempt[]): CandidateSplit => {
  const asked = attempts.filter(a => !a.correct && a.candidateMiss !== undefined);
  const missed = asked.filter(a => a.candidateMiss).length;
  return {
    asked: asked.length,
    missed,
    rejected: asked.length - missed,
    missedPct: asked.length ? Math.round((missed / asked.length) * 100) : 0,
  };
};

/** Below this many answered questions the percentage is noise, not a trend. */
export const WEAK_SIGNAL_THRESHOLD = 15;

export const isWeakSignal = (asked: number): boolean => asked < WEAK_SIGNAL_THRESHOLD;

/**
 * The same split, read from the post-OTB question instead of drill attempts:
 * every annotated moment that carries a `candidateFate`. The question is only
 * put for OTB games, so no further game filtering is needed — a moment
 * without a fate was simply not asked and stays out of the denominator.
 */
export const momentCandidateSplit = (annotations: AnnotatedGame[]): CandidateSplit => {
  const fates = annotations
    .flatMap(a => a.keyMoments ?? [])
    .map(m => m.candidateFate)
    .filter(f => f === 'missed' || f === 'rejected');
  const missed = fates.filter(f => f === 'missed').length;
  return {
    asked: fates.length,
    missed,
    rejected: fates.length - missed,
    missedPct: fates.length ? Math.round((missed / fates.length) * 100) : 0,
  };
};
