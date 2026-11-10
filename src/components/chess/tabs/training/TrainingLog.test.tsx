import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { TrainingAttempt } from '../../../../types/training';

const attempts = vi.fn();
vi.mock('../../../../api/client', () => ({
  fetchTrainingSessions: vi.fn().mockResolvedValue([]),
  fetchTrainingAttempts: (...a: unknown[]) => attempts(...a),
  fetchAnnotations: vi.fn().mockResolvedValue([]),
}));
// recharts necesita medidas reales de layout; acá no se verifica el dibujo.
vi.mock('recharts', () => {
  const Stub = () => null;
  return {
    BarChart: Stub, Bar: Stub, XAxis: Stub, YAxis: Stub, Tooltip: Stub, CartesianGrid: Stub, Legend: Stub,
    ResponsiveContainer: Stub,
  };
});

import TrainingLog from './TrainingLog';

const a = (over: Partial<TrainingAttempt>): TrainingAttempt =>
  ({ id: Math.random().toString(), itemKind: 'blunder', correct: true, createdAt: Date.now(), ...over }) as TrainingAttempt;

describe('TrainingLog', () => {
  it('los intentos external no cambian los totales ni el cuaderno', async () => {
    attempts.mockResolvedValue([
      a({ correct: true }),
      a({ correct: false, candidatesWritten: 'Nf3' }),
      a({ itemKind: 'external', correct: true, candidatesWritten: 'de conversión' }),
      a({ itemKind: 'external', correct: true }),
      a({ itemKind: 'external', correct: false }),
    ]);
    render(<TrainingLog />);
    await waitFor(() => expect(screen.queryByText('Cargando…')).not.toBeInTheDocument());
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByText('Nf3')).toBeInTheDocument();
    expect(screen.queryByText('de conversión')).not.toBeInTheDocument();
    expect(screen.getByText(/1 posicion con candidatos escritos/)).toBeInTheDocument();
  });
});
