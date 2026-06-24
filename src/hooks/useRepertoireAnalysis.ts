import { useMemo } from 'react';
import { ecoNames } from '../constants/ecoNames';
import { OPENING_THRESHOLDS } from '../constants/chessConstants';
import type { Game, OpeningStat, Repertoire, PlayerColor } from '../types/chess';

interface OpponentOpeningBucket {
  count: number;
  wins: number;
}

interface OpeningRecommendation {
  type: 'needs_work' | 'opponent_preparation';
  opening: string;
  eco: string;
  reason: string;
  priority: 'high' | 'medium';
}

/**
 * Custom hook for opening repertoire analysis and recommendations.
 */
export const useRepertoireAnalysis = (
  ratedGames: Game[],
  allOpeningsStats: OpeningStat[],
  mainRepertoire: Repertoire
) => {
  // Opening repertoire analysis by color
  const openingRepertoireAnalysis = useMemo(() => {
    const analyzeColor = (color: PlayerColor, repertoire: string[]) => {
      const colorGames = ratedGames.filter(g => g.color === color);

      return allOpeningsStats
        .filter(o => (color === 'W' ? o.asWhite > 0 : o.asBlack > 0))
        .map(opening => {
          const isMain = repertoire.includes(opening.eco);
          const games = color === 'W' ? opening.asWhite : opening.asBlack;
          const stats = colorGames.filter(g => g.eco === opening.eco);
          const wins = stats.filter(g => g.result === 'W').length;
          const draws = stats.filter(g => g.result === 'D').length;
          const losses = stats.filter(g => g.result === 'L').length;
          const winRate = games > 0 ? ((wins / games) * 100).toFixed(1) : '0.0';

          return {
            ...opening,
            isMain,
            games,
            wins,
            draws,
            losses,
            winRate: parseFloat(winRate),
            needsWork:
              games >= OPENING_THRESHOLDS.MIN_GAMES_FOR_ANALYSIS &&
              parseFloat(winRate) < OPENING_THRESHOLDS.LOW_SUCCESS_RATE,
          };
        })
        .sort((a, b) => b.games - a.games);
    };

    return {
      white: analyzeColor('W', mainRepertoire.white),
      black: analyzeColor('B', mainRepertoire.black),
    };
  }, [ratedGames, allOpeningsStats, mainRepertoire]);

  // Opening recommendations based on performance
  const openingRecommendations = useMemo(() => {
    const recommendations: OpeningRecommendation[] = [];

    // Find openings that need work
    [...openingRepertoireAnalysis.white, ...openingRepertoireAnalysis.black]
      .filter(o => o.needsWork)
      .forEach(opening => {
        recommendations.push({
          type: 'needs_work',
          opening: opening.name,
          eco: opening.eco,
          reason: `Low success rate (${opening.winRate}%) in ${opening.games} games`,
          priority: 'high',
        });
      });

    // Find frequently faced openings as Black with poor results
    const blackOpenings = ratedGames.filter(g => g.color === 'B');
    const opponentOpenings: Record<string, OpponentOpeningBucket> = {};

    blackOpenings.forEach(g => {
      if (!opponentOpenings[g.eco]) {
        opponentOpenings[g.eco] = { count: 0, wins: 0 };
      }
      opponentOpenings[g.eco].count++;
      if (g.result === 'W') opponentOpenings[g.eco].wins++;
    });

    Object.entries(opponentOpenings)
      .filter(([, stats]) => stats.count >= 2 && stats.wins / stats.count < 0.4)
      .forEach(([eco, stats]) => {
        recommendations.push({
          type: 'opponent_preparation',
          opening: ecoNames[eco] || eco,
          eco,
          reason: `Opponents play this ${stats.count} times, you score ${((stats.wins / stats.count) * 100).toFixed(0)}%`,
          priority: 'medium',
        });
      });

    return recommendations;
  }, [openingRepertoireAnalysis, ratedGames]);

  return {
    openingRepertoireAnalysis,
    openingRecommendations,
  };
};
