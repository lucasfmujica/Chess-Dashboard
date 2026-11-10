import { describe, it, expect } from 'vitest';
import { candidateSplit, momentCandidateSplit, isWeakSignal } from './candidateSplit';
import type { TrainingAttempt } from '../types/training';
import type { AnnotatedGame, KeyMoment } from '../types/chess';

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

const moment = (candidateFate?: KeyMoment['candidateFate']): KeyMoment => ({
  move: '',
  symbol: '',
  comment: '',
  candidateFate,
});
const annotation = (...moments: KeyMoment[]): AnnotatedGame =>
  ({ id: 'x', createdAt: 0, keyMoments: moments }) as AnnotatedGame;

describe('momentCandidateSplit', () => {
  it('is all zeros with nothing annotated, not NaN', () => {
    expect(momentCandidateSplit([])).toEqual({ asked: 0, missed: 0, rejected: 0, missedPct: 0 });
    expect(momentCandidateSplit([{ id: 'x', createdAt: 0 } as AnnotatedGame]).asked).toBe(0);
  });

  it('counts only moments where the question was answered', () => {
    const split = momentCandidateSplit([
      annotation(moment('missed'), moment('rejected'), moment(undefined)),
      annotation(moment('missed')),
    ]);
    expect(split).toEqual({ asked: 3, missed: 2, rejected: 1, missedPct: 67 });
  });
});

describe('isWeakSignal', () => {
  it('flags fewer than 15 answers', () => {
    expect(isWeakSignal(14)).toBe(true);
    expect(isWeakSignal(15)).toBe(false);
  });
});

describe('intentos external (conversión y guías)', () => {
  it('no mueven candidateSplit: no traen candidateMiss', () => {
    const base = candidateSplit([attempt({ candidateMiss: true }), attempt({ candidateMiss: false })]);
    const withExternal = candidateSplit([
      attempt({ candidateMiss: true }),
      attempt({ candidateMiss: false }),
      attempt({ itemKind: 'external', correct: false }),
      attempt({ itemKind: 'external', correct: true }),
    ]);
    expect(withExternal).toEqual(base);
  });
});
