import { useMemo } from 'react';
import { Chess } from 'chess.js';
import { sanitizePgn } from './useGameReplay';
import { useGames } from '../context/GamesContext';

export interface PersonalMove {
  san: string;
  count: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
}

/** Position key ignoring move counters so transpositions collapse. */
const fenKey = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

interface Bucket {
  count: number;
  wins: number;
  draws: number;
  losses: number;
}

/**
 * Builds an index of the moves YOU have played from each position, across all
 * of your games that carry moves, and returns the ones for the current FEN.
 */
export const useMyRepertoireMoves = (fen: string): PersonalMove[] => {
  const { games } = useGames();

  const index = useMemo(() => {
    const map = new Map<string, Map<string, Bucket>>();
    games.forEach(g => {
      if (!g.pgn) return;
      const chess = new Chess();
      try {
        chess.loadPgn(sanitizePgn(g.pgn));
      } catch {
        return;
      }
      const history = chess.history({ verbose: true });
      history.forEach(m => {
        const moverIsPlayer = (m.color === 'w' && g.color === 'W') || (m.color === 'b' && g.color === 'B');
        if (!moverIsPlayer) return;
        const key = fenKey(m.before);
        let byMove = map.get(key);
        if (!byMove) {
          byMove = new Map();
          map.set(key, byMove);
        }
        const bucket = byMove.get(m.san) ?? { count: 0, wins: 0, draws: 0, losses: 0 };
        bucket.count++;
        if (g.result === 'W') bucket.wins++;
        else if (g.result === 'D') bucket.draws++;
        else bucket.losses++;
        byMove.set(m.san, bucket);
      });
    });
    return map;
  }, [games]);

  return useMemo(() => {
    const byMove = index.get(fenKey(fen));
    if (!byMove) return [];
    return Array.from(byMove.entries())
      .map(([san, b]) => ({
        san,
        count: b.count,
        wins: b.wins,
        draws: b.draws,
        losses: b.losses,
        winRate: b.count > 0 ? Math.round(((b.wins + b.draws * 0.5) / b.count) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [index, fen]);
};
