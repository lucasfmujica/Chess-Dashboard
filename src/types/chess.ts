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

/** A single game record as stored in the database / context. */
export interface Game {
  /** Database row id. Absent for games that haven't been persisted yet. */
  id?: string;
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

  /** SAN movetext / PGN moves, when available (enables board replay). */
  pgn?: string;

  // Optional location metadata (used by the geography feature)
  city?: string;
  country?: string;
  /** Prepared line this game followed, set by the repertoire matcher. */
  repertoireLineId?: string;
  /** Ply at which the game left that line — how far the preparation held. */
  bookExitPly?: number;
  /**
   * Whether this game moves the FIDE rating curve. False for team rapid
   * events, which still count for every other statistic. Undefined on older
   * rows and treated as true.
   */
  affectsElo?: boolean;
}

/** Tracked player's profile/summary info. */
export interface PlayerInfo {
  /** Standard rating as FIDE publishes it; synced weekly, not typed in. */
  current_elo: number;
  elo_change_last_tournament: number;
  last_tournament: string;
  /** When `current_elo` was last written, ISO. Absent on the seed data. */
  updated_at?: string;
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

/** A single annotated key moment within a game. */
export interface KeyMoment {
  move: string;
  symbol: string;
  comment: string;
}

/** A user-saved annotated game. */
export interface AnnotatedGame {
  id: string;
  createdAt: number;
  gameName?: string;
  opponent?: string;
  date?: string;
  opening?: string;
  eco?: string;
  result?: string;
  rating?: number;
  tags?: string[];
  notes?: string;
  keyMoments?: KeyMoment[];
  /** Optional PGN moves so the game can be replayed/analysed. */
  pgn?: string;
  /** Link to the `games` row this post-mortem is about, when known. */
  gameId?: string;
  /**
   * Structured post-mortem fields. tags/notes/keyMoments are free text and
   * can't be aggregated — these are what the Training Log charts, so the
   * distribution of *why* games are lost comes from records rather than
   * from memory.
   */
  errorType?: AnnotationErrorType;
  criticalMomentFen?: string;
  playedMove?: string;
  bestMove?: string;
  lesson?: string;
  /**
   * Studied concepts this game turned on. `Concept.gameIds` records the same
   * link from the other side; this end exists so it can be made during the
   * post-mortem, which is the moment you actually know it.
   */
  conceptIds?: string[];
}

/** Why a game was lost or nearly lost. Mirrors the DB CHECK constraint. */
export type AnnotationErrorType =
  | 'candidate-miss'
  | 'calculation'
  | 'evaluation'
  | 'clock'
  | 'opening'
  | 'technique'
  | 'none';

/** A prepared opening line for tournament study — plan, trap and review notes. */
export interface RepertoireLine {
  id: string;
  createdAt: number;
  color: 'W' | 'B';
  /** What this line is a reply to, e.g. '1.e4', '1.c4 e5', 'anti-Sicilian Bb5'. */
  vsMove?: string;
  eco?: string;
  lineName?: string;
  /** Moves up to the critical tabiya, in SAN. */
  movesSan?: string;
  /** FEN of the critical position. */
  keyFen?: string;
  /** The plan, in one sentence. */
  plan?: string;
  /** The golden rule / trap to avoid. */
  goldenRule?: string;
  /** 1 = close out first. */
  priority?: number;
  /** Self-assessed confidence, 1-5. */
  confidence?: number;
  lichessUrl?: string;
  lastReviewed?: number;
  /** How many times this line has been drilled. Incremented server-side. */
  reviewCount?: number;
  notes?: string;
}

/** What a `RepertoireMove` row is for. Only `main` is scheduled by the SRS. */
export type RepertoireMoveRole = 'main' | 'alt' | 'trap';

/**
 * One trainable decision of the repertoire study — the Chessable unit.
 *
 * A `RepertoireLine` is a whole chapter, which the flashcard trainer grades as
 * a single card. This is one move inside it: the position, the move prepared
 * there, and what the study says about it. Produced by the import script from
 * the study PGN, never edited in the app.
 */
export interface RepertoireMove {
  id: string;
  /** 1-32, the `NN` prefix of the chapter title. Joins to `RepertoireLine`. */
  chapterNo: number;
  chapterName: string;
  eco?: string;
  /** The side the player has in this chapter. */
  color: 'W' | 'B';
  /** SAN moves reaching `fenBefore`, space-joined. Identity within the chapter. */
  pathSan: string;
  fenBefore: string;
  expectedSan: string;
  /** The opponent's scripted answer, so a line plays on without re-parsing. */
  replySan?: string;
  /** The study's own note — the golden rule, or a trap's refutation. */
  comment?: string;
  isMainline: boolean;
  role: RepertoireMoveRole;
  /** Ply count of `pathSan`, so a session runs front to back. */
  depth: number;
  confidence?: number;
  lastReviewed?: number;
  reviewCount?: number;
  createdAt: number;
}

/** A rival being scouted before a tournament round. */
export interface ScoutingTarget {
  id: string;
  createdAt: number;
  name: string;
  lichessUsername?: string;
  tournament?: string;
  notes?: string;
  lastScoutedAt?: number;
}

/**
 * Tournament metadata, replacing the hardcoded TOURNAMENT_DATA constant.
 * The official_* values come from the federation's own sheet rather than
 * being recomputed — the two disagree, and the sheet is what you'd be
 * comparing against.
 */
export interface Tournament {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  kind: 'individual' | 'equipos';
  /** 'reserva' / 'superior' for team events, so editions stay comparable. */
  category?: string;
  timeControl?: string;
  /** False for team rapid events: counts for stats, not for the ELO curve. */
  affectsElo: boolean;
  officialPerformance?: number;
  officialPoints?: number;
  officialPlace?: number;
  startingRank?: number;
  eloBefore?: number;
  eloChange?: number;
  club?: string;
  province?: string;
  chessResultsUrl?: string;
  notes?: string;
  createdAt: number;
}

/** A model game by one of the opening heroes. */
export interface ModelGame {
  id: string;
  eco: string;
  hero: string;
  event?: string;
  year?: number;
  result?: string;
  pgn: string;
  note?: string;
  createdAt: number;
}
