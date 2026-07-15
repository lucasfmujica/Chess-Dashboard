import { Chess } from 'chess.js';
import { parsePgn } from '../hooks/useGameReplay';
import type { Game } from '../types/chess';

export type EndgameType = 'pawn' | 'rook' | 'minor' | 'queen' | 'mixed';

export interface MinedEndgame {
  gameId: string;
  ply: number;
  fen: string;
  /** Point-value material difference at the snapshot, positive = player ahead. */
  materialDelta: number;
  endgameType: EndgameType;
}

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

type Board = ReturnType<Chess['board']>;

/** Sum of non-pawn, non-king material for one side. */
const nonPawnValue = (board: Board, color: 'w' | 'b'): number =>
  board.flat().reduce((sum, piece) => {
    if (!piece || piece.color !== color || piece.type === 'p' || piece.type === 'k') return sum;
    return sum + (PIECE_VALUES[piece.type] ?? 0);
  }, 0);

/** Total material (incl. pawns) for one side, for framing the delta. */
const totalValue = (board: Board, color: 'w' | 'b'): number =>
  board.flat().reduce((sum, piece) => {
    if (!piece || piece.color !== color || piece.type === 'k') return sum;
    return sum + (PIECE_VALUES[piece.type] ?? 0);
  }, 0);

const ENDGAME_MATERIAL_THRESHOLD = 13; // Q alone (9) or Q+minor (12) qualifies; Q+R (14) doesn't.

/** Both sides must be down to endgame-level non-pawn material. */
const isEndgameBoard = (board: Board): boolean =>
  nonPawnValue(board, 'w') <= ENDGAME_MATERIAL_THRESHOLD && nonPawnValue(board, 'b') <= ENDGAME_MATERIAL_THRESHOLD;

const classifyEndgameType = (board: Board): EndgameType => {
  let hasQueen = false, hasRook = false, hasMinor = false;
  for (const piece of board.flat()) {
    if (!piece) continue;
    if (piece.type === 'q') hasQueen = true;
    else if (piece.type === 'r') hasRook = true;
    else if (piece.type === 'n' || piece.type === 'b') hasMinor = true;
  }
  if (hasQueen) return 'queen';
  if (hasRook && hasMinor) return 'mixed';
  if (hasRook) return 'rook';
  if (hasMinor) return 'minor';
  return 'pawn';
};

/**
 * Find the first position in a game where both sides have dropped to
 * endgame-level material, and snapshot it as one drillable position. Needs no
 * Stockfish analysis — pure material heuristic over the game's own moves.
 */
export const mineEndgameFromGame = (game: Game): MinedEndgame | null => {
  if (!game.id || !game.pgn) return null;
  const { fens } = parsePgn(game.pgn);
  const playerColor: 'w' | 'b' = game.color === 'W' ? 'w' : 'b';

  for (let i = 1; i < fens.length; i++) {
    const board = new Chess(fens[i]).board();
    if (!isEndgameBoard(board)) continue;
    const materialDelta = totalValue(board, playerColor) - totalValue(board, playerColor === 'w' ? 'b' : 'w');
    return {
      gameId: game.id,
      ply: i,
      fen: fens[i],
      materialDelta,
      endgameType: classifyEndgameType(board),
    };
  }
  return null;
};

export const mineAllEndgames = (games: Game[]): MinedEndgame[] =>
  games.map(mineEndgameFromGame).filter((e): e is MinedEndgame => e !== null);

/** UCI-free formatted material framing, e.g. "+1 pawn" / "-3 (down a minor)" / "Even material". */
export const formatMaterialDelta = (delta: number): string => {
  if (delta === 0) return 'Even material';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta}`;
};
