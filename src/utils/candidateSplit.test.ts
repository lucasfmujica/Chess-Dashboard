import { describe, it, expect } from 'vitest';
import { candidateSplit } from './candidateSplit';
import type { TrainingAttempt } from '../types/training';

const attempt = (over: Partial<TrainingAttempt>): TrainingAttempt =>
  ({ id: 'a', itemKind: 'blunder', correct: false, createdAt: 0, ...over }) as TrainingAttempt;

describe('candidateSplit', () => {
  it('is all zeros with no attempts, not NaN', () => {
    expect(candidateSplit([])).toEqual({ asked: 0, missed: 0, rejected: 0, missedPct: 0 });
  });

  it('splits misses from rejections and rounds the percentage', () => {
    const split = candidateSplit([
      attempt({ candidateMiss: true }),
      attempt({ candidateMiss: true }),
      attempt({ candidateMiss: false }),
    ]);
    expect(split).toEqual({ asked: 3, missed: 2, rejected: 1, missedPct: 67 });
  });

  it('ignores correct answers even when candidateMiss is set', () => {
    // Nothing writes this today, but the column is only meaningful on a
    // failure — counting it would inflate the denominator.
    const split = candidateSplit([
      attempt({ correct: true, candidateMiss: true }),
      attempt({ candidateMiss: true }),
    ]);
    expect(split).toEqual({ asked: 1, missed: 1, rejected: 0, missedPct: 100 });
  });

  it('excludes failures where the question was never asked', () => {
    // Endgame and repertoire misses skip the question, so they carry
    // undefined and must not dilute the split.
    const split = candidateSplit([
      attempt({ itemKind: 'endgame', candidateMiss: undefined }),
      attempt({ itemKind: 'repertoire', candidateMiss: undefined }),
      attempt({ candidateMiss: false }),
    ]);
    expect(split).toEqual({ asked: 1, missed: 0, rejected: 1, missedPct: 0 });
  });
});
