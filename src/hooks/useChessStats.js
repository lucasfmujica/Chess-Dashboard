/**
 * Custom hooks for chess statistics calculations
 */

import { useMemo } from 'react';
import { calculateActualScore, calculateAvgOpponentElo, calculateExpectedScore, calculatePerformanceRating } from '../utils/eloCalculations';
import { calculateBasicStats, calculateCompleteStats } from '../utils/gameStatistics';
import { ELO_BRACKET_NAMES, getEloBracket } from '../constants/chessConstants';
import { ecoNames } from '../constants/ecoNames';

/**
 * Calculate overall statistics for all rated games
 */
export const useOverallStats = (ratedGames) => {
  return useMemo(() => {
    const basicStats = calculateBasicStats(ratedGames);
    const avgOppElo = calculateAvgOpponentElo(ratedGames);

    const totalExpected = ratedGames.reduce((sum, g) => {
      return sum + calculateExpectedScore(g.elo, g.opp_elo);
    }, 0);

    const performanceRating = calculatePerformanceRating(basicStats.actualScore, basicStats.total, avgOppElo);

    return {
      ...basicStats,
      expectedScore: totalExpected.toFixed(1),
      avgOppElo,
      performanceRating
    };
  }, [ratedGames]);
};

/**
 * Calculate statistics for games played as a specific color
 */
export const useColorStats = (ratedGames, color) => {
  return useMemo(() => {
    const colorGames = ratedGames.filter(g => g.color === color);
    return calculateCompleteStats(colorGames);
  }, [ratedGames, color]);
};

/**
 * Calculate statistics by ELO bracket (lower, similar, higher rated opponents)
 */
export const useEloBracketStats = (ratedGames) => {
  return useMemo(() => {
    const brackets = {
      lower: { name: ELO_BRACKET_NAMES.lower, games: [], wins: 0, draws: 0, losses: 0 },
      similar: { name: ELO_BRACKET_NAMES.similar, games: [], wins: 0, draws: 0, losses: 0 },
      higher: { name: ELO_BRACKET_NAMES.higher, games: [], wins: 0, draws: 0, losses: 0 }
    };

    ratedGames.filter(g => g.opp_elo > 0).forEach(game => {
      const diff = game.opp_elo - game.elo;
      const bracket = getEloBracket(diff);

      brackets[bracket].games.push(game);
      if (game.result === 'W') brackets[bracket].wins++;
      if (game.result === 'D') brackets[bracket].draws++;
      if (game.result === 'L') brackets[bracket].losses++;
    });

    return Object.values(brackets).map(b => ({
      bracket: b.name,
      total: b.games.length,
      wins: b.wins,
      draws: b.draws,
      losses: b.losses,
      winRate: b.games.length > 0 ? ((b.wins / b.games.length) * 100).toFixed(1) : '0.0',
      score: `${(b.wins + b.draws * 0.5).toFixed(1)}/${b.games.length}`
    }));
  }, [ratedGames]);
};

/**
 * Calculate statistics for all openings across colors
 */
export const useAllOpeningsStats = (ratedGames) => {
  return useMemo(() => {
    const ecoStats = {};

    ratedGames.forEach(game => {
      if (!ecoStats[game.eco]) {
        ecoStats[game.eco] = {
          games: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          color: {},
          name: ecoNames[game.eco] || game.eco
        };
      }
      ecoStats[game.eco].games++;
      if (game.result === 'W') ecoStats[game.eco].wins++;
      if (game.result === 'D') ecoStats[game.eco].draws++;
      if (game.result === 'L') ecoStats[game.eco].losses++;

      if (!ecoStats[game.eco].color[game.color]) {
        ecoStats[game.eco].color[game.color] = 0;
      }
      ecoStats[game.eco].color[game.color]++;
    });

    return Object.entries(ecoStats)
      .map(([eco, stats]) => ({
        eco,
        name: stats.name,
        games: stats.games,
        wins: stats.wins,
        draws: stats.draws,
        losses: stats.losses,
        score: `${(stats.wins + stats.draws * 0.5).toFixed(1)}/${stats.games}`,
        winRate: parseFloat(((stats.wins / stats.games) * 100).toFixed(1)),
        asWhite: stats.color['W'] || 0,
        asBlack: stats.color['B'] || 0
      }))
      .sort((a, b) => b.games - a.games);
  }, [ratedGames]);
};

/**
 * Calculate best and worst game results based on performance
 */
export const useBestWorstGames = (ratedGames) => {
  const gamesWithPerformance = useMemo(() => {
    return ratedGames
      .filter(g => g.opp_elo > 0)
      .map((game, idx) => {
        const ratingDiff = game.opp_elo - game.elo;
        const expectedScore = calculateExpectedScore(game.elo, game.opp_elo);
        const actualScore = calculateActualScore(game.result);
        const performance = actualScore - expectedScore;

        return {
          ...game,
          gameNumber: idx + 1,
          ratingDiff,
          performance,
          opening: ecoNames[game.eco] || game.eco
        };
      });
  }, [ratedGames]);

  const bestResults = useMemo(() => {
    return [...gamesWithPerformance]
      .sort((a, b) => b.performance - a.performance)
      .slice(0, 3);
  }, [gamesWithPerformance]);

  const worstResults = useMemo(() => {
    return [...gamesWithPerformance]
      .sort((a, b) => a.performance - b.performance)
      .slice(0, 3);
  }, [gamesWithPerformance]);

  return { bestResults, worstResults };
};

/**
 * Calculate ELO history progression
 */
export const useEloHistory = (ratedGames) => {
  return useMemo(() => {
    const history = [];

    ratedGames.forEach((game, idx) => {
      const expectedScore = calculateExpectedScore(game.elo, game.opp_elo);
      const actualScore = calculateActualScore(game.result);

      history.push({
        game: idx + 1,
        elo: game.elo,
        tournament: game.tournament,
        opponent: game.opp,
        eco: game.eco,
        opening: ecoNames[game.eco] || game.eco,
        expected: expectedScore,
        actual: actualScore,
        diff: actualScore - expectedScore
      });
    });

    return history;
  }, [ratedGames]);
};
