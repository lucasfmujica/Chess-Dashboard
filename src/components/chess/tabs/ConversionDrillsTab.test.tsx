import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { FILTER_KEY } from '../../../utils/conversionProgress';

vi.mock('../../../api/client', () => ({
  fetchTrainingAttempts: vi.fn().mockResolvedValue([]),
  postTrainingAttempts: vi.fn().mockResolvedValue({ inserted: 1 }),
}));
// El tablero con motor no corre en jsdom; acá solo importa qué posición recibe.
vi.mock('../PuzzleBoard', () => ({
  default: ({ resetKey, onFirstResult }: { resetKey: string; onFirstResult: (c: boolean) => void }) => (
    <button data-testid="puzzle" data-id={resetKey} onClick={() => onFirstResult(true)}>
      puzzle
    </button>
  ),
}));
vi.mock('react-chessboard', () => ({ Chessboard: () => <div data-testid="static-board" /> }));

import ConversionDrillsTab, { originLabel } from './ConversionDrillsTab';
import { CONVERSION_ITEMS, GUIDE_ITEMS, CLASS_ITEMS } from '../../../constants/conversionQueue';

const renderTab = async () => {
  render(<ConversionDrillsTab />);
  await waitFor(() => expect(screen.getByTestId('conversion-counter')).toBeInTheDocument());
  await screen.findByTestId('puzzle');
};

const firstConversion = [...CONVERSION_ITEMS].sort((a, b) => (b.evalBefore ?? 0) - (a.evalBefore ?? 0) || a.id.localeCompare(b.id))[0];

beforeEach(() => window.localStorage.clear());

describe('ConversionDrillsTab', () => {
  it('muestra el filtro con los conteos de los datos y arranca en Todas', async () => {
    await renderTab();
    expect(screen.getByRole('tab', { name: 'Todas (154)' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Partidas (90)' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(screen.getByRole('tab', { name: 'Guías (35)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Clases (29)' })).toBeInTheDocument();
    expect(screen.getByTestId('conversion-counter')).toHaveTextContent('0 de 154 vistas · 154 para hoy');
    expect(screen.getByText('ejercicio 1 de 154')).toBeInTheDocument();
    expect(screen.getByTestId('puzzle')).toHaveAttribute('data-id', firstConversion.id);
  });

  it('el filtro cambia la lista y el contador, y se guarda', async () => {
    await renderTab();

    fireEvent.click(screen.getByRole('tab', { name: 'Guías (35)' }));
    await waitFor(() =>
      expect(screen.getByTestId('conversion-counter')).toHaveTextContent('0 de 35 vistas · 35 para hoy')
    );
    expect(screen.getByText('ejercicio 1 de 35')).toBeInTheDocument();
    expect(screen.getByTestId('puzzle')).toHaveAttribute('data-id', GUIDE_ITEMS[0].id);
    expect(JSON.parse(window.localStorage.getItem(FILTER_KEY) as string)).toBe('guide');

    fireEvent.click(screen.getByRole('tab', { name: 'Clases (29)' }));
    await waitFor(() =>
      expect(screen.getByTestId('conversion-counter')).toHaveTextContent('0 de 29 vistas · 29 para hoy')
    );
    expect(screen.getByTestId('puzzle')).toHaveAttribute('data-id', CLASS_ITEMS[0].id);
    expect(JSON.parse(window.localStorage.getItem(FILTER_KEY) as string)).toBe('class');

    fireEvent.click(screen.getByRole('tab', { name: 'Partidas (90)' }));
    await waitFor(() =>
      expect(screen.getByTestId('conversion-counter')).toHaveTextContent('0 de 90 vistas · 90 para hoy')
    );
    expect(screen.getByText('ejercicio 1 de 90')).toBeInTheDocument();
    expect(screen.getByTestId('puzzle')).toHaveAttribute('data-id', firstConversion.id);
  });

  it('recuerda el filtro elegido al volver a montar', async () => {
    window.localStorage.setItem(FILTER_KEY, JSON.stringify('guide'));
    render(<ConversionDrillsTab />);
    await waitFor(() =>
      expect(screen.getByTestId('conversion-counter')).toHaveTextContent('0 de 35 vistas · 35 para hoy')
    );
  });

  it('después de responder muestra plan y origen, y cuenta la vista', async () => {
    await renderTab();
    fireEvent.click(screen.getByTestId('puzzle'));
    await waitFor(() => expect(screen.getByText('Anotado como correcto')).toBeInTheDocument());
    expect(screen.getByText(new RegExp(`^Partida · \\d{2}/\\d{4}`))).toBeInTheDocument();
    expect(screen.getByTestId('conversion-counter')).toHaveTextContent('1 de 154 vistas · 153 para hoy');
  });
});

describe('originLabel', () => {
  const base = { fen: '', color: 'white' as const, acceptedUci: [] as string[], gameId: null };
  it('conversión: Partida · MM/AAAA', () => {
    expect(originLabel({ ...base, id: 'conv-001', kind: 'conversion', source: 'otb', date: '2026-03' })).toBe('Partida · 03/2026');
  });
  it('clases: Clase, con la fecha MM/AAAA si la trae', () => {
    expect(originLabel({ ...base, id: 'drill-036', kind: 'class', source: 'clase' })).toBe('Clase');
    expect(originLabel({ ...base, id: 'drill-037', kind: 'class', source: 'clase', date: '2026-10' })).toBe('Clase · 10/2026');
  });
  it('guías: Libro o Guía, con la fecha si la trae', () => {
    expect(originLabel({ ...base, id: 'drill-001', kind: 'guide', source: 'libro' })).toBe('Libro');
    expect(originLabel({ ...base, id: 'drill-002', kind: 'guide', source: 'guia', date: '2025-02' })).toBe('Guía · 02/2025');
  });
});
