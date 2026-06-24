/**
 * Core chess domain model.
 * Single source of truth for the shapes that were previously implicit across
 * GamesContext, the stats hooks and the util functions.
 */

/** Result of a game from the tracked player's perspective. */
export type GameResult = 'W' | 'D' | 'L';

/** Color the tracked player had in a game. */
export type PlayerColor = 'W' | 'B';

/** Where a game came from. */
export type GameSource = 'otb' | 'lichess';

/** Lichess time-control family. */
export type LichessSpeed = 'bullet' | 'blitz' | 'rapid' | 'classical' | 'correspondence';

/** A single game record as stored in localStorage / context. */
export interface Game {
  /** Player's ELO at the time of the game. */
  elo: number;
  color: PlayerColor;
  result: GameResult;
  /** Opponent name. */
  opp: string;
  /** Opponent ELO (0 when unrated/unknown). */
  opp_elo: number;
  /** ECO opening code (e.g. 'B30'). */
  eco: string;
  /** Tournament / event name. */
  tournament: string;
  rated: boolean;
  /** Time of day in HH:MM (24h). */
  time?: string;
  /** ISO date (YYYY-MM-DD), present for synced games. */
  date?: string;
  source?: GameSource;
  /** ELO delta for the game (calculated or provided). */
  eloChange?: number;
  /** K-factor used for this game (40 or 20). */
  kFactor?: number;

  // Lichess-specific fields (present when source === 'lichess')
  gameId?: string;
  speed?: LichessSpeed;
  /** e.g. '10+0'. */
  timeControl?: string;
  /** Full opening name. */
  opening?: string;

  // Optional location metadata (used by the geography feature)
  city?: string;
  country?: string;
}

/** Tracked player's profile/summary info. */
export interface PlayerInfo {
  current_elo: number;
  elo_change_last_tournament: number;
  last_tournament: string;
}

/** Opening repertoire by color (ECO codes). */
export interface Repertoire {
  white: string[];
  black: string[];
}

/** Aggregate statistics for a set of games (see calculateGameStats). */
export interface GameStats {
  wins: number;
  draws: number;
  losses: number;
  total: number;
  /** Win rate as a fixed(1) string, e.g. '52.3'. */
  winRate: string;
  /** Expected score as a fixed(1) string. */
  expectedScore: string;
  /** Actual score as a fixed(1) string. */
  actualScore: string;
  performanceRating: number;
  avgOppElo: number;
  /** Score summary, e.g. '23.5/47'. */
  score: string;
}

/** Result of calculateColorPerformance. */
export interface ColorPerformance {
  /** Performance rating, or '-' when not computable. */
  performance: number | '-';
  avgOppElo: number;
}

/** Rating bracket relative to the player. */
export type EloRatingBracket = 'lower' | 'similar' | 'higher';

/** Per-opening aggregate (across both colors) from useGameStats.allOpeningsStats. */
export interface OpeningStat {
  eco: string;
  name: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  /** Score summary, e.g. '3.5/6'. */
  score: string;
  /** Win rate as a number, e.g. 58.3. */
  winRate: number;
  asWhite: number;
  asBlack: number;
}

/** Per-tournament aggregate from useGameStats.tournamentStats. */
export interface TournamentStat {
  tournament: string;
  name: string;
  wins: number;
  draws: number;
  losses: number;
  total: number;
  score: string;
  performanceRating: number;
  avgOppElo: number;
  eloChange: number;
  eloBefore: number;
  eloAfter: number;
  whitePerformance: number | string;
  blackPerformance: number | string;
}

/** Kind of current streak. */
export type StreakType = 'win' | 'loss' | 'unbeaten';

/** Current streak state. */
export interface StreakState {
  type: StreakType | null;
  count: number;
}

/** Summary of streaks from useTrendsAndAnalytics.streaks. */
export interface StreaksSummary {
  current: StreakState;
  longestWin: number;
  longestUnbeaten: number;
}

/** Per-tournament time-series entry from useTrendsAndAnalytics.monthlyStats. */
export interface MonthlyStat {
  tournament: string;
  order: number;
  month: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  percentage: number;
  performanceRating: number;
  elo: number;
  eloChange: number;
}

/** A planned/upcoming tournament entry. */
export interface UpcomingTournament {
  id: number;
  name: string;
  club: string;
  province: string;
  startDate: string;
  endDate: string;
  chessResultsLink: string;
}
