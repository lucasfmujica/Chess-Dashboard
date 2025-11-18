import { useMemo } from 'react';

export const useTournamentStats = (tournamentStats) => {
  return useMemo(() => {
    if (!tournamentStats || tournamentStats.length === 0) {
      return {
        totalTournaments: 0,
        totalGames: 0,
        bestPerformance: 0,
        averageScore: 0,
        totalWins: 0,
        totalDraws: 0,
        totalLosses: 0
      };
    }

    const totalTournaments = tournamentStats.length;
    const totalGames = tournamentStats.reduce((sum, t) => sum + t.total, 0);
    const bestPerformance = Math.max(...tournamentStats.map(t => t.performanceRating));
    const totalWins = tournamentStats.reduce((sum, t) => sum + t.wins, 0);
    const totalDraws = tournamentStats.reduce((sum, t) => sum + t.draws, 0);
    const totalLosses = tournamentStats.reduce((sum, t) => sum + t.losses, 0);
    const averageScore = ((totalWins + (totalDraws * 0.5)) / totalGames * 100).toFixed(1);

    return {
      totalTournaments,
      totalGames,
      bestPerformance,
      averageScore,
      totalWins,
      totalDraws,
      totalLosses
    };
  }, [tournamentStats]);
};
