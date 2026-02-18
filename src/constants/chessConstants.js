/**
 * Chess ELO and Game Constants
 */

// ELO Calculation Constants
export const ELO_CONSTANTS = {
  K_FACTOR_OLD: 40,
  K_FACTOR_NEW: 20,
  BASE_RATING_DIVISOR: 400,
  BASE_EXPONENT: 10,
  RATING_BRACKET_THRESHOLD: 100,
  PERFORMANCE_RATING_MULTIPLIER: 400,
};

// Tournament Historical Data
export const TOURNAMENT_DATA = {
  'IRT Damian Reca': {
    startElo: 1651,
    eloChange: +76,
    performanceRating: 1777,
  },
  'Torre Blanca': {
    startElo: 1727,
    eloChange: +49,
    performanceRating: 1787,
  },
  'Masters Ciudad': {
    startElo: 1776,
    eloChange: +72,
    performanceRating: 1950,
  },
  'Abierto Madryn': {
    startElo: 1848,
    eloChange: +41,
    performanceRating: 1956,
  },
  'Abierto Lago Puelo': {
    startElo: 1889,
    eloChange: -28,
    performanceRating: 1719,
  },
  'IRT Soberanía Nacional': {
    startElo: 1861,
    eloChange: +19,
    performanceRating: 2046,
  },
  'IRT Carnaval': {
    startElo: 1880,
    eloChange: -2,
    performanceRating: 1850,
  },
};

// Tournament Order (chronological)
export const TOURNAMENT_ORDER = [
  'IRT Damian Reca',
  'Torre Blanca',
  'Masters Ciudad',
  'Abierto Madryn',
  'Abierto Lago Puelo',
  'IRT Soberanía Nacional',
  'IRT Carnaval',
];

// Game Result Values
export const GAME_RESULTS = {
  WIN: 'W',
  DRAW: 'D',
  LOSS: 'L',
};

export const GAME_SCORES = {
  [GAME_RESULTS.WIN]: 1,
  [GAME_RESULTS.DRAW]: 0.5,
  [GAME_RESULTS.LOSS]: 0,
};

// Player Colors
export const COLORS = {
  WHITE: 'W',
  BLACK: 'B',
};

// Game Sources
export const GAME_SOURCES = {
  OTB: 'otb',
  LICHESS: 'lichess',
};

// Date Configuration
export const DATE_CONFIG = {
  CURRENT_DATE: new Date(2025, 10, 15), // Saturday Nov 15, 2025 (month is 0-indexed)
  WEEK_START_DAY: 1, // Monday
};

// Time Slots for Analytics
export const TIME_SLOTS = {
  MORNING: { label: 'Morning (9-12)', start: 9, end: 12 },
  AFTERNOON: { label: 'Afternoon (13-17)', start: 13, end: 17 },
  EVENING: { label: 'Evening (18-20)', start: 18, end: 20 },
};

// Opening Performance Thresholds
export const OPENING_THRESHOLDS = {
  MIN_GAMES_FOR_ANALYSIS: 3,
  LOW_SUCCESS_RATE: 40,
  MASTERY_GAMES: 5,
  MASTERY_WIN_RATE: 60,
};

// Streak and Achievement Thresholds
export const ACHIEVEMENT_THRESHOLDS = {
  WIN_STREAK_MIN: 3,
  UNBEATEN_STREAK_MIN: 5,
  GIANT_SLAYER_WINS: 5,
  POSITIVE_TOURNAMENTS_MIN: 3,
  MASTER_OPENINGS_MIN: 2,
};

// Default Configuration Values
export const DEFAULTS = {
  TARGET_ELO: 1950,
  TARGET_DATE: '2025-12-31',
  WEEKLY_TRAINING_HOURS: 6,
  MAX_LICHESS_IMPORT: 50,
  LICHESS_PERF_TYPES: 'classical,rapid,blitz',
};
