import { Chess } from 'chess.js';
import { sanitizePgn } from '../hooks/useGameReplay';

export interface FinalPosition {
  /** FEN after the last move of the game. */
  fen: string;
  /** Squares of the last move, for highlighting. */
  lastMove: { from: string; to: string };
}

/**
 * Final position of a game and its last move, from a PGN or bare movetext.
 * Uses the same sanitising as the replay hook (comments, variations, NAGs,
 * OTB quirks). Returns null when there is no PGN, it can't be read or it has
 * no moves, so callers can simply skip the board.
 */
export const finalPositionFromPgn = (pgn?: string | null): FinalPosition | null => {
  if (!pgn || !pgn.trim()) return null;
  try {
    const chess = new Chess();
    chess.loadPgn(sanitizePgn(pgn));
    const history = chess.history({ verbose: true });
    const last = history[history.length - 1];
    if (!last) return null;
    return { fen: last.after, lastMove: { from: last.from, to: last.to } };
  } catch {
    return null;
  }
};
