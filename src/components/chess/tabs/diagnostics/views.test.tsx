import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TrapsView from './TrapsView';
import PatternsView from './PatternsView';
import FindingActions from './FindingActions';
import type { PositionDiagnostic, PositionTrap } from '../../../../types/diagnostics';

const fetchTraps = vi.fn();
const fetchPatterns = vi.fn();
const fetchAll = vi.fn();
const postDrills = vi.fn();
vi.mock('../../../../api/client', () => ({
  fetchPositionTraps: (...a: unknown[]) => fetchTraps(...a),
  fetchDiagnosticPatterns: (...a: unknown[]) => fetchPatterns(...a),
  fetchAllPositionDiagnostics: (...a: unknown[]) => fetchAll(...a),
  postBlunderDrills: (...a: unknown[]) => postDrills(...a),
  fetchConcepts: vi.fn().mockResolvedValue([]),
  postConcept: vi.fn(),
}));
// ConceptQuickAdd arrastra medio módulo de conceptos; acá solo importa que el
// botón de "hacer drill" conviva con él.
vi.mock('../../ConceptQuickAdd', () => ({ default: () => <button>Crear concepto</button> }));

const FEN = 'r1bq1rk1/1pp1ppbp/1n1p1np1/8/P2P4/2NQ1NP1/PBP1PPBP/R4RK1 b - - 4 10';

const trap = (over: Partial<PositionTrap> = {}): PositionTrap => ({
  id: 't1',
  gameId: 'g1',
  ply: 45,
  moveNumber: 23,
  fen: FEN,
  maiaMove: 'Nxa4',
  maiaPolicy: 0.46,
  bestMove: 'Bf5',
  trapCp: 1020,
  opponentMove: 'Bf5',
  fellForIt: false,
  game: { opponent: 'Gustavo Aguila', color: 'B' },
  ...over,
});

const finding = (): PositionDiagnostic => ({
  id: 'd1',
  gameId: 'g1',
  ply: 20,
  moveNumber: 10,
  fen: FEN,
  movePlayed: 'Nxa4',
  cpLoss: 92,
  sfTop3: [{ rank: 1, moveSan: 'Bf5', moveUci: 'c8f5', evalCp: 137, maiaPolicy: 0.168 }],
  maiaTopMove: 'Nxa4',
  category: 'brecha_conceptual',
  createdAt: 0,
  game: { opponent: 'Gustavo Aguila', color: 'B', result: 'L' },
});

beforeEach(() => vi.clearAllMocks());

describe('TrapsView', () => {
  it('says what the band plays and what was right, and whether they fell', async () => {
    fetchTraps.mockResolvedValue([trap(), trap({ id: 't2', fellForIt: true, trapCp: 300 })]);
    render(<TrapsView />);
    await waitFor(() => expect(screen.getByText('La esquivó')).toBeInTheDocument());
    expect(screen.getByText(/Solo las que cayeron/)).toHaveTextContent('1');
  });

  it('points at the command instead of showing an empty page', async () => {
    fetchTraps.mockResolvedValue([]);
    render(<TrapsView />);
    await waitFor(() => expect(screen.getByText(/--traps --source otb/)).toBeInTheDocument());
  });
});

describe('PatternsView', () => {
  it('says a theme lost its findings rather than showing a count that lies', async () => {
    fetchPatterns.mockResolvedValue([
      {
        id: 'p1',
        name: 'Cambios sin mirar la estructura',
        summary: 'Cambiás piezas menores sin mirar qué queda.',
        findingIds: ['borrado-por-reclasificacion'],
        createdAt: 0,
      },
    ]);
    fetchAll.mockResolvedValue([]);
    render(<PatternsView />);
    await waitFor(() =>
      expect(screen.getByText('Cambios sin mirar la estructura')).toBeInTheDocument()
    );
    screen.getByRole('button', { expanded: false }).click();
    await waitFor(() =>
      expect(screen.getByText(/ya no están en el corpus/)).toBeInTheDocument()
    );
  });
});

describe('FindingActions', () => {
  it('carries the Maia policy so the drill lands on the right side of the filter', async () => {
    postDrills.mockResolvedValue({ inserted: 1 });
    render(<FindingActions finding={finding()} />);
    screen.getByRole('button', { name: 'Hacer drill' }).click();
    await waitFor(() => expect(postDrills).toHaveBeenCalled());
    const [[drills]] = postDrills.mock.calls;
    expect(drills[0]).toMatchObject({
      fenBefore: FEN,
      playedSan: 'Nxa4',
      bestMoveUci: 'c8f5',
      cpLoss: 92,
      maiaPolicy: 0.168,
      // El eval después no se guarda aparte: es el del motor menos lo que costó.
      evalAfter: 137 - 92,
    });
    await waitFor(() => expect(screen.getByText('Drill creado')).toBeInTheDocument());
  });

  it('says so when the drill could not be created', async () => {
    postDrills.mockRejectedValue(new Error('boom'));
    render(<FindingActions finding={finding()} />);
    screen.getByRole('button', { name: 'Hacer drill' }).click();
    await waitFor(() => expect(screen.getByText(/No se pudo crear/)).toBeInTheDocument());
  });
});
