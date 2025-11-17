import { useMemo } from 'react';
import { ACHIEVEMENT_THRESHOLDS, DATE_CONFIG } from '../constants/chessConstants';

/**
 * Custom hook for goal projections, achievements, and milestones
 */
export const useGoalsAndAchievements = (
  playerInfo,
  ratedGames,
  overallStats,
  tournamentStats,
  allOpeningsStats,
  streaks,
  monthlyStats,
  targetElo,
  targetDate
) => {
  // Goal projections and ELO tracking
  const goalProjections = useMemo(() => {
    const currentElo = playerInfo.current_elo;
    const eloGain = targetElo - currentElo;
    const today = DATE_CONFIG.CURRENT_DATE;
    const target = new Date(targetDate);
    const daysRemaining = Math.max(0, Math.ceil((target - today) / (1000 * 60 * 60 * 24)));
    const monthsRemaining = (daysRemaining / 30).toFixed(1);

    // Calculate weighted ELO changes per tournament
    const eloChanges = [];
    const lagoPueloIndex = monthlyStats.findIndex(t => t.tournament === 'Abierto Lago Puelo');

    for (let i = 1; i < monthlyStats.length; i++) {
      const change = monthlyStats[i].elo - monthlyStats[i - 1].elo;
      const weight = i >= lagoPueloIndex ? 1.0 : 0.5; // Recent tournaments weighted more
      eloChanges.push({ change, weight });
    }

    const totalWeight = eloChanges.reduce((sum, e) => sum + e.weight, 0);
    const avgEloPerTournament = totalWeight > 0
      ? eloChanges.reduce((sum, e) => sum + (e.change * e.weight), 0) / totalWeight
      : 0;

    const tournamentsNeeded = avgEloPerTournament !== 0
      ? Math.ceil(eloGain / avgEloPerTournament)
      : 0;

    // Calculate points needed per tournament (assuming 9 games with K=20)
    const avgOppRating = 1850;
    const expectedScorePerGame = 1 / (1 + Math.pow(10, (avgOppRating - currentElo) / 400));
    const desiredGainPer9 = tournamentsNeeded > 0 ? eloGain / tournamentsNeeded : 0;
    const pointsNeeded = Math.max(0, Math.min(9, (desiredGainPer9 / 20) + (expectedScorePerGame * 9)));

    return {
      currentElo,
      targetElo,
      eloGain,
      daysRemaining,
      monthsRemaining,
      avgEloPerTournament: avgEloPerTournament.toFixed(1),
      tournamentsNeeded,
      pointsNeededPer9Games: pointsNeeded.toFixed(1),
      kFactor: 20,
      onTrack: avgEloPerTournament > 0 && tournamentsNeeded <= parseFloat(monthsRemaining),
      projectedElo: currentElo + (avgEloPerTournament * parseFloat(monthsRemaining)),
    };
  }, [playerInfo.current_elo, targetElo, targetDate, monthlyStats]);

  // Achievements and badges
  const achievements = useMemo(() => {
    const badges = [];

    // Win streaks
    if (streaks.longestWin >= ACHIEVEMENT_THRESHOLDS.WIN_STREAK_MIN) {
      badges.push({
        name: `${streaks.longestWin}-Game Win Streak`,
        icon: '🔥',
        earned: true,
      });
    }

    // Beat higher rated opponents
    const beatenHigher = ratedGames.filter(g => g.result === 'W' && g.opp_elo > g.elo + 100).length;
    if (beatenHigher >= ACHIEVEMENT_THRESHOLDS.GIANT_SLAYER_WINS) {
      badges.push({
        name: `Giant Slayer (${beatenHigher} wins vs +100)`,
        icon: '⚔️',
        earned: true,
      });
    }

    // Performance milestones
    if (overallStats.performanceRating >= 1900) {
      badges.push({
        name: '1900+ Performance Rating',
        icon: '🎯',
        earned: true,
      });
    }

    // Tournament success
    const tournamentWins = tournamentStats.filter(t => t.wins > t.losses).length;
    if (tournamentWins >= ACHIEVEMENT_THRESHOLDS.POSITIVE_TOURNAMENTS_MIN) {
      badges.push({
        name: `${tournamentWins} Positive Tournaments`,
        icon: '🏆',
        earned: true,
      });
    }

    // Opening mastery
    const masterOpenings = allOpeningsStats.filter(
      o => o.games >= ACHIEVEMENT_THRESHOLDS.MASTERY_GAMES &&
        o.winRate >= ACHIEVEMENT_THRESHOLDS.MASTERY_WIN_RATE
    ).length;
    if (masterOpenings >= ACHIEVEMENT_THRESHOLDS.MASTER_OPENINGS_MIN) {
      badges.push({
        name: `${masterOpenings} Mastered Openings (60%+ in 5+)`,
        icon: '📚',
        earned: true,
      });
    }

    // Unbeaten streak
    if (streaks.longestUnbeaten >= ACHIEVEMENT_THRESHOLDS.UNBEATEN_STREAK_MIN) {
      badges.push({
        name: `${streaks.longestUnbeaten}-Game Unbeaten Streak`,
        icon: '🛡️',
        earned: true,
      });
    }

    return badges;
  }, [ratedGames, streaks, overallStats, tournamentStats, allOpeningsStats]);

  // Next milestones to achieve
  const nextMilestones = useMemo(() => {
    const milestones = [];

    // ELO milestones
    const nextEloMilestone = Math.ceil(playerInfo.current_elo / 50) * 50;
    milestones.push({
      title: `Reach ${nextEloMilestone} ELO`,
      current: playerInfo.current_elo,
      target: nextEloMilestone,
      progress: ((playerInfo.current_elo / nextEloMilestone) * 100).toFixed(1),
    });

    // Win rate milestone
    const currentWinRate = parseFloat(overallStats.winRate);
    const nextWinMilestone = Math.ceil(currentWinRate / 5) * 5;
    milestones.push({
      title: `${nextWinMilestone}% Win Rate`,
      current: currentWinRate.toFixed(1),
      target: nextWinMilestone,
      progress: ((currentWinRate / nextWinMilestone) * 100).toFixed(1),
    });

    // Games played milestone
    const nextGamesMilestone = Math.ceil(ratedGames.length / 10) * 10;
    milestones.push({
      title: `${nextGamesMilestone} Rated Games`,
      current: ratedGames.length,
      target: nextGamesMilestone,
      progress: ((ratedGames.length / nextGamesMilestone) * 100).toFixed(1),
    });

    return milestones;
  }, [playerInfo.current_elo, overallStats.winRate, ratedGames.length]);

  return {
    goalProjections,
    achievements,
    nextMilestones,
  };
};
