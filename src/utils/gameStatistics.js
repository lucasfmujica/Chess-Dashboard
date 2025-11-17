/**
 * Game statistics calculation utilities
 */

import { calculateAvgOpponentElo, calculatePerformanceRating } from './eloCalculations';
import { ecoNames } from '../constants/ecoNames';

/**
 * Calculate basic game statistics (wins, draws, losses)
 * @param {Array} games - Array of game objects
 * @returns {Object} Statistics object with wins, draws, losses, total, winRate, actualScore
 */
export const calculateBasicStats = (games) => {
  const wins = games.filter(g => g.result === 'W').length;
  const draws = games.filter(g => g.result === 'D').length;
  const losses = games.filter(g => g.result === 'L').length;
  const total = games.length;
  const actualScore = wins + draws * 0.5;

  return {
    wins,
    draws,
    losses,
    total,
    winRate: total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0',
    actualScore,
    score: `${actualScore.toFixed(1)}/${total}`
  };
};

/**
 * Calculate ECO (opening) statistics from games
 * @param {Array} games - Array of game objects with eco property
 * @returns {Object} ECO statistics mapped by ECO code
 */
export const calculateEcoStats = (games) => {
  const ecoStats = {};

  games.forEach(game => {
    if (!ecoStats[game.eco]) {
      ecoStats[game.eco] = {
        games: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        name: ecoNames[game.eco] || game.eco
      };
    }
    ecoStats[game.eco].games++;
    if (game.result === 'W') ecoStats[game.eco].wins++;
    if (game.result === 'D') ecoStats[game.eco].draws++;
    if (game.result === 'L') ecoStats[game.eco].losses++;
  });

  return ecoStats;
};

/**
 * Convert ECO stats object to sorted array of openings
 * @param {Object} ecoStats - ECO statistics object
 * @returns {Array} Sorted array of opening statistics
 */
export const formatOpeningsArray = (ecoStats) => {
  return Object.entries(ecoStats)
    .map(([eco, stats]) => ({
      eco,
      name: stats.name,
      games: stats.games,
      wins: stats.wins,
      draws: stats.draws,
      losses: stats.losses,
      score: `${(stats.wins + stats.draws * 0.5).toFixed(1)}/${stats.games}`,
      winRate: ((stats.wins / stats.games) * 100).toFixed(1)
    }))
    .sort((a, b) => b.games - a.games);
};

/**
 * Calculate complete statistics for a set of games (color-specific or overall)
 * @param {Array} games - Array of game objects
 * @returns {Object} Complete statistics including performance rating and openings
 */
export const calculateCompleteStats = (games) => {
  const basicStats = calculateBasicStats(games);
  const avgOppElo = calculateAvgOpponentElo(games);
  const performanceRating = calculatePerformanceRating(basicStats.actualScore, basicStats.total, avgOppElo);
  const ecoStats = calculateEcoStats(games);
  const openings = formatOpeningsArray(ecoStats);

  return {
    ...basicStats,
    performanceRating,
    openings
  };
};
