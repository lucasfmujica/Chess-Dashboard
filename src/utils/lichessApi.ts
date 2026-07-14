/**
 * Lichess API Integration
 * Fetches games from Lichess.org for a given username
 */

import type { Game, GameResult, LichessSpeed } from '../types/chess';

const LICHESS_API_BASE = 'https://lichess.org/api';

export interface FetchLichessOptions {
  /** Max games to fetch. Pass null/undefined for no limit (streams everything matching the filters). */
  max?: number | null;
  rated?: boolean;
  perfType?: string;
  since?: number | null;
  until?: number | null;
}

interface LichessPlayer {
  user?: { name?: string; id?: string };
  rating?: number;
}

/** Shape of a Lichess game as returned by the public API (fields we use). */
export interface LichessRawGame {
  id: string;
  rated: boolean;
  createdAt: number;
  winner?: 'white' | 'black';
  speed?: LichessSpeed;
  players: { white: LichessPlayer; black: LichessPlayer };
  opening?: { eco?: string; name?: string };
  tournament?: { name?: string } | string;
  clock?: { initial: number; increment: number };
  /** SAN movetext (present when requested with moves=true). */
  moves?: string;
}

export interface LichessUserRating {
  classical: number | null;
  rapid: number | null;
  blitz: number | null;
  bullet: number | null;
  username: string;
  id: string;
}

/**
 * Fetch games from Lichess for a specific user.
 */
export const fetchLichessGames = async (
  username: string,
  options: FetchLichessOptions = {}
): Promise<LichessRawGame[]> => {
  const {
    max = 50,
    rated = true,
    perfType = 'classical,rapid,blitz', // classical, rapid, blitz, bullet
    since = null, // timestamp in milliseconds
    until = null,
  } = options;

  try {
    const params = new URLSearchParams({
      rated: rated.toString(),
      perfType,
      moves: 'true', // include SAN movetext so games are replayable/analysable
      pgnInJson: 'false',
      clocks: 'false',
      evals: 'false',
      opening: 'true',
    });

    if (max != null) params.append('max', max.toString());
    if (since) params.append('since', since.toString());
    if (until) params.append('until', until.toString());

    const response = await fetch(
      `${LICHESS_API_BASE}/games/user/${username}?${params.toString()}`,
      {
        headers: {
          Accept: 'application/x-ndjson',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Lichess API error: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();

    // Parse NDJSON (newline-delimited JSON)
    const games: LichessRawGame[] = text
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));

    return games;
  } catch (error) {
    console.error('Error fetching Lichess games:', error);
    throw error;
  }
};

/**
 * Transform Lichess game data to match our app's game format.
 */
export const transformLichessGames = (lichessGames: LichessRawGame[], username: string): Game[] => {
  return lichessGames.map(game => {
    const isWhite = game.players.white.user?.name?.toLowerCase() === username.toLowerCase();
    const playerColor = isWhite ? 'white' : 'black';
    const opponentColor = isWhite ? 'black' : 'white';

    const playerData = game.players[playerColor];
    const opponentData = game.players[opponentColor];

    // Determine result from player's perspective
    let result: GameResult;
    if (game.winner === playerColor) {
      result = 'W';
    } else if (game.winner === opponentColor) {
      result = 'L';
    } else {
      result = 'D'; // Draw or no winner
    }

    const tournamentName =
      typeof game.tournament === 'string' ? game.tournament : game.tournament?.name;

    return {
      elo: playerData.rating || 0,
      color: isWhite ? 'W' : 'B',
      result,
      opp: opponentData.user?.name || 'Anonymous',
      opp_elo: opponentData.rating || 0,
      eco: game.opening?.eco || 'Unknown',
      tournament: tournamentName || 'Lichess Online',
      rated: game.rated,
      time: new Date(game.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      date: new Date(game.createdAt).toISOString().split('T')[0],
      gameId: game.id,
      speed: game.speed, // bullet, blitz, rapid, classical
      timeControl: game.clock ? `${game.clock.initial / 60}+${game.clock.increment}` : 'unlimited',
      opening: game.opening?.name || 'Unknown Opening',
      source: 'lichess', // Mark as Lichess game
      ...(game.moves ? { pgn: game.moves } : {}),
    };
  });
};

/**
 * Get user's current rating from Lichess.
 */
export const fetchLichessUserRating = async (username: string): Promise<LichessUserRating> => {
  try {
    const response = await fetch(`${LICHESS_API_BASE}/user/${username}`);

    if (!response.ok) {
      throw new Error(`Lichess API error: ${response.status}`);
    }

    const userData = await response.json();

    return {
      classical: userData.perfs?.classical?.rating || null,
      rapid: userData.perfs?.rapid?.rating || null,
      blitz: userData.perfs?.blitz?.rating || null,
      bullet: userData.perfs?.bullet?.rating || null,
      username: userData.username,
      id: userData.id,
    };
  } catch (error) {
    console.error('Error fetching Lichess user rating:', error);
    throw error;
  }
};

/**
 * Merge Lichess games with existing local games, removing duplicates.
 */
export const mergeGames = (existingGames: Game[], newGames: Game[]): Game[] => {
  const gameMap = new Map<string, Game>();

  const keyFor = (game: Game): string =>
    game.gameId || `${game.tournament}-${game.opp}-${game.date}`;

  // Add existing games first
  existingGames.forEach(game => gameMap.set(keyFor(game), game));
  // Add new games (will overwrite if duplicate key)
  newGames.forEach(game => gameMap.set(keyFor(game), game));

  return Array.from(gameMap.values());
};
