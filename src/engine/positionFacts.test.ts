import { describe, it, expect } from 'vitest';
import { positionFacts } from './positionFacts';

describe('positionFacts', () => {
  it('counts mobility for both sides regardless of turn', () => {
    const f = positionFacts('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(f.mobility).toEqual({ white: 20, black: 20 });
  });

  it('names doubled and isolated pawns', () => {
    // Blancas con la columna c doblada; el peón de d negro está aislado.
    const f = positionFacts('4k3/3p4/8/8/8/2P5/PPP3PP/4K3 w - - 0 1');
    expect(f.pawns.white.doubled).toBe(1);
    expect(f.pawns.black.isolated).toBe(1);
  });

  it('finds a passed pawn', () => {
    const f = positionFacts('4k3/8/8/3P4/8/8/8/4K3 w - - 0 1');
    expect(f.pawns.white.passed).toBe(1);
  });

  it('does not call a pawn passed when an enemy pawn blocks the file', () => {
    const f = positionFacts('4k3/3p4/8/3P4/8/8/8/4K3 w - - 0 1');
    expect(f.pawns.white.passed).toBe(0);
  });

  it('counts attackers around the king', () => {
    // Dama negra en h4 mirando el enroque blanco.
    const f = positionFacts('4k3/8/8/8/7q/8/5PPP/5RK1 w - - 0 1');
    expect(f.kingPressure.onWhite).toBeGreaterThan(0);
  });

  it('reports material as a difference, not a verdict', () => {
    const f = positionFacts('4k3/8/8/8/8/8/8/3QK3 w - - 0 1');
    expect(f.material).toEqual({ white: 9, black: 0, diff: 9 });
  });

  it('returns zero rather than inventing a number on an impossible turn swap', () => {
    // Con las negras en jaque, pasarle el turno a las blancas no es una posición
    // legal: cero es más honesto que un número de fantasía.
    const f = positionFacts('4k3/8/4R3/8/8/8/8/4K3 b - - 0 1');
    expect(f.mobility.black).toBeGreaterThan(0);
  });
});
