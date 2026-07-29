import type { Move } from 'chess.js';
import type { PositionEval } from '../engine/stockfishEngine';

/**
 * Grading for interactive drills.
 *
 * The old board compared the played move's UCI string against a single stored
 * `bestMoveUci`. That marks an objectively equal move wrong, and — because it
 * built the UCI as `from + to` — it marked every promotion wrong too, since
 * Stockfish stores `e7e8q`. Grading is now by centipawn loss, which has
 * neither problem.
 */

/**
 * Score assigned to a forced mate. Kept far above any real centipawn value
 * and adjusted by distance, so mate-in-1 outranks mate-in-5 and "you missed a
 * mate" produces a huge loss rather than a tie.
 */
export const MATE_SCORE = 100_000;

export type Verdict = 'correcta' | 'imprecisa' | 'mala';

/** Centipawn loss at or above which a move stops being correct. */
export const INACCURACY_CP = 30;
/** Centipawn loss at or above which a move is outright bad. */
export const MISTAKE_CP = 100;

/**
 * Collapse an engine score into one comparable number, from the perspective
 * of the side to move in the position that was evaluated.
 */
export const normalizeEval = (evaluation: PositionEval): number => {
  if (evaluation.mate !== undefined) {
    return evaluation.mate > 0
      ? MATE_SCORE - evaluation.mate
      : -MATE_SCORE - evaluation.mate;
  }
  return evaluation.cp ?? 0;
};

/**
 * UCI for a chess.js move, **including the promotion suffix**.
 *
 * This is the fix for the promotion bug: `from + to` alone can never equal
 * the `e7e8q` that Stockfish emits and the drill stores.
 */
export const moveToUci = (move: Pick<Move, 'from' | 'to'> & { promotion?: string }): string =>
  `${move.from}${move.to}${move.promotion ?? ''}`;

export interface Grade {
  /** Centipawns given up versus best play. Never negative. */
  cpLoss: number;
  verdict: Verdict;
}

export const verdictFor = (cpLoss: number): Verdict =>
  cpLoss < INACCURACY_CP ? 'correcta' : cpLoss < MISTAKE_CP ? 'imprecisa' : 'mala';

/**
 * Grade a played move.
 *
 * `beforeEval` is the puzzle position evaluated with the PLAYER to move, so
 * its score is already from the player's perspective. `afterEval` is the
 * position after the move, where the OPPONENT is to move — so its score must
 * be negated to get back to the player's perspective.
 *
 * The loss is clamped at zero: a deeper or luckier search on the resulting
 * position can score slightly better than the parent, and a negative "loss"
 * would be meaningless to show.
 */
export const gradeMove = (beforeEval: PositionEval, afterEval: PositionEval): Grade => {
  const best = normalizeEval(beforeEval);
  const actual = -normalizeEval(afterEval);
  const cpLoss = Math.max(0, best - actual);
  return { cpLoss, verdict: verdictFor(cpLoss) };
};

/** Human-readable centipawn delta, e.g. "−1.40". */
export const formatCpLoss = (cpLoss: number): string =>
  cpLoss >= MATE_SCORE / 2 ? 'mate perdido' : `−${(cpLoss / 100).toFixed(2)}`;
