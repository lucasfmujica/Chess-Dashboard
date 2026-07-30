// Row -> domain mappers for reference data attached to games: tournament
// metadata and the opening heroes' model games.
import { toDateString } from './_dates.js';

export interface TournamentRow {
  id: string;
  name: string;
  start_date: string | Date | null;
  end_date: string | Date | null;
  kind: string;
  category: string | null;
  time_control: string | null;
  affects_elo: boolean;
  official_performance: number | null;
  official_points: string | number | null;
  official_place: number | null;
  starting_rank: number | null;
  elo_before: number | null;
  elo_change: string | number | null;
  club: string | null;
  province: string | null;
  chess_results_url: string | null;
  notes: string | null;
  created_at: string;
}

/** NUMERIC comes back as a string from the driver, to avoid precision loss. */
const toNumber = (value: string | number | null): number | undefined =>
  value == null ? undefined : typeof value === 'number' ? value : Number(value);

export const rowToTournament = (row: TournamentRow) => ({
  id: row.id,
  name: row.name,
  startDate: toDateString(row.start_date),
  endDate: toDateString(row.end_date),
  kind: row.kind as 'individual' | 'equipos',
  category: row.category ?? undefined,
  timeControl: row.time_control ?? undefined,
  affectsElo: row.affects_elo,
  officialPerformance: row.official_performance ?? undefined,
  officialPoints: toNumber(row.official_points),
  officialPlace: row.official_place ?? undefined,
  startingRank: row.starting_rank ?? undefined,
  eloBefore: row.elo_before ?? undefined,
  eloChange: toNumber(row.elo_change),
  club: row.club ?? undefined,
  province: row.province ?? undefined,
  chessResultsUrl: row.chess_results_url ?? undefined,
  notes: row.notes ?? undefined,
  createdAt: new Date(row.created_at).getTime(),
});

export interface ModelGameRow {
  id: string;
  eco: string;
  hero: string;
  event: string | null;
  year: number | null;
  result: string | null;
  pgn: string;
  note: string | null;
  created_at: string;
}

export const rowToModelGame = (row: ModelGameRow) => ({
  id: row.id,
  eco: row.eco,
  hero: row.hero,
  event: row.event ?? undefined,
  year: row.year ?? undefined,
  result: row.result ?? undefined,
  pgn: row.pgn,
  note: row.note ?? undefined,
  createdAt: new Date(row.created_at).getTime(),
});
