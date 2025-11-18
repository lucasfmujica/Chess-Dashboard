import { useMemo } from 'react';

export const useStreaksData = (games) => {
  return useMemo(() => {
    if (!games || games.length === 0) {
      return {
        currentWinStreak: 0,
        longestWinStreak: 0,
        currentUnbeatenStreak: 0,
        longestUnbeatenStreak: 0,
        currentLossStreak: 0,
        gamesThisWeek: 0,
        gamesThisMonth: 0,
        avgGamesPerWeek: 0,
        consistency: 0,
        calendar: [],
        weeklyActivity: []
      };
    }

    // Calculate win streaks
    let currentWinStreak = 0;
    let longestWinStreak = 0;
    let tempWinStreak = 0;

    let currentUnbeatenStreak = 0;
    let longestUnbeatenStreak = 0;
    let tempUnbeatenStreak = 0;

    let currentLossStreak = 0;

    // Sort games by date (most recent first)
    const sortedGames = [...games].sort((a, b) => {
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      return dateB - dateA;
    });

    // Calculate current streaks
    for (let i = 0; i < sortedGames.length; i++) {
      const game = sortedGames[i];

      // Win streak
      if (game.result === 'W') {
        if (i === 0 || sortedGames[i - 1].result === 'W') {
          currentWinStreak++;
        } else if (currentWinStreak === 0) {
          break;
        }
      } else {
        if (currentWinStreak > 0) break;
      }

      // Unbeaten streak (W or D)
      if (game.result === 'W' || game.result === 'D') {
        if (i === 0 || sortedGames[i - 1].result === 'W' || sortedGames[i - 1].result === 'D') {
          currentUnbeatenStreak++;
        } else if (currentUnbeatenStreak === 0) {
          break;
        }
      } else {
        if (currentUnbeatenStreak > 0) break;
      }

      // Loss streak
      if (game.result === 'L') {
        if (i === 0 || sortedGames[i - 1].result === 'L') {
          currentLossStreak++;
        } else if (currentLossStreak === 0) {
          break;
        }
      } else {
        if (currentLossStreak > 0) break;
      }
    }

    // Calculate longest streaks
    for (let i = 0; i < games.length; i++) {
      if (games[i].result === 'W') {
        tempWinStreak++;
        longestWinStreak = Math.max(longestWinStreak, tempWinStreak);
      } else {
        tempWinStreak = 0;
      }

      if (games[i].result === 'W' || games[i].result === 'D') {
        tempUnbeatenStreak++;
        longestUnbeatenStreak = Math.max(longestUnbeatenStreak, tempUnbeatenStreak);
      } else {
        tempUnbeatenStreak = 0;
      }
    }

    // Calculate games this week/month
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const gamesThisWeek = games.filter(g => {
      const gameDate = new Date(g.date || 0);
      return gameDate >= oneWeekAgo;
    }).length;

    // Since games don't have calendar dates, count games from the most recent tournament
    const uniqueTournaments = [...new Set(games.map(g => g.tournament))];
    const mostRecentTournament = uniqueTournaments.length > 0 ? uniqueTournaments[uniqueTournaments.length - 1] : null;
    const gamesThisMonth = mostRecentTournament
      ? games.filter(g => g.tournament === mostRecentTournament).length
      : games.length;

    // Calculate weekly activity for the last 12 weeks
    const weeklyActivity = [];
    for (let i = 0; i < 12; i++) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);

      const gamesInWeek = games.filter(g => {
        const gameDate = new Date(g.date || 0);
        return gameDate >= weekStart && gameDate < weekEnd;
      }).length;

      weeklyActivity.unshift({
        week: `Week ${12 - i}`,
        games: gamesInWeek,
        active: gamesInWeek > 0
      });
    }

    const avgGamesPerWeek = weeklyActivity.reduce((sum, w) => sum + w.games, 0) / 12;

    // Calculate consistency score (0-100)
    const activeWeeks = weeklyActivity.filter(w => w.active).length;
    const consistency = Math.round((activeWeeks / 12) * 100);

    // Generate calendar data for last 12 weeks (84 days)
    const calendar = [];
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 83); // Go back 83 days (84 days total including today)

    // Adjust to start from Sunday
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    for (let i = 0; i < 84; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const gamesOnDay = games.filter(g => {
        const gameDate = new Date(g.date || 0);
        return gameDate.toISOString().split('T')[0] === dateStr;
      }).length;

      calendar.push({
        date: dateStr,
        games: gamesOnDay,
        level: gamesOnDay === 0 ? 0 : gamesOnDay === 1 ? 1 : gamesOnDay <= 3 ? 2 : gamesOnDay <= 5 ? 3 : 4
      });
    }

    return {
      currentWinStreak,
      longestWinStreak,
      currentUnbeatenStreak,
      longestUnbeatenStreak,
      currentLossStreak,
      gamesThisWeek,
      gamesThisMonth,
      avgGamesPerWeek: avgGamesPerWeek.toFixed(1),
      consistency,
      calendar,
      weeklyActivity
    };
  }, [games]);
};
