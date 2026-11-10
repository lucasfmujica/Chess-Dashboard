import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { TrainingAttempt } from '../types/training';

const attempts = vi.fn();
vi.mock('../api/client', () => ({
  fetchTrainingAttempts: (...a: unknown[]) => attempts(...a),
  fetchTrainingSessions: vi.fn().mockResolvedValue([]),
  fetchAnnotations: vi.fn().mockResolvedValue([]),
}));

import { useTrainingPulse } from './useTrainingPulse';

const a = (over: Partial<TrainingAttempt>): TrainingAttempt =>
  ({ id: 'x', itemKind: 'blunder', correct: false, createdAt: 0, ...over }) as TrainingAttempt;

describe('useTrainingPulse', () => {
  it('un intento external no suma en attemptsThisWeek ni en el split', async () => {
    const daily = [a({ candidateMiss: true }), a({ correct: true })];
    attempts.mockResolvedValue([
      ...daily,
      a({ itemKind: 'external', correct: true }),
      a({ itemKind: 'external', correct: false, candidateMiss: true }),
    ]);
    const { result } = renderHook(() => useTrainingPulse());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.attemptsThisWeek).toBe(2);
    expect(result.current.split).toEqual({ asked: 1, missed: 1, rejected: 0, missedPct: 100 });
  });
});
