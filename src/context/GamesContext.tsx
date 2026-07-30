import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { initialGames, playerInfo as initialPlayerInfo } from '../data/initialGames';
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
  refreshProfileFromFide,
  fetchRepertoire,
  putRepertoire,
  fetchOpeningHeroes,
  putOpeningHeroes,
  fetchTournamentLocations,
  putTournamentLocations,
  fetchAnalyses,
  postAnalysis,
  postMigrate,
  fetchTournaments,
  postTournament,
  putTournament,
  deleteTournament,
  fetchRepertoireLines,
  patchGameRepertoireMatches,
} from '../api/client';
import { changedRepertoireMatches } from '../utils/repertoireMatchRun';
import { localDateKey } from '../utils/localDate';
import type { Game, PlayerInfo, Repertoire, Tournament, AnnotatedGame } from '../types/chess';
import type { GameAnalysis } from '../engine/analyzeGame';
import type { WeeklyPlans } from '../types/training';
import { useUI, type GameFilter } from './UIContext';
import { LoadingSpinner } from '../components/LoadingSkeleton';

const MIGRATION_FLAG_KEY = 'chess-dashboard-migrated-to-db';
// Separate flag: the Stockfish analysis cache uses its own dynamic keys
// (one per analysed game), so it's migrated independently of the main
// games/repertoire/etc. migration above, and via postAnalysis directly
// (not postMigrate) so it isn't blocked by that endpoint's "games table
// already has data" idempotency guard on a retry.
const ANALYSIS_MIGRATION_FLAG_KEY = 'chess-dashboard-analyses-migrated-to-db';
// Also independent, for the same reason: added after the main migration
// already ran for existing users, so it can't ride on that endpoint's guard.
const LOCATIONS_MIGRATION_FLAG_KEY = 'chess-dashboard-tournament-locations-migrated-to-db';
// Same again, for the upcoming-tournament list.
const UPCOMING_MIGRATION_FLAG_KEY = 'chess-dashboard-upcoming-tournaments-migrated-to-db';

/** The localStorage shape upcoming tournaments used before they had a table. */
interface LegacyUpcomingTournament {
  name: string;
  club?: string;
  province?: string;
  startDate?: string;
  endDate?: string;
  chessResultsLink?: string;
}

/** A localStorage-backed setter (value or updater fn). */
type Updater<T> = (value: T | ((prev: T) => T)) => void;

interface GamesContextValue {
  games: Game[];
  playerInfo: PlayerInfo;
  /** Re-read the current rating from the FIDE profile page. */
  syncFideRating: () => Promise<void>;

  /** Merge newly-synced Lichess games in (upserts by Lichess game id). */
  syncLichessGames: (newGames: Game[]) => Promise<void>;
  removeLichessGames: () => Promise<void>;
  importPgnGames: (newGames: Game[]) => Promise<void>;
  addManualGame: (game: Game) => Promise<void>;
  updateGamePgn: (id: string, pgn: string | undefined) => Promise<Game>;
  /** Reload games from the API — for writes made outside this context. */
  refetchGames: () => Promise<void>;

  mainRepertoire: Repertoire;
  setMainRepertoire: (value: Repertoire) => Promise<void>;
  openingHeroes: Record<string, string[]>;
  setOpeningHeroes: (value: Record<string, string[]>) => Promise<void>;
  /** User overrides: tournament name -> city key (see constants/locations). */
  tournamentLocations: Record<string, string>;
  setTournamentLocations: (value: Record<string, string>) => Promise<void>;

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

  /** Every tournament, played and upcoming, newest first. */
  tournaments: Tournament[];
  /** Those starting today or later — the ones prep can still be done for. */
  upcomingTournaments: Tournament[];
  addTournament: (t: Partial<Tournament>) => Promise<void>;
  updateTournament: (id: string, t: Partial<Tournament>) => Promise<void>;
  removeTournament: (id: string) => Promise<void>;
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
  };
};

/** Uploads any localStorage-cached Stockfish analyses (chess-dashboard-analysis-<hash>-d<depth>) to the DB, once. */
const migrateAnalysisCacheIfNeeded = async () => {
  if (safeGetItem(ANALYSIS_MIGRATION_FLAG_KEY)) return;
  try {
    const keys = Object.keys(window.localStorage).filter(k => /^chess-dashboard-analysis-.+-d\d+$/.test(k));
    for (const key of keys) {
      const match = key.match(/^chess-dashboard-analysis-(.+)-d\d+$/);
      const pgnHash = match?.[1];
      const raw = safeGetItem(key);
      if (!pgnHash || !raw) continue;
      try {
        const analysis = JSON.parse(raw) as GameAnalysis;
        await postAnalysis(pgnHash, analysis);
      } catch {
        /* skip a malformed cache entry, keep going */
      }
    }
  } catch {
    /* localStorage unavailable; nothing to migrate */
  }
  safeSetItem(ANALYSIS_MIGRATION_FLAG_KEY, '1');
};

/**
 * Uploads the localStorage upcoming-tournament list to the `tournaments`
 * table, once.
 *
 * They were localStorage-only, with `Date.now()` ids, which meant no
 * serverless function could read them — so nothing could be prepared from a
 * tournament automatically. The table already had every field but `province`.
 * Upserting on name means a tournament that was also imported from a
 * crosstable merges instead of duplicating.
 */
const migrateUpcomingTournamentsIfNeeded = async () => {
  if (safeGetItem(UPCOMING_MIGRATION_FLAG_KEY)) return;
  const raw = safeGetItem('chess-dashboard-upcoming-tournaments');
  if (raw) {
    try {
      const legacy = JSON.parse(raw) as LegacyUpcomingTournament[];
      for (const t of Array.isArray(legacy) ? legacy : []) {
        if (!t?.name?.trim()) continue;
        await postTournament({
          name: t.name.trim(),
          startDate: t.startDate || undefined,
          endDate: t.endDate || undefined,
          club: t.club || undefined,
          province: t.province || undefined,
          chessResultsUrl: t.chessResultsLink || undefined,
        });
      }
    } catch {
      /* malformed cache entry, nothing to migrate */
    }
  }
  safeSetItem(UPCOMING_MIGRATION_FLAG_KEY, '1');
};

/** Uploads the localStorage tournament->city override map to the DB, once. */
const migrateTournamentLocationsIfNeeded = async () => {
  if (safeGetItem(LOCATIONS_MIGRATION_FLAG_KEY)) return;
  const raw = safeGetItem('chess-dashboard-tournament-locations');
  if (raw) {
    try {
      const locations = JSON.parse(raw) as Record<string, string>;
      if (locations && Object.keys(locations).length > 0) {
        await putTournamentLocations(locations);
      }
    } catch {
      /* malformed cache entry, nothing to migrate */
    }
  }
  safeSetItem(LOCATIONS_MIGRATION_FLAG_KEY, '1');
};

export const GamesProvider = ({ children }: { children: ReactNode }) => {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [games, setGamesState] = useState<Game[]>([]);
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo>(initialPlayerInfo);
  const [mainRepertoire, setMainRepertoireState] = useState<Repertoire>({ white: [], black: [] });
  const [openingHeroes, setOpeningHeroesState] = useState<Record<string, string[]>>({});
  const [tournamentLocations, setTournamentLocationsState] = useState<Record<string, string>>({});

  // Goals State (persisted locally — planning data, not "chess data" a query would target)
  const [targetElo, setTargetElo] = useLocalStorage<number>('chess-dashboard-target-elo', DEFAULTS.TARGET_ELO);
  const [targetDate, setTargetDate] = useLocalStorage<string>('chess-dashboard-target-date', DEFAULTS.TARGET_DATE);

  // Training Plan State (persisted locally)
  const [weeklyPlans, setWeeklyPlans] = useLocalStorage<WeeklyPlans>('chess-dashboard-weekly-plans', {});
  const [dailyNotes, setDailyNotes] = useLocalStorage<Record<string, string>>('chess-dashboard-daily-notes', {});
  const [weeklyHours, setWeeklyHours] = useLocalStorage<number>('chess-dashboard-weekly-hours', DEFAULTS.WEEKLY_TRAINING_HOURS);

  // Tournaments, played and upcoming, in one table. Upcoming is not a flag —
  // it is derived from the start date, so an event stops being "upcoming" the
  // day it starts without anyone having to move it.
  const [tournaments, setTournamentsState] = useState<Tournament[]>([]);

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
            playerInfo: initialPlayerInfo,
          });
          safeSetItem(MIGRATION_FLAG_KEY, '1');
        }
        await migrateAnalysisCacheIfNeeded();
        await migrateTournamentLocationsIfNeeded();
        await migrateUpcomingTournamentsIfNeeded();

        const [gamesData, profileData, repertoireData, heroesData, locationsData, analysesData, tournamentsData] = await Promise.all([
          fetchGames(),
          fetchProfile(),
          fetchRepertoire(),
          fetchOpeningHeroes(),
          fetchTournamentLocations(),
          fetchAnalyses(),
          fetchTournaments(),
        ]);
        if (cancelled) return;

        setGamesState(gamesData);
        setPlayerInfo(profileData ?? initialPlayerInfo);
        setMainRepertoireState(repertoireData);
        setOpeningHeroesState(heroesData);
        setTournamentLocationsState(locationsData);
        setTournamentsState(tournamentsData);
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

  /**
   * Reload games, then link any that now follow a prepared line.
   *
   * Matching used to happen only when someone opened Repertorio -> Mapa and
   * pressed a button, which is why every row in the database sat with a null
   * `repertoire_line_id`. Running it on the import path means a game is linked
   * by the time it first appears in the app.
   *
   * Deliberately non-fatal: a repertoire that fails to load must not make an
   * otherwise successful import look like it failed. The games are already
   * saved at this point, and the backfill script can always catch up.
   */
  const refetchAndLinkGames = async () => {
    const saved = await fetchGames();
    setGamesState(saved);
    try {
      const lines = await fetchRepertoireLines();
      if (lines.length === 0) return;
      const { matches } = changedRepertoireMatches(saved, lines);
      if (matches.length === 0) return;
      await patchGameRepertoireMatches(matches);
      setGamesState(await fetchGames());
    } catch (err) {
      console.error('Repertoire linking skipped after import:', err);
    }
  };

  const syncLichessGames = async (newGames: Game[]) => {
    await postGames(newGames);
    await refetchAndLinkGames();
  };

  const removeLichessGames = async () => {
    await deleteGamesBySource('lichess');
    await refetchGames();
  };

  const importPgnGames = async (newGames: Game[]) => {
    await postGames(newGames);
    await refetchAndLinkGames();
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

  const addTournament = async (t: Partial<Tournament>) => {
    const saved = await postTournament(t);
    // Upserts on name, so a re-add replaces rather than appending a twin.
    setTournamentsState(prev => [saved, ...prev.filter(x => x.id !== saved.id)]);
  };

  const updateTournament = async (id: string, t: Partial<Tournament>) => {
    const saved = await putTournament(id, t);
    setTournamentsState(prev => prev.map(x => (x.id === id ? saved : x)));
  };

  const removeTournament = async (id: string) => {
    await deleteTournament(id);
    setTournamentsState(prev => prev.filter(x => x.id !== id));
  };

  const setMainRepertoire = async (value: Repertoire) => {
    setMainRepertoireState(await putRepertoire(value));
  };

  const setOpeningHeroes = async (value: Record<string, string[]>) => {
    setOpeningHeroesState(await putOpeningHeroes(value));
  };

  /**
   * Ask the server to re-read the FIDE profile. The weekly cron does this on
   * its own; this is the "the new list is out today" button.
   */
  const syncFideRating = async () => {
    const result = await refreshProfileFromFide();
    if (result.profile) setPlayerInfo(result.profile);
  };

  const setTournamentLocations = async (value: Record<string, string>) => {
    setTournamentLocationsState(await putTournamentLocations(value));
  };

  // "Upcoming" is derived, not stored: an event with no start date can't be
  // prepared for and isn't upcoming, it's just unscheduled.
  const upcomingTournaments = useMemo(() => {
    const today = localDateKey();
    return tournaments
      .filter(t => t.startDate && t.startDate >= today)
      .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''));
  }, [tournaments]);

  const value: GamesContextValue = {
    games,
    playerInfo,
    syncFideRating,
    syncLichessGames,
    removeLichessGames,
    importPgnGames,
    addManualGame,
    updateGamePgn,
    refetchGames,
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
    tournaments,
    upcomingTournaments,
    addTournament,
    updateTournament,
    removeTournament,
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

/**
 * Apply the header's source filter (OTB / Online / All). Games saved before
 * the column existed have no `source` and count as OTB.
 */
export const filterGamesBySource = (games: Game[], gameFilter: GameFilter): Game[] => {
  if (gameFilter === 'otb') return games.filter(g => (g.source ?? 'otb') === 'otb');
  if (gameFilter === 'online') return games.filter(g => g.source === 'lichess');
  return games;
};

/**
 * The games the header filter currently selects. Any panel that shows games or
 * stats derived from them should read this rather than the raw `games` list —
 * otherwise Lichess games keep showing up with the filter set to OTB.
 */
export const useSourceFilteredGames = (): Game[] => {
  const { games } = useGames();
  const { gameFilter } = useUI();
  return useMemo(() => filterGamesBySource(games, gameFilter), [games, gameFilter]);
};

// Hook to get computed stats (memoized)
export const useComputedStats = (gameFilter: GameFilter) => {
  const { games, mainRepertoire, targetElo, targetDate, playerInfo, tournaments } = useGames();

  // Filter games based on source
  const filteredGames = useMemo(() => filterGamesBySource(games, gameFilter), [games, gameFilter]);

  const ratedGames = useMemo(() => filteredGames.filter(g => g.rated), [filteredGames]);

  // Use custom hooks for complex calculations
  const gameStats = useGameStats(ratedGames);
  const trendsAndAnalytics = useTrendsAndAnalytics(ratedGames, tournaments);

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
