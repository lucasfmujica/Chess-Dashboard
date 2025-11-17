import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useGameForm } from '../../../hooks/useGameForm';
import { useModal } from '../../modals/ModalContext';
import AnalyticsHero from './analytics/AnalyticsHero';
import ManualGameEntry from './analytics/ManualGameEntry';
import PgnImport from './analytics/PgnImport';
import TimeOfDayPerformance from './analytics/TimeOfDayPerformance';
import TournamentComparison from './analytics/TournamentComparison';

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
}) => {
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
    const bestTimeSlot = timeOfDayStats.reduce((best, current) =>
      parseFloat(current.score) > parseFloat(best.score) ? current : best
    , timeOfDayStats[0] || {});

    // Best tournament
    const bestTournament = tournamentComparison.reduce((best, current) =>
      current.performance > best.performance ? current : best
    , tournamentComparison[0] || {});

    // Total games across all time slots
    const totalTimeGames = timeOfDayStats.reduce((sum, slot) => sum + slot.total, 0);

    // Average performance rating
    const avgPerformance = tournamentComparison.length > 0
      ? Math.round(tournamentComparison.reduce((sum, t) => sum + (t.performance || 0), 0) / tournamentComparison.length)
      : 0;

    return {
      bestTimeSlot,
      bestTournament,
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
            <div className="p-4 border-2 border-red-200 rounded-lg bg-gradient-to-r from-red-50 to-pink-50">
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

AnalyticsTab.propTypes = {
  showPgnImport: PropTypes.bool.isRequired,
  setShowPgnImport: PropTypes.func.isRequired,
  pgnText: PropTypes.string.isRequired,
  setPgnText: PropTypes.func.isRequired,
  handlePgnImport: PropTypes.func.isRequired,
  timeOfDayStats: PropTypes.arrayOf(PropTypes.shape({
    time: PropTypes.string,
    total: PropTypes.number,
    wins: PropTypes.number,
    draws: PropTypes.number,
    losses: PropTypes.number,
    score: PropTypes.string,
    winRate: PropTypes.string,
  })).isRequired,
  tournamentComparison: PropTypes.arrayOf(PropTypes.object).isRequired,
  LichessSyncPanel: PropTypes.elementType.isRequired,
  onLichessSync: PropTypes.func.isRequired,
  onRemoveLichessGames: PropTypes.func.isRequired,
  lichessGamesCount: PropTypes.number.isRequired,
  games: PropTypes.arrayOf(PropTypes.object).isRequired,
  setGames: PropTypes.func.isRequired,
};

export default AnalyticsTab;
