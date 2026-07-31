import type { AnnotatedGame, KeyMoment } from '../../../../types/chess';

/**
 * Numbered SAN for a move played from position `ply`, e.g. `12...Nxe5`.
 * Even plies are White's, so the ellipsis marks Black's half-move.
 */
export const plyLabel = (ply: number, san: string): string =>
  `${Math.floor(ply / 2) + 1}${ply % 2 === 0 ? '.' : '...'}${san}`;

/** Moments in board order, with hand-typed ones (no ply) kept at the end. */
export const sortMoments = (moments: KeyMoment[]): KeyMoment[] =>
  [...moments].sort((a, b) => (a.ply ?? Infinity) - (b.ply ?? Infinity));

/**
 * Make `index` the critical moment, and mirror it onto the flat columns.
 *
 * Those columns are what the record can be counted by, so they are derived
 * rather than typed: one starred moment per game, and it is always one of the
 * moments actually written down.
 */
export const setCriticalMoment = (
  moments: KeyMoment[],
  index: number
): Pick<AnnotatedGame, 'keyMoments' | 'criticalMomentFen' | 'playedMove' | 'bestMove'> => {
  const updated = moments.map((m, i) => ({ ...m, critical: i === index }));
  return { keyMoments: updated, ...criticalFields(updated) };
};

/** The flat columns implied by whichever moment is starred. */
export const criticalFields = (
  moments: KeyMoment[]
): Pick<AnnotatedGame, 'criticalMomentFen' | 'playedMove' | 'bestMove'> => {
  const critical = moments.find(m => m.critical);
  if (!critical) return { criticalMomentFen: undefined, playedMove: undefined, bestMove: undefined };
  return {
    criticalMomentFen: critical.fen,
    // The label carries the move number; the columns want the bare SAN.
    playedMove: critical.move.replace(/^\d+\.+/, '') || undefined,
    bestMove: critical.bestMove,
  };
};

/**
 * Add a moment, keeping board order and making the first one critical by
 * default — a post-mortem with moments but no decisive one records nothing
 * countable, and the first one recorded is the likeliest candidate anyway.
 */
export const addMoment = (
  moments: KeyMoment[],
  moment: KeyMoment
): Pick<AnnotatedGame, 'keyMoments' | 'criticalMomentFen' | 'playedMove' | 'bestMove'> => {
  const next = sortMoments([...moments, { ...moment, critical: moments.length === 0 }]);
  return { keyMoments: next, ...criticalFields(next) };
};

/** Remove a moment, re-starring the first survivor if the critical one went. */
export const removeMoment = (
  moments: KeyMoment[],
  index: number
): Pick<AnnotatedGame, 'keyMoments' | 'criticalMomentFen' | 'playedMove' | 'bestMove'> => {
  const next = moments.filter((_, i) => i !== index);
  if (next.length > 0 && !next.some(m => m.critical)) next[0] = { ...next[0], critical: true };
  return { keyMoments: next, ...criticalFields(next) };
};

/** Edit one field of one moment, keeping the derived columns in step. */
export const updateMoment = (
  moments: KeyMoment[],
  index: number,
  patch: Partial<KeyMoment>
): Pick<AnnotatedGame, 'keyMoments' | 'criticalMomentFen' | 'playedMove' | 'bestMove'> => {
  const next = moments.map((m, i) => (i === index ? { ...m, ...patch } : m));
  return { keyMoments: next, ...criticalFields(next) };
};
