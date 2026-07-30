/** Maps between the `games` table's columns and the client-facing `Game` shape. */
import { toDateString } from './_dates.js';

export interface GameRow {
  id: string;
  lichess_game_id: string | null;
  source: string;
  color: string;
  result: string;
  elo: number;
  opponent: string;
  opponent_elo: number | null;
  eco: string | null;
  opening_name: string | null;
  tournament: string | null;
  rated: boolean;
  played_date: string | Date | null;
  played_time: string | null;
  speed: string | null;
  time_control: string | null;
  elo_change: number | null;
  k_factor: number | null;
  pgn: string | null;
  city: string | null;
  country: string | null;
  // Which prepared line the game actually followed, and the ply it left book.
  // Set by the client-side "Match games to repertoire" action, not by hand.
  repertoire_line_id: string | null;
  book_exit_ply: number | null;
  affects_elo: boolean;
}

/** Shape accepted on write: whatever the client's `Game` object has populated. */
export interface GameInput {
  elo: number;
  color: string;
  result: string;
  opp: string;
  opp_elo?: number;
  eco?: string;
  tournament?: string;
  rated: boolean;
  time?: string;
  date?: string;
  source?: string;
  eloChange?: number;
  kFactor?: number;
  gameId?: string;
  speed?: string;
  timeControl?: string;
  opening?: string;
  pgn?: string;
  city?: string;
  country?: string;
  affectsElo?: boolean;
}

export const rowToGame = (row: GameRow) => ({
  id: row.id,
  elo: row.elo,
  color: row.color,
  result: row.result,
  opp: row.opponent,
  opp_elo: row.opponent_elo ?? undefined,
  eco: row.eco ?? undefined,
  tournament: row.tournament ?? undefined,
  rated: row.rated,
  time: row.played_time ?? undefined,
  // `Game.date` is documented as YYYY-MM-DD and compared as a string all over
  // the app; a DATE column arrives here as a full timestamp. See _dates.ts.
  date: toDateString(row.played_date),
  source: row.source,
  eloChange: row.elo_change ?? undefined,
  kFactor: row.k_factor ?? undefined,
  gameId: row.lichess_game_id ?? undefined,
  speed: row.speed ?? undefined,
  timeControl: row.time_control ?? undefined,
  opening: row.opening_name ?? undefined,
  pgn: row.pgn ?? undefined,
  city: row.city ?? undefined,
  country: row.country ?? undefined,
  repertoireLineId: row.repertoire_line_id ?? undefined,
  bookExitPly: row.book_exit_ply ?? undefined,
  affectsElo: row.affects_elo,
});
