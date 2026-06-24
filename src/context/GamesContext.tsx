import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { initialGames, playerInfo as initialPlayerInfo } from '../data/initialGames';
import { useGameStats } from '../hooks/useGameStats';
import { useTrendsAndAnalytics } from '../hooks/useTrendsAndAnalytics';
import { useRepertoireAnalysis } from '../hooks/useRepertoireAnalysis';
import { useGoalsAndAchievements } from '../hooks/useGoalsAndAchievements';
import { DEFAULTS } from '../constants/chessConstants';
import type { Game, PlayerInfo, Repertoire, UpcomingTournament } from '../types/chess';
import type { WeeklyPlans } from '../types/training';
import type { GameFilter } from './UIContext';

/** A localStorage-backed setter (value or updater fn). */
type Updater<T> = (value: T | ((prev: T) => T)) => void;

interface GamesContextValue {
  games: Game[];
  setGames: Updater<Game[]>;
  playerInfo: PlayerInfo;

  mainRepertoire: Repertoire;
  setMainRepertoire: Updater<Repertoire>;
  openingHeroes: Record<string, string[]>;
  setOpeningHeroes: Updater<Record<string, string[]>>;

  targetElo: number;
  setTargetElo: Updater<number>;
  targetDate: string;
  setTargetDate: Updater<string>;

  weeklyPlans: WeeklyPlans;
  setWeeklyPlans: Updater<WeeklyPlans>;
  dailyNotes: Record<string, string>;
  setDailyNotes: Updater<Record<string, string>>;
  weeklyHours: number;
  setWeeklyHours: Updater<number>;

  upcomingTournaments: UpcomingTournament[];
  setUpcomingTournaments: Updater<UpcomingTournament[]>;
}

const GamesContext = createContext<GamesContextValue | null>(null);

export const useGames = (): GamesContextValue => {
  const context = useContext(GamesContext);
  if (!context) {
    throw new Error('useGames must be used within a GamesProvider');
  }
  return context;
};

export const GamesProvider = ({ children }: { children: ReactNode }) => {
  // Games State (persisted)
  const [games, setGames] = useLocalStorage<Game[]>('chess-dashboard-games', initialGames as Game[]);
  const playerInfo = initialPlayerInfo as PlayerInfo;

  // Repertoire State (persisted)
  const [mainRepertoire, setMainRepertoire] = useLocalStorage<Repertoire>('chess-dashboard-main-repertoire', {
    white: ['A15', 'A20', 'A13', 'A10'],
    black: ['B35', 'B30', 'B23'],
  });

  // Opening Heroes State (persisted)
  const [openingHeroes, setOpeningHeroes] = useLocalStorage<Record<string, string[]>>('chess-dashboard-opening-heroes', {});

  // Goals State (persisted)
  const [targetElo, setTargetElo] = useLocalStorage<number>('chess-dashboard-target-elo', DEFAULTS.TARGET_ELO);
  const [targetDate, setTargetDate] = useLocalStorage<string>('chess-dashboard-target-date', DEFAULTS.TARGET_DATE);

  // Training Plan State (persisted)
  const [weeklyPlans, setWeeklyPlans] = useLocalStorage<WeeklyPlans>('chess-dashboard-weekly-plans', {});
  const [dailyNotes, setDailyNotes] = useLocalStorage<Record<string, string>>('chess-dashboard-daily-notes', {});
  const [weeklyHours, setWeeklyHours] = useLocalStorage<number>('chess-dashboard-weekly-hours', DEFAULTS.WEEKLY_TRAINING_HOURS);

  // Upcoming Tournaments State (persisted)
  const [upcomingTournaments, setUpcomingTournaments] = useLocalStorage<UpcomingTournament[]>('chess-dashboard-upcoming-tournaments', []);

  const value: GamesContextValue = {
    games,
    setGames,
    playerInfo,
    mainRepertoire,
    setMainRepertoire,
    openingHeroes,
    setOpeningHeroes,
    targetElo,
    setTargetElo,
    targetDate,
    setTargetDate,
    weeklyPlans,
    setWeeklyPlans,
    dailyNotes,
    setDailyNotes,
    weeklyHours,
    setWeeklyHours,
    upcomingTournaments,
    setUpcomingTournaments,
  };

  return <GamesContext.Provider value={value}>{children}</GamesContext.Provider>;
};

// Hook to get computed stats (memoized)
export const useComputedStats = (gameFilter: GameFilter) => {
  const { games, mainRepertoire, targetElo, targetDate, playerInfo } = useGames();

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

  const { allOpeningsStats, overallStats, tournamentStats } = gameStats;
  const { streaks, monthlyStats } = trendsAndAnalytics;

  const repertoireAnalysis = useRepertoireAnalysis(ratedGames, allOpeningsStats, mainRepertoire);

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
