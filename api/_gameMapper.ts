/** Maps between the `games` table's columns and the client-facing `Game` shape. */

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
  played_date: string | null;
  played_time: string | null;
  speed: string | null;
  time_control: string | null;
  elo_change: number | null;
  k_factor: number | null;
  pgn: string | null;
  city: string | null;
  country: string | null;
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
  date: row.played_date ?? undefined,
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
});
