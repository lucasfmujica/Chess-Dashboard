import { useCallback, useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export interface GameReplay {
  /** FEN per position; index 0 is the start, index i is after ply i. */
  fens: string[];
  /** SAN of each ply. */
  sans: string[];
  /** Current ply (0 = start, sans.length = final position). */
  ply: number;
  /** FEN of the current ply. */
  fen: string;
  /** Total number of plies (half-moves). */
  totalPlies: number;
  /** Whether the PGN parsed into at least one legal move. */
  isValid: boolean;
  error: string | null;
  goTo: (ply: number) => void;
  next: () => void;
  prev: () => void;
  first: () => void;
  last: () => void;
}

interface ParsedReplay {
  fens: string[];
  sans: string[];
  error: string | null;
}

/**
 * Strip PGN constructs chess.js cannot parse in the movetext: comments
 * ({...} and ;...), recursive variations (...) and NAGs ($n).
 */
export const sanitizePgn = (pgn: string): string => {
  let s = pgn
    .replace(/\{[^}]*\}/g, ' ') // brace comments (e.g. clock/eval annotations)
    .replace(/;[^\n]*/g, ' ') // rest-of-line comments
    .replace(/\$\d+/g, ' '); // numeric annotation glyphs
  // Remove parenthesised variations, innermost first to handle nesting.
  let prev: string;
  do {
    prev = s;
    s = s.replace(/\([^()]*\)/g, ' ');
  } while (s !== prev);
  return s.replace(/[ \t]+/g, ' ');
};

const parsePgn = (pgn?: string): ParsedReplay => {
  if (!pgn || !pgn.trim()) {
    return { fens: [STARTING_FEN], sans: [], error: null };
  }
  try {
    const chess = new Chess();
    chess.loadPgn(sanitizePgn(pgn));
    const history = chess.history({ verbose: true });
    if (history.length === 0) {
      return { fens: [STARTING_FEN], sans: [], error: 'No moves found in PGN.' };
    }
    const fens = [history[0].before, ...history.map(m => m.after)];
    const sans = history.map(m => m.san);
    return { fens, sans, error: null };
  } catch (e) {
    return { fens: [STARTING_FEN], sans: [], error: (e as Error).message || 'Invalid PGN.' };
  }
};

/**
 * Parse a PGN/movetext string and expose step-through replay state.
 */
export const useGameReplay = (pgn?: string): GameReplay => {
  const { fens, sans, error } = useMemo(() => parsePgn(pgn), [pgn]);
  const totalPlies = sans.length;
  const [ply, setPly] = useState(0);

  // Reset to the start whenever the game changes.
  useEffect(() => {
    setPly(0);
  }, [pgn]);

  const clamp = useCallback((p: number) => Math.max(0, Math.min(totalPlies, p)), [totalPlies]);

  const goTo = useCallback((p: number) => setPly(clamp(p)), [clamp]);
  const next = useCallback(() => setPly(p => clamp(p + 1)), [clamp]);
  const prev = useCallback(() => setPly(p => clamp(p - 1)), [clamp]);
  const first = useCallback(() => setPly(0), []);
  const last = useCallback(() => setPly(totalPlies), [totalPlies]);

  return {
    fens,
    sans,
    ply,
    fen: fens[ply] ?? fens[fens.length - 1] ?? STARTING_FEN,
    totalPlies,
    isValid: totalPlies > 0,
    error,
    goTo,
    next,
    prev,
    first,
    last,
  };
};
