import { describe, it, expect } from 'vitest';
import { dailyQueueAttempts } from './trainingAttempts';
import type { TrainingAttempt } from '../types/training';

const attempt = (over: Partial<TrainingAttempt>): TrainingAttempt =>
  ({ id: 'a', itemKind: 'blunder', correct: true, createdAt: 0, ...over }) as TrainingAttempt;

describe('dailyQueueAttempts', () => {
  it('descarta los external y conserva el resto', () => {
    const kept = [attempt({ itemKind: 'blunder' }), attempt({ itemKind: 'concept' }), attempt({ itemKind: 'repertoire-move' })];
    expect(dailyQueueAttempts([...kept, attempt({ itemKind: 'external' })])).toEqual(kept);
  });
});
