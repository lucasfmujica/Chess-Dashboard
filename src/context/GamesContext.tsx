import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { initialGames, playerInfo as initialPlayerInfo, initialOpenings } from '../data/initialGames';
import { useGameStats } from '../hooks/useGameStats';
import { useTrendsAndAnalytics } from '../hooks/useTrendsAndAnalytics';
import { useRepertoireAnalysis } from '../hooks/useRepertoireAnalysis';
import { useGoalsAndAchievements } from '../hooks/useGoalsAndAchievements';
import { DEFAULTS } from '../constants/chessConstants';
import { seedAnalysisCache } from '../hooks/useGameAnalysis';
import {
  fetchGames,
  postGames,
  patchGamePgn,
  deleteGamesBySource,
  fetchProfile,
  fetchRepertoire,
  putRepertoire,
  fetchOpeningHeroes,
  putOpeningHeroes,
  fetchAnalyses,
  postMigrate,
} from '../api/client';
import type { Game, PlayerInfo, Repertoire, UpcomingTournament, AnnotatedGame, OpeningCard } from '../types/chess';
import type { WeeklyPlans } from '../types/training';
import type { GameFilter } from './UIContext';
import { LoadingSpinner } from '../components/LoadingSkeleton';

const MIGRATION_FLAG_KEY = 'chess-dashboard-migrated-to-db';

/** A localStorage-backed setter (value or updater fn). */
type Updater<T> = (value: T | ((prev: T) => T)) => void;

interface GamesContextValue {
  games: Game[];
  playerInfo: PlayerInfo;

  /** Merge newly-synced Lichess games in (upserts by Lichess game id). */
  syncLichessGames: (newGames: Game[]) => Promise<void>;
  removeLichessGames: () => Promise<void>;
  importPgnGames: (newGames: Game[]) => Promise<void>;
  addManualGame: (game: Game) => Promise<void>;
  updateGamePgn: (id: string, pgn: string | undefined) => Promise<Game>;

  mainRepertoire: Repertoire;
  setMainRepertoire: (value: Repertoire) => Promise<void>;
  openingHeroes: Record<string, string[]>;
  setOpeningHeroes: (value: Record<string, string[]>) => Promise<void>;

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

  /** User overrides: tournament name -> city key (see constants/locations). */
  tournamentLocations: Record<string, string>;
  setTournamentLocations: Updater<Record<string, string>>;
}

const GamesContext = createContext<GamesContextValue | null>(null);

export const useGames = (): GamesContextValue => {
  const context = useContext(GamesContext);
  if (!context) {
    throw new Error('useGames must be used within a GamesProvider');
  }
  return context;
};

/** Reads localStorage, tolerating environments where it's unavailable or throws (privacy mode, etc). */
const safeGetItem = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSetItem = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* best-effort */
  }
};

/** Reads the legacy localStorage keys this app used before the database existed. */
const readLegacyLocalStorage = () => {
  const parse = <T,>(key: string): T | undefined => {
    const raw = safeGetItem(key);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  };

  return {
    games: parse<Game[]>('chess-dashboard-games') ?? initialGames,
    mainRepertoire: parse<Repertoire>('chess-dashboard-main-repertoire'),
    openingHeroes: parse<Record<string, string[]>>('chess-dashboard-opening-heroes'),
    annotatedGames: parse<AnnotatedGame[]>('chessDashboard_annotatedGames'),
    openingFlashcards: parse<OpeningCard[]>('chessDashboard_openings') ?? initialOpenings,
  };
};

export const GamesProvider = ({ children }: { children: ReactNode }) => {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [games, setGamesState] = useState<Game[]>([]);
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo>(initialPlayerInfo);
  const [mainRepertoire, setMainRepertoireState] = useState<Repertoire>({ white: [], black: [] });
  const [openingHeroes, setOpeningHeroesState] = useState<Record<string, string[]>>({});

  // Goals State (persisted locally — planning data, not "chess data" a query would target)
  const [targetElo, setTargetElo] = useLocalStorage<number>('chess-dashboard-target-elo', DEFAULTS.TARGET_ELO);
  const [targetDate, setTargetDate] = useLocalStorage<string>('chess-dashboard-target-date', DEFAULTS.TARGET_DATE);

  // Training Plan State (persisted locally)
  const [weeklyPlans, setWeeklyPlans] = useLocalStorage<WeeklyPlans>('chess-dashboard-weekly-plans', {});
  const [dailyNotes, setDailyNotes] = useLocalStorage<Record<string, string>>('chess-dashboard-daily-notes', {});
  const [weeklyHours, setWeeklyHours] = useLocalStorage<number>('chess-dashboard-weekly-hours', DEFAULTS.WEEKLY_TRAINING_HOURS);

  // Upcoming Tournaments State (persisted locally)
  const [upcomingTournaments, setUpcomingTournaments] = useLocalStorage<UpcomingTournament[]>('chess-dashboard-upcoming-tournaments', []);

  // Per-tournament location overrides (persisted locally)
  const [tournamentLocations, setTournamentLocations] = useLocalStorage<Record<string, string>>('chess-dashboard-tournament-locations', {});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!safeGetItem(MIGRATION_FLAG_KEY)) {
          const legacy = readLegacyLocalStorage();
          await postMigrate({
            games: legacy.games,
            mainRepertoire: legacy.mainRepertoire,
            openingHeroes: legacy.openingHeroes,
            annotatedGames: legacy.annotatedGames,
            openingFlashcards: legacy.openingFlashcards,
            playerInfo: initialPlayerInfo,
          });
          safeSetItem(MIGRATION_FLAG_KEY, '1');
        }

        const [gamesData, profileData, repertoireData, heroesData, analysesData] = await Promise.all([
          fetchGames(),
          fetchProfile(),
          fetchRepertoire(),
          fetchOpeningHeroes(),
          fetchAnalyses(),
        ]);
        if (cancelled) return;

        setGamesState(gamesData);
        setPlayerInfo(profileData ?? initialPlayerInfo);
        setMainRepertoireState(repertoireData);
        setOpeningHeroesState(heroesData);
        seedAnalysisCache(analysesData);
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load data');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const refetchGames = async () => setGamesState(await fetchGames());

  const syncLichessGames = async (newGames: Game[]) => {
    await postGames(newGames);
    await refetchGames();
  };

  const removeLichessGames = async () => {
    await deleteGamesBySource('lichess');
    await refetchGames();
  };

  const importPgnGames = async (newGames: Game[]) => {
    await postGames(newGames);
    await refetchGames();
  };

  const addManualGame = async (game: Game) => {
    await postGames([game]);
    await refetchGames();
  };

  const updateGamePgn = async (id: string, pgn: string | undefined) => {
    const updated = await patchGamePgn(id, pgn);
    await refetchGames();
    return updated;
  };

  const setMainRepertoire = async (value: Repertoire) => {
    setMainRepertoireState(await putRepertoire(value));
  };

  const setOpeningHeroes = async (value: Record<string, string[]>) => {
    setOpeningHeroesState(await putOpeningHeroes(value));
  };

  const value: GamesContextValue = {
    games,
    playerInfo,
    syncLichessGames,
    removeLichessGames,
    importPgnGames,
    addManualGame,
    updateGamePgn,
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
    tournamentLocations,
    setTournamentLocations,
  };

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-6 text-center">
        <p className="text-fg font-medium">Couldn't load data from the database.</p>
        <p className="text-fg-muted text-sm max-w-md">{loadError}</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <LoadingSpinner size="lg" color="indigo" />
        <p className="text-fg-muted">Loading your games…</p>
      </div>
    );
  }

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
