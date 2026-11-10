import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PROGRESS_KEY } from '../../../../utils/conversionProgress';

const fetchAttempts = vi.fn();
vi.mock('../../../../api/client', () => ({
  fetchTrainingAttempts: (...a: unknown[]) => fetchAttempts(...a),
  postTrainingAttempts: vi.fn(),
}));

import ConversionTodayCard from './ConversionTodayCard';

beforeEach(() => {
  window.localStorage.clear();
  fetchAttempts.mockReset();
});

describe('ConversionTodayCard', () => {
  it('sin estado local muestra el total como no vistas y no pide nada al servidor', () => {
    render(<ConversionTodayCard onOpen={() => undefined} />);
    expect(screen.getByRole('button')).toHaveTextContent('Conversión y drills: 154 para hoy');
    expect(fetchAttempts).not.toHaveBeenCalled();
  });

  it('con estado local descuenta las vistas que todavía no vencen', () => {
    window.localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({ 'conv-001': { confidence: 5, lastReviewed: Date.now() - 1000, reviewCount: 1, solvedCount: 1 } })
    );
    render(<ConversionTodayCard onOpen={() => undefined} />);
    expect(screen.getByRole('button')).toHaveTextContent('Conversión y drills: 153 para hoy');
    expect(fetchAttempts).not.toHaveBeenCalled();
  });
});
