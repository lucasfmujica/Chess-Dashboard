import { useMemo } from 'react';
import { Chess } from 'chess.js';
import { sanitizePgn } from './useGameReplay';
import { useGames } from '../context/GamesContext';
import type { Game, PlayerColor } from '../types/chess';

export interface PersonalMove {
  san: string;
  count: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  /** Whether this move was made by you (vs. your opponent) from this position. */
  mine: boolean;
}

/** Position key ignoring move counters so transpositions collapse. */
const fenKey = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

interface Bucket {
  count: number;
  wins: number;
  draws: number;
  losses: number;
  mine: boolean;
}

type ColorIndex = Record<PlayerColor, Map<string, Map<string, Bucket>>>;

/**
 * Indexes the moves played from each position across a set of games that carry
 * moves, kept SEPARATE by the colour the tracked player had in each game.
 * Within one colour a position is unambiguous: on the player's turn the moves
 * are theirs, on the opponent's turn they're the replies faced — never a mix
 * of white and black games (which would otherwise count the opponent's moves
 * as if they were the player's).
 */
export const buildPersonalMoveIndex = (games: Game[]): ColorIndex => {
  const maps: ColorIndex = { W: new Map(), B: new Map() };
  games.forEach(g => {
    if (!g.pgn) return;
    const chess = new Chess();
    try {
      chess.loadPgn(sanitizePgn(g.pgn));
    } catch {
      return;
    }
    const map = maps[g.color];
    chess.history({ verbose: true }).forEach(m => {
      const moverIsPlayer = (m.color === 'w' && g.color === 'W') || (m.color === 'b' && g.color === 'B');
      const key = fenKey(m.before);
      let byMove = map.get(key);
      if (!byMove) {
        byMove = new Map();
        map.set(key, byMove);
      }
      const bucket = byMove.get(m.san) ?? { count: 0, wins: 0, draws: 0, losses: 0, mine: moverIsPlayer };
      bucket.count++;
      if (g.result === 'W') bucket.wins++;
      else if (g.result === 'D') bucket.draws++;
      else bucket.losses++;
      byMove.set(m.san, bucket);
    });
  });
  return maps;
};

/** Moves played from `fen` in one colour's games, sorted by frequency. */
export const personalMovesAt = (index: ColorIndex, fen: string, color: PlayerColor): PersonalMove[] => {
  const byMove = index[color].get(fenKey(fen));
  if (!byMove) return [];
  return Array.from(byMove.entries())
    .map(([san, b]) => ({
      san,
      count: b.count,
      wins: b.wins,
      draws: b.draws,
      losses: b.losses,
      winRate: b.count > 0 ? Math.round(((b.wins + b.draws * 0.5) / b.count) * 100) : 0,
      mine: b.mine,
    }))
    .sort((a, b) => b.count - a.count);
};

/**
 * `color` selects which set ('W' = your games as White, 'B' = as Black). The
 * win/draw/loss split is always from your perspective.
 */
export const useMyRepertoireMoves = (fen: string, color: PlayerColor): PersonalMove[] => {
  const { games } = useGames();
  const index = useMemo(() => buildPersonalMoveIndex(games), [games]);
  return useMemo(() => personalMovesAt(index, fen, color), [index, fen, color]);
};

/** Same tree logic as `useMyRepertoireMoves`, but over an arbitrary games array (e.g. a scouted rival's Lichess games). */
export const useRivalMoves = (games: Game[], fen: string, color: PlayerColor): PersonalMove[] => {
  const index = useMemo(() => buildPersonalMoveIndex(games), [games]);
  return useMemo(() => personalMovesAt(index, fen, color), [index, fen, color]);
};
