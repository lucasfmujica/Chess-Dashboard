/**
 * Chess.com Published-Data API integration
 * Fetches a player's monthly game archives and maps them onto the app's Game shape.
 *
 * Chess.com asks for serial requests and an identifying User-Agent, so archives are
 * fetched one at a time with a pause between them. Bullet is never fetched.
 */

import type { Game, GameResult, LichessSpeed } from '../types/chess';

export { mergeGames } from './lichessApi';

const CHESSCOM_API_BASE = 'https://api.chess.com/pub/player';

/** Browsers ignore this header; it identifies us when the sync ever runs server-side. */
const USER_AGENT =
  'Chess-Dashboard/1.0 (github.com/lucasfmujica/Chess-Dashboard; contact via GitHub issues)';

/** Pause between consecutive requests, so archives are never hit in parallel or in a burst. */
const REQUEST_DELAY_MS = 1000;

/** The time classes the sync can ask for. Bullet is deliberately not one of them. */
export type ChessComTimeClass = 'rapid' | 'blitz';

export interface FetchChessComOptions {
  /** Which time classes to keep. Defaults to rapid only. */
  timeClasses?: ChessComTimeClass[];
  /** YYYY-MM-DD. Only archives from that month on are requested, and older games dropped. */
  sinceDate?: string;
  /** Override the pause between requests (tests). */
  delayMs?: number;
  /** Override fetch (tests). */
  fetchImpl?: typeof fetch;
}

interface ChessComPlayer {
  username?: string;
  /** Rating after the game. */
  rating?: number;
  /** 'win' or the reason this side lost / drew ('resigned', 'timeout', 'agreed', ...). */
  result?: string;
}

/** Shape of a Chess.com game as returned by the monthly archive (fields we use). */
export interface ChessComRawGame {
  uuid: string;
  url?: string;
  pgn?: string;
  /** Seconds since epoch. */
  end_time: number;
  rated: boolean;
  /** Base seconds ('600'), base+increment ('180+2') or daily ('1/86400'). */
  time_control: string;
  time_class: string;
  rules?: string;
  white: ChessComPlayer;
  black: ChessComPlayer;
}

/** Results that end a game without a winner. Everything else that isn't 'win' is a loss. */
const DRAW_RESULTS = new Set([
  'agreed',
  'repetition',
  'stalemate',
  'insufficient',
  '50move',
  'timevsinsufficient',
]);

/** `YYYY/MM` from an archive URL such as `.../games/2026/10`. */
const archiveMonth = (archiveUrl: string): string | null => {
  const match = /(\d{4})\/(\d{2})\/?$/.exec(archiveUrl);
  return match ? `${match[1]}/${match[2]}` : null;
};

/**
 * The archives worth requesting. With a `sinceDate`, only those whose month is the
 * same as or later than that date's month; without one, all of them.
 */
export const selectArchives = (archiveUrls: string[], sinceDate?: string): string[] => {
  if (!sinceDate) return archiveUrls;
  const sinceMonth = sinceDate.slice(0, 7).replace('-', '/');
  return archiveUrls.filter(url => {
    const month = archiveMonth(url);
    return month !== null && month >= sinceMonth;
  });
};

/**
 * Keep the games the app wants: standard chess, rated, in one of the asked time
 * classes (never bullet), and not before `sinceDate`.
 */
export const selectChessComGames = (
  raw: ChessComRawGame[],
  { timeClasses = ['rapid'], sinceDate }: Pick<FetchChessComOptions, 'timeClasses' | 'sinceDate'> = {}
): ChessComRawGame[] => {
  const sinceMs = sinceDate ? new Date(`${sinceDate}T00:00:00Z`).getTime() : null;
  return raw.filter(
    game =>
      (game.rules ?? 'chess') === 'chess' &&
      game.rated &&
      (timeClasses as string[]).includes(game.time_class) &&
      (sinceMs === null || game.end_time * 1000 >= sinceMs)
  );
};

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Fetch a user's games from Chess.com, oldest archive first, one request at a time.
 */
export const fetchChessComGames = async (
  username: string,
  options: FetchChessComOptions = {}
): Promise<ChessComRawGame[]> => {
  const { timeClasses = ['rapid'], sinceDate, delayMs = REQUEST_DELAY_MS, fetchImpl = fetch } = options;
  const headers = { Accept: 'application/json', 'User-Agent': USER_AGENT };
  const base = `${CHESSCOM_API_BASE}/${encodeURIComponent(username.toLowerCase())}`;

  const getJson = async <T>(url: string): Promise<T> => {
    const response = await fetchImpl(url, { headers });
    if (!response.ok) {
      throw new Error(`Chess.com API error: ${response.status} ${response.statusText}`);
    }
    return (await response.json()) as T;
  };

  try {
    const { archives } = await getJson<{ archives: string[] }>(`${base}/games/archives`);
    const wanted = selectArchives(archives ?? [], sinceDate);

    const games: ChessComRawGame[] = [];
    for (const archiveUrl of wanted) {
      await sleep(delayMs);
      const { games: monthGames } = await getJson<{ games?: ChessComRawGame[] }>(archiveUrl);
      games.push(...selectChessComGames(monthGames ?? [], { timeClasses, sinceDate }));
    }
    return games;
  } catch (error) {
    console.error('Error fetching Chess.com games:', error);
    throw error;
  }
};

/** '600' -> '10+0', '180+2' -> '3+2'. Daily ('1/86400') is kept as sent. */
export const humanizeTimeControl = (timeControl: string): string => {
  const match = /^(\d+)(?:\+(\d+))?$/.exec(timeControl);
  if (!match) return timeControl;
  return `${Number(match[1]) / 60}+${match[2] ?? 0}`;
};

const pgnTag = (pgn: string | undefined, tag: string): string | undefined =>
  pgn ? new RegExp(`\\[${tag}\\s+"([^"]*)"\\]`).exec(pgn)?.[1] : undefined;

/** `.../openings/Sicilian-Defense-Closed-2...Nc6` -> 'Sicilian Defense Closed 2...Nc6'. */
const openingFromEcoUrl = (ecoUrl: string | undefined): string | undefined => {
  const slug = ecoUrl?.split('/openings/')[1];
  return slug ? slug.replace(/-/g, ' ') : undefined;
};

/**
 * Transform Chess.com game data to match our app's game format.
 * `gameId` carries the Chess.com `uuid` and is the dedupe key.
 */
export const transformChessComGames = (raw: ChessComRawGame[], username: string): Game[] => {
  return raw.map(game => {
    const isWhite = game.white.username?.toLowerCase() === username.toLowerCase();
    const player = isWhite ? game.white : game.black;
    const opponent = isWhite ? game.black : game.white;

    let result: GameResult;
    if (player.result === 'win') result = 'W';
    else if (player.result && DRAW_RESULTS.has(player.result)) result = 'D';
    else result = 'L';

    const endedAt = new Date(game.end_time * 1000).toISOString();

    return {
      elo: player.rating || 0,
      color: isWhite ? 'W' : 'B',
      result,
      opp: opponent.username || 'Anonymous',
      opp_elo: opponent.rating || 0,
      eco: pgnTag(game.pgn, 'ECO') || 'Unknown',
      tournament: 'Chess.com Online',
      rated: game.rated,
      time: endedAt.slice(11, 16),
      date: endedAt.slice(0, 10),
      gameId: game.uuid,
      speed: game.time_class as LichessSpeed,
      timeControl: humanizeTimeControl(game.time_control),
      opening: openingFromEcoUrl(pgnTag(game.pgn, 'ECOUrl')) || 'Unknown Opening',
      source: 'chesscom',
      ...(game.pgn ? { pgn: game.pgn } : {}),
    };
  });
};
