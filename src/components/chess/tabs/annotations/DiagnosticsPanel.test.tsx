import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DiagnosticsPanel from './DiagnosticsPanel';
import type { BoardPosition } from '../../GameViewer';
import type { PositionDiagnostic } from '../../../../types/diagnostics';

// El panel se renderiza dentro de GameViewer, así que en la app real hace falta
// llegar hasta una partida vinculada para verlo. Acá se monta solo, que es la
// única forma práctica de comprobar lo que dibuja y lo que le manda al tablero.
const fetchDiagnostics = vi.fn();
const fetchStatus = vi.fn();
vi.mock('../../../../api/client', () => ({
  fetchPositionDiagnostics: (...a: unknown[]) => fetchDiagnostics(...a),
  fetchDiagnosticsStatus: (...a: unknown[]) => fetchStatus(...a),
  requestPositionDiagnostics: vi.fn(),
  cancelPositionDiagnostics: vi.fn(),
  askDiagnosticChat: vi.fn(),
}));

const GAME = 'c79e03a5-ed05-4299-9900-b11a1a5348af';
const FEN = 'r1bq1rk1/1pp1ppbp/1n1p1np1/8/P2P4/2NQ1NP1/PBP1PPBP/R4RK1 b - - 4 10';

const diagnostic = (over: Partial<PositionDiagnostic> = {}): PositionDiagnostic => ({
  id: 'd1',
  gameId: GAME,
  ply: 20,
  moveNumber: 10,
  fen: FEN,
  movePlayed: 'Nxa4',
  cpLoss: 92,
  sfTop3: [
    { rank: 1, moveSan: 'Bf5', moveUci: 'c8f5', evalCp: 137, line: '10...Bf5 11. Qd1', maiaPolicy: 0.168 },
  ],
  maiaTopMove: 'Nxa4',
  maiaPolicyPlayed: 0.303,
  maiaPolicySfTop: 0.168,
  category: 'brecha_conceptual',
  createdAt: 0,
  game: { opponent: 'Gustavo Aguila', color: 'B', result: 'L', playedDate: '2026-02-17' },
  ...over,
});

/** El ply del replay donde se tomó la decisión: uno antes del ply diagnosticado. */
const positionAt = (ply: number): BoardPosition => ({
  fen: FEN,
  ply,
  goTo: vi.fn(),
  isVariation: false,
});

beforeEach(() => {
  vi.clearAllMocks();
  fetchStatus.mockResolvedValue({
    requested: [],
    analyzed: [{ gameId: GAME, analyzedAt: 0, depth: 20, positions: 32, findings: 3 }],
  });
});

describe('DiagnosticsPanel', () => {
  it('shows the finding only at the position the decision was made in', async () => {
    fetchDiagnostics.mockResolvedValue([diagnostic()]);
    const { rerender } = render(<DiagnosticsPanel position={positionAt(19)} gameId={GAME} />);
    await waitFor(() => expect(screen.getByText('Brecha conceptual')).toBeInTheDocument());

    // Un ply más adelante el tablero ya pasó la decisión: no hay detalle.
    rerender(<DiagnosticsPanel position={positionAt(20)} gameId={GAME} />);
    await waitFor(() => expect(screen.queryByText('Brecha conceptual')).not.toBeInTheDocument());
  });

  it('puts the prose above the numbers and folds the engine lines away', async () => {
    fetchDiagnostics.mockResolvedValue([
      diagnostic({ explanation: 'No perdiste material: perdiste la posición.' }),
    ]);
    render(<DiagnosticsPanel position={positionAt(19)} gameId={GAME} />);
    await waitFor(() =>
      expect(screen.getByText('No perdiste material: perdiste la posición.')).toBeInTheDocument()
    );
    // La línea de Stockfish existe pero arranca plegada.
    expect(screen.queryByText(/10\.\.\.Bf5 11\. Qd1/)).not.toBeInTheDocument();
  });

  it('reads the ladder as where the error stops being played', async () => {
    const rungs = [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900].map(rating => ({
      rating,
      played: 0.3,
      sfTop: 0.1,
      topMove: rating <= 1500 ? 'Nxa4' : 'Bf5',
      playedIsTop: rating <= 1500,
    }));
    fetchDiagnostics.mockResolvedValue([diagnostic({ maiaLadder: rungs })]);
    render(<DiagnosticsPanel position={positionAt(19)} gameId={GAME} />);
    await waitFor(() =>
      expect(screen.getByText(/Deja de jugarse a partir de 1600/)).toBeInTheDocument()
    );
    // Los extremos van con el rating entero: recortarlos a dos dígitos los hacía
    // leer como "11 a 19", que fue exactamente lo que se veía en producción.
    expect(screen.getByText('1100')).toBeInTheDocument();
    expect(screen.getByText('1900')).toBeInTheDocument();
  });

  it('hands the board the engine move and the culprit squares, and clears them on the way out', async () => {
    fetchDiagnostics.mockResolvedValue([
      diagnostic({
        culprits: [
          { piece: 'B', square: 'b2', blameCp: 47 },
          { piece: 'Q', square: 'd3', blameCp: 42 },
        ],
      }),
    ]);
    const onMarks = vi.fn();
    const { rerender } = render(
      <DiagnosticsPanel position={positionAt(19)} gameId={GAME} onMarks={onMarks} />
    );
    await waitFor(() => expect(onMarks).toHaveBeenCalledWith(expect.objectContaining({ arrows: expect.any(Array) })));

    const calls = onMarks.mock.calls;
    const marks = calls[calls.length - 1][0];
    expect(marks.arrows).toEqual([{ from: 'c8', to: 'f5', color: expect.any(String) }]);
    expect(marks.squares.map((s: { square: string }) => s.square)).toEqual(['b2', 'd3']);

    // Salir de la posición tiene que limpiar el tablero, no dejar marcas viejas.
    onMarks.mockClear();
    rerender(<DiagnosticsPanel position={positionAt(21)} gameId={GAME} onMarks={onMarks} />);
    await waitFor(() => expect(onMarks).toHaveBeenLastCalledWith({}));
  });

  it('does not loop: settles after navigating to a finding', async () => {
    fetchDiagnostics.mockResolvedValue([diagnostic()]);
    const onMarks = vi.fn();
    render(<DiagnosticsPanel position={positionAt(19)} gameId={GAME} onMarks={onMarks} />);
    await waitFor(() => expect(screen.getByText('Brecha conceptual')).toBeInTheDocument());
    // Un efecto que llama a un setter del padre es la forma de un loop infinito.
    // Debe emitir una vez al montar y una al encontrar el hallazgo, y parar ahí.
    await new Promise(r => setTimeout(r, 50));
    expect(onMarks.mock.calls.length).toBeLessThanOrEqual(3);
  });

  it('says the analysis runs elsewhere instead of pretending the button does it', async () => {
    fetchDiagnostics.mockResolvedValue([]);
    fetchStatus.mockResolvedValue({ requested: [], analyzed: [] });
    render(<DiagnosticsPanel position={positionAt(19)} gameId={GAME} />);
    await waitFor(() => expect(screen.getByText('Pedir análisis')).toBeInTheDocument());
    expect(screen.getByText(/corre en tu máquina, no acá/)).toBeInTheDocument();
  });
});
