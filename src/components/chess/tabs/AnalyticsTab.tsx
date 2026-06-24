import { useMemo } from 'react';
import type { ComponentType } from 'react';
import { useGameForm } from '../../../hooks/useGameForm';
import { useModal } from '../../modals/ModalContext';
import AnalyticsHero from './analytics/AnalyticsHero';
import ManualGameEntry from './analytics/ManualGameEntry';
import PgnImport from './analytics/PgnImport';
import TimeOfDayPerformance from './analytics/TimeOfDayPerformance';
import TournamentComparison from './analytics/TournamentComparison';
import type { Game } from '../../../types/chess';

/** Per time-of-day-slot aggregate row. */
interface TimeOfDayStat {
  time: string;
  total: number;
  wins: number;
  draws: number;
  losses: number;
  score: string;
  winRate: string;
}

/** A single entry from useTrendsAndAnalytics.tournamentComparison. */
interface TournamentComparisonEntry {
  name: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  score: number;
  avgOppElo: number;
  playerElo: number;
  eloChange: number;
  performance: number | null;
}

interface AnalyticsTabProps {
  showPgnImport: boolean;
  setShowPgnImport: React.Dispatch<React.SetStateAction<boolean>>;
  pgnText: string;
  setPgnText: React.Dispatch<React.SetStateAction<string>>;
  handlePgnImport: () => void;
  timeOfDayStats: TimeOfDayStat[];
  tournamentComparison: TournamentComparisonEntry[];
  LichessSyncPanel: ComponentType<Record<string, unknown>>;
  onLichessSync: (games: Game[]) => void;
  onRemoveLichessGames: () => void;
  lichessGamesCount: number;
  games: Game[];
  setGames: (v: Game[] | ((p: Game[]) => Game[])) => void;
}

const AnalyticsTab = ({
  showPgnImport,
  setShowPgnImport,
  pgnText,
  setPgnText,
  handlePgnImport,
  timeOfDayStats,
  tournamentComparison,
  LichessSyncPanel,
  onLichessSync,
  onRemoveLichessGames,
  lichessGamesCount,
  games,
  setGames
}: AnalyticsTabProps) => {
  // Modal functions
  const modal = useModal();

  // Use custom hook for game form management
  const {
    showManualEntry,
    setShowManualEntry,
    gameForm,
    uniqueTournaments,
    handleInputChange,
    handleAddGame,
    resetForm,
  } = useGameForm(games, setGames, modal);

  // Handle add game with success message
  const handleAddGameWithMessage = async () => {
    if (await handleAddGame()) {
      await modal.alert('Game added successfully!');
    }
  };

  // Calculate insights
  const insights = useMemo(() => {
    // Best time of day
    const bestTimeSlot = timeOfDayStats.reduce<{ time?: string; score?: string }>((best, current) =>
      parseFloat(current.score) > parseFloat(best.score ?? '0') ? current : best
    , timeOfDayStats[0] || {});

    // Best tournament
    const bestTournament = tournamentComparison.reduce<Partial<TournamentComparisonEntry>>((best, current) =>
      (current.performance ?? 0) > (best.performance ?? 0) ? current : best
    , tournamentComparison[0] || {});

    // Total games across all time slots
    const totalTimeGames = timeOfDayStats.reduce((sum, slot) => sum + slot.total, 0);

    // Average performance rating
    const avgPerformance = tournamentComparison.length > 0
      ? Math.round(tournamentComparison.reduce((sum, t) => sum + (t.performance || 0), 0) / tournamentComparison.length)
      : 0;

    return {
      bestTimeSlot,
      bestTournament: {
        name: bestTournament.name,
        performance: bestTournament.performance ?? undefined,
      },
      totalTimeGames,
      avgPerformance
    };
  }, [timeOfDayStats, tournamentComparison]);

  return (
    <div className="space-y-8">
      {/* Hero Section with Key Insights */}
      <AnalyticsHero insights={insights} />

      {/* Manual Game Entry Section */}
      <ManualGameEntry
        showManualEntry={showManualEntry}
        setShowManualEntry={setShowManualEntry}
        gameForm={gameForm}
        uniqueTournaments={uniqueTournaments}
        handleInputChange={handleInputChange}
        handleAddGame={handleAddGameWithMessage}
        resetForm={resetForm}
      />

      {/* PGN Import Section */}
      <PgnImport
        showPgnImport={showPgnImport}
        setShowPgnImport={setShowPgnImport}
        pgnText={pgnText}
        setPgnText={setPgnText}
        handlePgnImport={handlePgnImport}
      />

      {/* Lichess Sync Panel */}
      {LichessSyncPanel && (
        <div className="space-y-4">
          <LichessSyncPanel onSyncComplete={onLichessSync} />

          {/* Remove Lichess Games Button */}
          {lichessGamesCount > 0 && (
            <div className="p-4 border-2 border-red-200 rounded-lg bg-gradient-to-r from-red-50 to-pink-50 dark:from-slate-800 dark:to-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-red-900">Remove Imported Games</h4>
                  <p className="text-xs text-red-700 mt-1">
                    You have {lichessGamesCount} Lichess game{lichessGamesCount !== 1 ? 's' : ''} imported
                  </p>
                </div>
                <button
                  onClick={onRemoveLichessGames}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Remove All Lichess Games
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Time of Day Performance */}
      <TimeOfDayPerformance timeOfDayStats={timeOfDayStats} />

      {/* Tournament Comparison */}
      <TournamentComparison tournamentComparison={tournamentComparison} />
    </div>
  );
};

export default AnalyticsTab;
