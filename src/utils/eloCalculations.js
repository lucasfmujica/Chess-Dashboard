/**
 * ELO Calculation Utilities
 * Centralized functions for chess rating calculations
 */

import { ELO_CONSTANTS, GAME_SCORES } from '../constants/chessConstants';

/**
 * Calculate expected score for a player against an opponent
 * @param {number} playerElo - Player's ELO rating
 * @param {number} opponentElo - Opponent's ELO rating
 * @returns {number} Expected score (0-1)
 */
export const calculateExpectedScore = (playerElo, opponentElo) => {
  if (opponentElo === 0) return 0.5; // Default to 50% if opponent has no rating

  return 1 / (
    1 + Math.pow(
      ELO_CONSTANTS.BASE_EXPONENT,
      (opponentElo - playerElo) / ELO_CONSTANTS.BASE_RATING_DIVISOR
    )
  );
};

/**
 * Get actual score value from game result
 * @param {string} result - 'W', 'D', or 'L'
 * @returns {number} Actual score (1, 0.5, or 0)
 */
export const getActualScore = (result) => {
  return GAME_SCORES[result] ?? 0;
};

/**
 * Calculate performance rating based on results
 * @param {number} avgOpponentElo - Average opponent ELO
 * @param {number} actualScore - Actual score achieved
 * @param {number} totalGames - Total number of games
 * @returns {number} Performance rating
 */
export const calculatePerformanceRating = (avgOpponentElo, actualScore, totalGames) => {
  if (avgOpponentElo === 0 || totalGames === 0) {
    return 0;
  }

  // Perfect score
  if (actualScore === totalGames) {
    return Math.round(avgOpponentElo + ELO_CONSTANTS.PERFORMANCE_RATING_MULTIPLIER);
  }

  // Zero score
  if (actualScore === 0) {
    return Math.round(avgOpponentElo - ELO_CONSTANTS.PERFORMANCE_RATING_MULTIPLIER);
  }

  // Normal case
  return Math.round(
    avgOpponentElo +
    ELO_CONSTANTS.PERFORMANCE_RATING_MULTIPLIER *
    Math.log10(actualScore / (totalGames - actualScore))
  );
};

/**
 * Calculate statistics for a set of games
 * @param {Array} games - Array of game objects
 * @returns {Object} Statistics including wins, draws, losses, scores, etc.
 */
export const calculateGameStats = (games) => {
  const wins = games.filter(g => g.result === 'W').length;
  const draws = games.filter(g => g.result === 'D').length;
  const losses = games.filter(g => g.result === 'L').length;
  const total = games.length;

  const totalExpected = games.reduce((sum, game) => {
    return sum + calculateExpectedScore(game.elo, game.opp_elo);
  }, 0);

  const totalActual = wins + draws * 0.5;

  const ratedOpponents = games.filter(g => g.opp_elo > 0);
  const avgOppElo = ratedOpponents.length > 0
    ? Math.round(ratedOpponents.reduce((sum, g) => sum + g.opp_elo, 0) / ratedOpponents.length)
    : 0;

  const performanceRating = calculatePerformanceRating(avgOppElo, totalActual, total);

  return {
    wins,
    draws,
    losses,
    total,
    winRate: total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0',
    expectedScore: totalExpected.toFixed(1),
    actualScore: totalActual.toFixed(1),
    performanceRating,
    avgOppElo,
    score: `${totalActual.toFixed(1)}/${total}`,
  };
};

/**
 * Calculate performance rating for games with color-specific logic
 * @param {Array} games - Array of game objects
 * @returns {Object} Performance rating and related stats
 */
export const calculateColorPerformance = (games) => {
  if (games.length === 0) {
    return { performance: '-', avgOppElo: 0 };
  }

  const stats = calculateGameStats(games);
  const ratedGames = games.filter(g => g.opp_elo > 0);

  if (ratedGames.length === 0) {
    return { performance: '-', avgOppElo: 0 };
  }

  return {
    performance: stats.performanceRating,
    avgOppElo: stats.avgOppElo,
  };
};

/**
 * Get average opponent ELO for a set of games
 * @param {Array} games - Array of game objects
 * @returns {number} Average opponent ELO
 */
export const getAverageOpponentElo = (games) => {
  const ratedOpponents = games.filter(g => g.opp_elo > 0);
  if (ratedOpponents.length === 0) return 0;

  return Math.round(
    ratedOpponents.reduce((sum, g) => sum + g.opp_elo, 0) / ratedOpponents.length
  );
};

/**
 * Calculate ELO rating difference bracket
 * @param {number} playerElo - Player's ELO
 * @param {number} opponentElo - Opponent's ELO
 * @returns {string} Bracket identifier: 'lower', 'similar', or 'higher'
 */
export const getEloRatingBracket = (playerElo, opponentElo) => {
  const diff = opponentElo - playerElo;

  if (diff < -ELO_CONSTANTS.RATING_BRACKET_THRESHOLD) return 'lower';
  if (diff > ELO_CONSTANTS.RATING_BRACKET_THRESHOLD) return 'higher';
  return 'similar';
};
