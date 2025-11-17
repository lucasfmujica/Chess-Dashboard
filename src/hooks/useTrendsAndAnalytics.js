import { useMemo } from 'react';
import { TOURNAMENT_DATA, TOURNAMENT_ORDER } from '../constants/chessConstants';
import { calculateGameStats } from '../utils/eloCalculations';

/**
 * Custom hook for trends, streaks, and time-based analytics
 */
export const useTrendsAndAnalytics = (games, ratedGames) => {
  // Monthly/Tournament statistics over time
  const monthlyStats = useMemo(() => {
    const byMonth = {};

    TOURNAMENT_ORDER.forEach((tournament, idx) => {
      const tournamentGames = ratedGames.filter(g => g.tournament === tournament);
      if (tournamentGames.length === 0) return;

      const stats = calculateGameStats(tournamentGames);
      const tournamentData = TOURNAMENT_DATA[tournament] || {};

      byMonth[tournament] = {
        tournament,
        order: idx,
        games: stats.total,
        wins: stats.wins,
        draws: stats.draws,
        losses: stats.losses,
        winRate: parseFloat(stats.winRate),
        performanceRating: stats.performanceRating,
        elo: tournamentGames[0].elo,
        eloChange: tournamentData.eloChange || 0,
      };
    });

    return Object.values(byMonth).sort((a, b) => a.order - b.order);
  }, [ratedGames]);

  // Recent form statistics
  const formStats = useMemo(() => {
    const calculateForm = (lastN) => {
      const recentGames = ratedGames.slice(-lastN);
      const wins = recentGames.filter(g => g.result === 'W').length;
      const draws = recentGames.filter(g => g.result === 'D').length;
      const score = wins + draws * 0.5;

      return {
        games: recentGames.length,
        score: `${score.toFixed(1)}/${recentGames.length}`,
        percentage: ((score / recentGames.length) * 100).toFixed(1),
        details: recentGames.map(g => g.result).reverse(),
      };
    };

    return {
      last5: calculateForm(5),
      last10: calculateForm(10),
    };
  }, [ratedGames]);

  // Win/loss streaks
  const streaks = useMemo(() => {
    let currentStreak = { type: null, count: 0 };
    let longestWinStreak = 0;
    let longestUnbeatenStreak = 0;
    let currentWinStreak = 0;
    let currentUnbeatenStreak = 0;

    ratedGames.forEach(game => {
      if (game.result === 'W') {
        currentWinStreak++;
        currentUnbeatenStreak++;
        longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
        longestUnbeatenStreak = Math.max(longestUnbeatenStreak, currentUnbeatenStreak);
      } else if (game.result === 'D') {
        currentWinStreak = 0;
        currentUnbeatenStreak++;
        longestUnbeatenStreak = Math.max(longestUnbeatenStreak, currentUnbeatenStreak);
      } else {
        currentWinStreak = 0;
        currentUnbeatenStreak = 0;
      }
    });

    // Calculate current streak
    for (let i = ratedGames.length - 1; i >= 0; i--) {
      const game = ratedGames[i];
      if (currentStreak.type === null) {
        currentStreak.type = game.result === 'L' ? 'loss' : game.result === 'W' ? 'win' : 'unbeaten';
        currentStreak.count = 1;
      } else if (
        (currentStreak.type === 'win' && game.result === 'W') ||
        (currentStreak.type === 'loss' && game.result === 'L') ||
        (currentStreak.type === 'unbeaten' && (game.result === 'W' || game.result === 'D'))
      ) {
        currentStreak.count++;
      } else {
        break;
      }
    }

    return {
      current: currentStreak,
      longestWin: longestWinStreak,
      longestUnbeaten: longestUnbeatenStreak,
    };
  }, [ratedGames]);

  // Time of day statistics
  const timeOfDayStats = useMemo(() => {
    const timeSlots = {
      'Morning (9-12)': { games: [], wins: 0, draws: 0, losses: 0 },
      'Afternoon (13-17)': { games: [], wins: 0, draws: 0, losses: 0 },
      'Evening (18-20)': { games: [], wins: 0, draws: 0, losses: 0 },
    };

    games.forEach(game => {
      if (!game.time) return;

      const hour = parseInt(game.time.split(':')[0]);
      let slot;

      if (hour >= 9 && hour <= 12) slot = 'Morning (9-12)';
      else if (hour >= 13 && hour <= 17) slot = 'Afternoon (13-17)';
      else if (hour >= 18 && hour <= 20) slot = 'Evening (18-20)';

      if (slot && timeSlots[slot]) {
        timeSlots[slot].games.push(game);
        if (game.result === 'W') timeSlots[slot].wins++;
        else if (game.result === 'D') timeSlots[slot].draws++;
        else if (game.result === 'L') timeSlots[slot].losses++;
      }
    });

    return Object.entries(timeSlots)
      .map(([time, data]) => ({
        time,
        total: data.games.length,
        wins: data.wins,
        draws: data.draws,
        losses: data.losses,
        score: data.games.length > 0 ? ((data.wins + data.draws * 0.5) / data.games.length * 100).toFixed(1) : 0,
        winRate: data.games.length > 0 ? ((data.wins / data.games.length) * 100).toFixed(1) : 0,
      }))
      .filter(slot => slot.total > 0);
  }, [games]);

  // Tournament comparison data
  const tournamentComparison = useMemo(() => {
    const ratedTournaments = games
      .filter(g => g.rated)
      .reduce((acc, game) => {
        if (!acc[game.tournament]) {
          acc[game.tournament] = [];
        }
        acc[game.tournament].push(game);
        return acc;
      }, {});

    return Object.entries(ratedTournaments).map(([name, tournamentGames]) => {
      const wins = tournamentGames.filter(g => g.result === 'W').length;
      const draws = tournamentGames.filter(g => g.result === 'D').length;
      const losses = tournamentGames.filter(g => g.result === 'L').length;
      const score = ((wins + draws * 0.5) / tournamentGames.length * 100).toFixed(1);

      const oppElos = tournamentGames.filter(g => g.opp_elo > 0).map(g => g.opp_elo);
      const avgOppElo = oppElos.length > 0
        ? Math.round(oppElos.reduce((a, b) => a + b, 0) / oppElos.length)
        : 0;

      const tournamentData = TOURNAMENT_DATA[name] || {};
      const playerElo = tournamentGames[0]?.elo || 0;

      return {
        name,
        games: tournamentGames.length,
        wins,
        draws,
        losses,
        score: parseFloat(score),
        avgOppElo,
        playerElo,
        eloChange: tournamentData.eloChange || 0,
        performance: tournamentData.performanceRating || null,
      };
    });
  }, [games]);

  return {
    monthlyStats,
    formStats,
    streaks,
    timeOfDayStats,
    tournamentComparison,
  };
};
