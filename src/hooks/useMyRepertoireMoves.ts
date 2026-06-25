import { useMemo } from 'react';
import { Chess } from 'chess.js';
import { sanitizePgn } from './useGameReplay';
import { useGames } from '../context/GamesContext';
import type { PlayerColor } from '../types/chess';

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
 * Indexes the moves played from each position across your games that carry
 * moves, kept SEPARATE by the colour you had in each game. Within one colour a
 * position is unambiguous: on your turn the moves are yours, on the opponent's
 * turn they're the replies you faced — never a mix of your white and black games
 * (which would otherwise count opponents' moves as if they were yours).
 *
 * `color` selects which set ('W' = your games as White, 'B' = as Black). The
 * win/draw/loss split is always from your perspective.
 */
export const useMyRepertoireMoves = (fen: string, color: PlayerColor): PersonalMove[] => {
  const { games } = useGames();

  const index = useMemo<ColorIndex>(() => {
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
  }, [games]);

  return useMemo(() => {
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
  }, [index, fen, color]);
};
