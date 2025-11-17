/**
 * Chess-related constants
 */

// ELO rating difference thresholds for opponent brackets
export const ELO_BRACKET_THRESHOLD = 100;

// ELO bracket definitions
export const ELO_BRACKETS = {
  LOWER: 'lower',
  SIMILAR: 'similar',
  HIGHER: 'higher'
};

// ELO bracket display names
export const ELO_BRACKET_NAMES = {
  [ELO_BRACKETS.LOWER]: 'Lower rated (-100+)',
  [ELO_BRACKETS.SIMILAR]: 'Similar (±100)',
  [ELO_BRACKETS.HIGHER]: 'Higher rated (+100+)'
};

// Training plan constants
export const DAYS_IN_WEEK = 7;
export const ACTIVE_TRAINING_DAYS = 6; // excluding rest day
export const REST_DAY_INDEX = 6; // Sunday
export const MINUTES_PER_HOUR = 60;

// Chart colors
export const CHART_COLORS = {
  PRIMARY: '#3b82f6',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  DANGER: '#ef4444',
  SECONDARY: '#6b7280'
};

/**
 * Get ELO bracket based on rating difference
 * @param {number} ratingDiff - Difference between opponent and player ELO
 * @returns {string} Bracket key (lower, similar, or higher)
 */
export const getEloBracket = (ratingDiff) => {
  if (ratingDiff < -ELO_BRACKET_THRESHOLD) return ELO_BRACKETS.LOWER;
  if (ratingDiff > ELO_BRACKET_THRESHOLD) return ELO_BRACKETS.HIGHER;
  return ELO_BRACKETS.SIMILAR;
};
