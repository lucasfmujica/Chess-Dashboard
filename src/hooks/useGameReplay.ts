import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export type MoveInput = string | { from: string; to: string; promotion?: string };

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
  /** Whether the line has at least one legal move. */
  isValid: boolean;
  error: string | null;
  goTo: (ply: number) => void;
  next: () => void;
  prev: () => void;
  first: () => void;
  last: () => void;
  /** Play a move from the current position, extending/branching the line. */
  playMove: (move: MoveInput) => boolean;
  /** Restore the originally-loaded game. */
  reset: () => void;
  /** True when the current line diverges from the loaded game. */
  isVariation: boolean;
  /** First ply index where the line diverges from the loaded game. */
  variationStart: number;
}

interface ReplayState {
  fens: string[];
  sans: string[];
  ply: number;
  error: string | null;
}

export interface ParsedReplay {
  fens: string[];
  sans: string[];
  error: string | null;
}

/**
 * Strip PGN constructs chess.js cannot parse in the movetext: comments
 * ({...} and ;...), recursive variations (...) and NAGs ($n), and normalise
 * common OTB-PGN quirks (zeros for castling, move-suffix annotations).
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
  // Castling written with zeros (0-0-0 / 0-0) -> letters (O-O-O / O-O); long
  // castle first so it isn't half-matched. Handles both ASCII '-' and en/em
  // dashes that some exporters use.
  s = s.replace(/0[-–—]0[-–—]0/g, 'O-O-O').replace(/0[-–—]0/g, 'O-O');
  // Drop move-suffix annotations (!, ?, !!, ?!, …) attached to moves.
  s = s.replace(/[!?]/g, '');
  // Normalise spaced game-termination markers (e.g. Lichess study exports write
  // "1/2 - 1/2"); chess.js only accepts the canonical "1/2-1/2" / "1-0" / "0-1".
  s = s
    .replace(/1\s*\/\s*2\s*[-–—]\s*1\s*\/\s*2/g, '1/2-1/2')
    .replace(/(^|\s)1\s*[-–—]\s*0(\s|$)/g, (_m, a, b) => `${a}1-0${b}`)
    .replace(/(^|\s)0\s*[-–—]\s*1(\s|$)/g, (_m, a, b) => `${a}0-1${b}`);
  return s.replace(/[ \t]+/g, ' ');
};

/** Parse a PGN into per-ply FENs/SANs (index 0 = start position). Exported for reuse outside the hook (e.g. blunder mining). */
export const parsePgn = (pgn?: string): ParsedReplay => {
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
 * Parse a PGN/movetext string and expose step-through replay state plus the
 * ability to branch off into your own line (navigable analysis tree).
 */
export const useGameReplay = (pgn?: string): GameReplay => {
  const parsed = useMemo(() => parsePgn(pgn), [pgn]);
  const originalRef = useRef(parsed);
  const [state, setState] = useState<ReplayState>(() => ({ ...parsed, ply: 0 }));

  // Reset to the loaded game whenever it changes.
  useEffect(() => {
    originalRef.current = parsed;
    setState({ ...parsed, ply: 0 });
  }, [parsed]);

  const { fens, sans, ply, error } = state;
  const totalPlies = sans.length;

  const setPly = useCallback(
    (fn: (p: number, len: number) => number) =>
      setState(s => ({ ...s, ply: Math.max(0, Math.min(s.sans.length, fn(s.ply, s.sans.length))) })),
    []
  );

  const goTo = useCallback((p: number) => setPly(() => p), [setPly]);
  const next = useCallback(() => setPly(p => p + 1), [setPly]);
  const prev = useCallback(() => setPly(p => p - 1), [setPly]);
  const first = useCallback(() => setPly(() => 0), [setPly]);
  const last = useCallback(() => setPly((_p, len) => len), [setPly]);

  const playMove = useCallback((move: MoveInput): boolean => {
    let ok = false;
    setState(s => {
      const chess = new Chess(s.fens[s.ply]);
      let res = null;
      try {
        res = chess.move(move);
      } catch {
        res = null;
      }
      if (!res) return s;
      ok = true;
      // Following the existing next move: just advance.
      if (s.sans[s.ply] === res.san) return { ...s, ply: s.ply + 1 };
      // Otherwise branch: truncate at the current ply and append the new move.
      return {
        fens: [...s.fens.slice(0, s.ply + 1), chess.fen()],
        sans: [...s.sans.slice(0, s.ply), res.san],
        ply: s.ply + 1,
        error: null,
      };
    });
    return ok;
  }, []);

  const reset = useCallback(() => setState({ ...originalRef.current, ply: 0 }), []);

  // Where the current line first diverges from the loaded game.
  const original = originalRef.current.sans;
  let variationStart = 0;
  while (
    variationStart < sans.length &&
    variationStart < original.length &&
    sans[variationStart] === original[variationStart]
  ) {
    variationStart++;
  }
  const isVariation = !(sans.length === original.length && variationStart === sans.length);

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
    playMove,
    reset,
    isVariation,
    variationStart,
  };
};
