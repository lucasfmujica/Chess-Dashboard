import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  normalizeEval,
  moveToUci,
  gradeMove,
  verdictFor,
  formatCpLoss,
  MATE_SCORE,
  INACCURACY_CP,
  MISTAKE_CP,
} from './puzzleGrading';

describe('moveToUci', () => {
  it('includes the promotion suffix', () => {
    // The bug this exists to fix: the old board built `from + to`, so a
    // promotion could never equal the `e7e8q` Stockfish stores, and every
    // promotion puzzle was marked wrong.
    expect(moveToUci({ from: 'e7', to: 'e8', promotion: 'q' })).toBe('e7e8q');
    expect(moveToUci({ from: 'e7', to: 'e8', promotion: 'n' })).toBe('e7e8n');
  });

  it('omits the suffix for an ordinary move', () => {
    expect(moveToUci({ from: 'g1', to: 'f3' })).toBe('g1f3');
    expect(moveToUci({ from: 'g1', to: 'f3', promotion: undefined })).toBe('g1f3');
  });

  it('round-trips a real promotion through chess.js', () => {
    const chess = new Chess('8/4P3/8/8/8/8/8/K6k w - - 0 1');
    const move = chess.move({ from: 'e7', to: 'e8', promotion: 'q' });
    expect(moveToUci(move)).toBe('e7e8q');
  });

  it('round-trips an under-promotion', () => {
    const chess = new Chess('8/4P3/8/8/8/8/8/K6k w - - 0 1');
    const move = chess.move({ from: 'e7', to: 'e8', promotion: 'n' });
    expect(moveToUci(move)).toBe('e7e8n');
  });
});

describe('normalizeEval', () => {
  it('passes centipawns through', () => {
    expect(normalizeEval({ cp: 150 })).toBe(150);
    expect(normalizeEval({ cp: -240 })).toBe(-240);
  });

  it('treats a missing score as equal', () => {
    expect(normalizeEval({})).toBe(0);
  });

  it('ranks a faster mate above a slower one', () => {
    expect(normalizeEval({ mate: 1 })).toBeGreaterThan(normalizeEval({ mate: 5 }));
  });

  it('puts any mate far above any centipawn advantage', () => {
    expect(normalizeEval({ mate: 12 })).toBeGreaterThan(normalizeEval({ cp: 5000 }));
    expect(normalizeEval({ mate: -12 })).toBeLessThan(normalizeEval({ cp: -5000 }));
  });

  it('ranks being mated later above being mated sooner', () => {
    // -MATE_SCORE - mate: for mate:-1 that's -99999, for mate:-5 it's -99995.
    expect(normalizeEval({ mate: -5 })).toBeGreaterThan(normalizeEval({ mate: -1 }));
  });

  it('prefers mate over cp when both are somehow present', () => {
    expect(normalizeEval({ cp: 30, mate: 2 })).toBe(MATE_SCORE - 2);
  });
});

describe('verdictFor', () => {
  it('uses the documented thresholds', () => {
    expect(verdictFor(0)).toBe('correcta');
    expect(verdictFor(INACCURACY_CP - 1)).toBe('correcta');
    expect(verdictFor(INACCURACY_CP)).toBe('imprecisa');
    expect(verdictFor(MISTAKE_CP - 1)).toBe('imprecisa');
    expect(verdictFor(MISTAKE_CP)).toBe('mala');
    expect(verdictFor(900)).toBe('mala');
  });
});

describe('gradeMove', () => {
  // beforeEval is from the player's perspective (player to move);
  // afterEval is from the opponent's (opponent to move), so it gets negated.

  it('scores the engine move itself as no loss', () => {
    // Best play keeps +120 for the player, so after the move the opponent
    // sees -120.
    expect(gradeMove({ cp: 120 }, { cp: -120 })).toEqual({ cpLoss: 0, verdict: 'correcta' });
  });

  it('accepts a different move that is just as good', () => {
    // This is the whole point: the old exact-string grader called this wrong.
    const grade = gradeMove({ cp: 120 }, { cp: -110 });
    expect(grade.cpLoss).toBe(10);
    expect(grade.verdict).toBe('correcta');
  });

  it('flags a move that gives up half a pawn as imprecise', () => {
    const grade = gradeMove({ cp: 120 }, { cp: -70 });
    expect(grade.cpLoss).toBe(50);
    expect(grade.verdict).toBe('imprecisa');
  });

  it('flags a real blunder as bad', () => {
    // Player was +1.20, after the move the opponent is +2.00 — a 320cp swing.
    const grade = gradeMove({ cp: 120 }, { cp: 200 });
    expect(grade.cpLoss).toBe(320);
    expect(grade.verdict).toBe('mala');
  });

  it('treats a missed forced mate as a huge loss', () => {
    // Mate was on; the move leaves a merely winning position.
    const grade = gradeMove({ mate: 3 }, { cp: -400 });
    expect(grade.cpLoss).toBeGreaterThan(MATE_SCORE / 2);
    expect(grade.verdict).toBe('mala');
  });

  it('treats walking into mate as a huge loss', () => {
    // After the move the OPPONENT has mate in 2.
    const grade = gradeMove({ cp: 50 }, { mate: 2 });
    expect(grade.cpLoss).toBeGreaterThan(MATE_SCORE / 2);
    expect(grade.verdict).toBe('mala');
  });

  it('credits finding the mate', () => {
    // Mate in 3 available; the move delivers it, so the opponent is mated in 2.
    const grade = gradeMove({ mate: 3 }, { mate: -2 });
    expect(grade.cpLoss).toBe(0);
    expect(grade.verdict).toBe('correcta');
  });

  it('never reports a negative loss when the deeper search scores better', () => {
    // Searching the child position can beat the parent's score by a few cp.
    // A negative "loss" would be nonsense to display.
    const grade = gradeMove({ cp: 100 }, { cp: -140 });
    expect(grade.cpLoss).toBe(0);
    expect(grade.verdict).toBe('correcta');
  });

  it('grades from the player perspective when the player is worse', () => {
    // Player is losing (-300) and the move holds it; not a blunder.
    const grade = gradeMove({ cp: -300 }, { cp: 310 });
    expect(grade.cpLoss).toBe(10);
    expect(grade.verdict).toBe('correcta');
  });
});

describe('formatCpLoss', () => {
  it('renders pawns with a sign', () => {
    expect(formatCpLoss(140)).toBe('−1.40');
    expect(formatCpLoss(0)).toBe('−0.00');
  });

  it('names a lost mate instead of printing an absurd number', () => {
    expect(formatCpLoss(MATE_SCORE - 3 + 400)).toBe('mate perdido');
  });
});
