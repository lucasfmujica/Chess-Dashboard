import { useEffect, useState } from 'react';
import { fetchLichessGames, fetchLichessUserRating, transformLichessGames } from '../utils/lichessApi';
import type { LichessUserRating } from '../utils/lichessApi';
import type { Game } from '../types/chess';

interface RivalData {
  games: Game[];
  rating: LichessUserRating | null;
}

/** In-session cache so switching between saved scouting targets doesn't refetch every time. */
const cache = new Map<string, RivalData>();

export interface UseRivalGames {
  games: Game[];
  rating: LichessUserRating | null;
  loading: boolean;
  error: string | null;
}

/** Fetches a rival's recent Lichess games + rating for opponent prep. */
export const useRivalGames = (username: string | undefined): UseRivalGames => {
  const [data, setData] = useState<RivalData>(() => (username ? cache.get(username) ?? { games: [], rating: null } : { games: [], rating: null }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) {
      setData({ games: [], rating: null });
      return;
    }
    const cached = cache.get(username);
    if (cached) {
      setData(cached);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchLichessGames(username, { max: 100, rated: true }),
      fetchLichessUserRating(username).catch(() => null),
    ])
      .then(([rawGames, rating]) => {
        if (cancelled) return;
        const games = transformLichessGames(rawGames, username);
        const result: RivalData = { games, rating };
        cache.set(username, result);
        setData(result);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load rival games');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [username]);

  return { games: data.games, rating: data.rating, loading, error };
};
