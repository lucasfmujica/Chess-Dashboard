import { Chess } from 'chess.js';
import { sanitizePgn } from '../hooks/useGameReplay';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * FEN per position for a PGN/movetext string: index 0 is the start, index i is
 * the position after ply i. Returns just the starting position when the PGN is
 * empty or unparseable. Mirrors the parsing used by the replay hook.
 */
export const fensFromPgn = (pgn?: string): string[] => {
  if (!pgn || !pgn.trim()) return [STARTING_FEN];
  try {
    const chess = new Chess();
    chess.loadPgn(sanitizePgn(pgn));
    const history = chess.history({ verbose: true });
    if (history.length === 0) return [STARTING_FEN];
    return [history[0].before, ...history.map(m => m.after)];
  } catch {
    return [STARTING_FEN];
  }
};
