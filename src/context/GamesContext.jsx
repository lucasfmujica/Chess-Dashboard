import React, { createContext, useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { initialGames, playerInfo as initialPlayerInfo } from '../data/initialGames';
import { useGameStats } from '../hooks/useGameStats';
import { useTrendsAndAnalytics } from '../hooks/useTrendsAndAnalytics';
import { useRepertoireAnalysis } from '../hooks/useRepertoireAnalysis';
import { useGoalsAndAchievements } from '../hooks/useGoalsAndAchievements';
import { DEFAULTS } from '../constants/chessConstants';

const GamesContext = createContext(null);

export const useGames = () => {
  const context = useContext(GamesContext);
  if (!context) {
    throw new Error('useGames must be used within a GamesProvider');
  }
  return context;
};

export const GamesProvider = ({ children }) => {
  // Games State (persisted)
  const [games, setGames] = useLocalStorage('chess-dashboard-games', initialGames);
  const playerInfo = initialPlayerInfo;

  // Repertoire State (persisted)
  const [mainRepertoire, setMainRepertoire] = useLocalStorage('chess-dashboard-main-repertoire', {
    white: ['A15', 'A20', 'A13', 'A10'],
    black: ['B35', 'B30', 'B23'],
  });

  // Opening Heroes State (persisted)
  const [openingHeroes, setOpeningHeroes] = useLocalStorage('chess-dashboard-opening-heroes', {});

  // Goals State (persisted)
  const [targetElo, setTargetElo] = useLocalStorage('chess-dashboard-target-elo', DEFAULTS.TARGET_ELO);
  const [targetDate, setTargetDate] = useLocalStorage('chess-dashboard-target-date', DEFAULTS.TARGET_DATE);

  // Training Plan State (persisted)
  const [weeklyPlans, setWeeklyPlans] = useLocalStorage('chess-dashboard-weekly-plans', {});
  const [dailyNotes, setDailyNotes] = useLocalStorage('chess-dashboard-daily-notes', {});
  const [weeklyHours, setWeeklyHours] = useLocalStorage('chess-dashboard-weekly-hours', DEFAULTS.WEEKLY_TRAINING_HOURS);

  // Upcoming Tournaments State (persisted)
  const [upcomingTournaments, setUpcomingTournaments] = useLocalStorage('chess-dashboard-upcoming-tournaments', []);

  const value = {
    // Games
    games,
    setGames,
    playerInfo,

    // Repertoire
    mainRepertoire,
    setMainRepertoire,
    openingHeroes,
    setOpeningHeroes,

    // Goals
    targetElo,
    setTargetElo,
    targetDate,
    setTargetDate,

    // Training
    weeklyPlans,
    setWeeklyPlans,
    dailyNotes,
    setDailyNotes,
    weeklyHours,
    setWeeklyHours,

    // Tournaments
    upcomingTournaments,
    setUpcomingTournaments,
  };

  return <GamesContext.Provider value={value}>{children}</GamesContext.Provider>;
};

GamesProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// Hook to get computed stats (memoized)
export const useComputedStats = (gameFilter) => {
  const { games } = useGames();

  // Filter games based on source
  const filteredGames = useMemo(() => {
    if (gameFilter === 'all') return games;
    if (gameFilter === 'otb') return games.filter(g => g.source === 'otb' || !g.source);
    if (gameFilter === 'online') return games.filter(g => g.source === 'lichess');
    return games;
  }, [games, gameFilter]);

  const ratedGames = useMemo(() => filteredGames.filter(g => g.rated), [filteredGames]);

  // Use custom hooks for complex calculations
  const gameStats = useGameStats(ratedGames);
  const trendsAndAnalytics = useTrendsAndAnalytics(games, ratedGames);

  const { mainRepertoire, targetElo, targetDate } = useGames();
  const { allOpeningsStats } = gameStats;

  const repertoireAnalysis = useRepertoireAnalysis(ratedGames, allOpeningsStats, mainRepertoire);

  const { playerInfo } = useGames();
  const { overallStats, tournamentStats, streaks } = {
    ...gameStats,
    ...trendsAndAnalytics,
  };
  const { monthlyStats } = trendsAndAnalytics;

  const goalsAndAchievements = useGoalsAndAchievements(
    playerInfo,
    ratedGames,
    overallStats,
    tournamentStats,
    allOpeningsStats,
    streaks,
    monthlyStats,
    targetElo,
    targetDate
  );

  return {
    filteredGames,
    ratedGames,
    ...gameStats,
    ...trendsAndAnalytics,
    ...repertoireAnalysis,
    ...goalsAndAchievements,
  };
};
