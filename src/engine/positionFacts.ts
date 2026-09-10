import { Chess } from 'chess.js';

/**
 * Rasgos posicionales medibles, sin motor.
 *
 * Son los mismos que calcula la pasada de evidencia en Python
 * (diagnostics/evidence.py). Existen porque una evaluación dice CUÁNTO vale una
 * posición y no POR QUÉ: "movilidad 34 contra 40" o "dos peones doblados" son
 * hechos que se pueden nombrar, y nombrarlos es lo que separa una explicación de
 * un número.
 *
 * Deliberadamente NO interpretan. Dicen que hay un peón aislado, no si eso es
 * bueno. Interpretar es trabajo del modelo, sobre estos datos.
 */
export interface PositionFacts {
  mobility: { white: number; black: number };
  pawns: {
    white: { doubled: number; isolated: number; passed: number };
    black: { doubled: number; isolated: number; passed: number };
  };
  kingPressure: { onWhite: number; onBlack: number };
  material: { white: number; black: number; diff: number };
}

const VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const FILES = 'abcdefgh';

/** Jugadas legales de un bando, sea o no su turno. */
const mobilityOf = (fen: string, side: 'w' | 'b'): number => {
  const parts = fen.split(' ');
  if (parts[1] === side) return new Chess(fen).moves().length;
  // Cambiar el turno puede dejar un FEN ilegal (el otro rey en jaque); ahí no
  // hay número que dar y cero es más honesto que un número inventado.
  parts[1] = side;
  parts[3] = '-'; // al pasar el turno, un en-passant heredado deja de ser legal
  try {
    return new Chess(parts.join(' ')).moves().length;
  } catch {
    return 0;
  }
};

const pawnFacts = (board: Chess, side: 'w' | 'b') => {
  const mine: number[] = [];
  const theirs: number[] = [];
  const theirRanks: number[][] = Array.from({ length: 8 }, () => []);
  for (const row of board.board()) {
    for (const sq of row) {
      if (!sq || sq.type !== 'p') continue;
      const file = FILES.indexOf(sq.square[0]);
      const rank = Number(sq.square[1]);
      if (sq.color === side) mine.push(file);
      else {
        theirs.push(file);
        theirRanks[file].push(rank);
      }
    }
  }
  const count = (fs: number[], f: number) => fs.filter(x => x === f).length;
  let doubled = 0;
  let isolated = 0;
  let passed = 0;
  for (const file of new Set(mine)) {
    const n = count(mine, file);
    if (n > 1) doubled += n - 1;
    if (!mine.includes(file - 1) && !mine.includes(file + 1)) isolated += n;
  }
  // Pasado: sin peones rivales por delante en su columna ni en las adyacentes.
  for (const row of board.board()) {
    for (const sq of row) {
      if (!sq || sq.type !== 'p' || sq.color !== side) continue;
      const file = FILES.indexOf(sq.square[0]);
      const rank = Number(sq.square[1]);
      const ahead = (f: number) =>
        theirRanks[f]?.some(r => (side === 'w' ? r > rank : r < rank)) ?? false;
      if (!ahead(file) && !ahead(file - 1) && !ahead(file + 1)) passed += 1;
    }
  }
  return { doubled, isolated, passed };
};

/** Piezas rivales que atacan las casillas alrededor del rey. */
const kingPressure = (board: Chess, side: 'w' | 'b'): number => {
  let king: string | undefined;
  for (const row of board.board()) {
    for (const sq of row) if (sq?.type === 'k' && sq.color === side) king = sq.square;
  }
  if (!king) return 0;
  const f = FILES.indexOf(king[0]);
  const r = Number(king[1]);
  let attackers = 0;
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      const nf = f + df;
      const nr = r + dr;
      if (nf < 0 || nf > 7 || nr < 1 || nr > 8) continue;
      const square = `${FILES[nf]}${nr}` as Parameters<Chess['attackers']>[0];
      attackers += board.attackers(square, side === 'w' ? 'b' : 'w').length;
    }
  }
  return attackers;
};

export const positionFacts = (fen: string): PositionFacts => {
  const board = new Chess(fen);
  let white = 0;
  let black = 0;
  for (const row of board.board()) {
    for (const sq of row) {
      if (!sq) continue;
      if (sq.color === 'w') white += VALUES[sq.type];
      else black += VALUES[sq.type];
    }
  }
  return {
    mobility: { white: mobilityOf(fen, 'w'), black: mobilityOf(fen, 'b') },
    pawns: { white: pawnFacts(board, 'w'), black: pawnFacts(board, 'b') },
    kingPressure: { onWhite: kingPressure(board, 'w'), onBlack: kingPressure(board, 'b') },
    material: { white, black, diff: white - black },
  };
};
