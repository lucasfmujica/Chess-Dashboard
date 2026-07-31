import { lazy } from 'react';
import { useModal } from './components/modals/ModalContext';
import LazyTab from './components/LazyTab';
import { useGames, useComputedStats } from './context/GamesContext';
import { useUI } from './context/UIContext';
import Sidebar from './components/Sidebar';
import MobileHeader from './components/MobileHeader';
import GameFilter from './components/GameFilter';
import LichessSyncPanel from './components/chess/LichessSyncPanel';
import ColorGamesTab from './components/chess/tabs/ColorGamesTab';
import GoalsTab from './components/chess/tabs/GoalsTab';
import OpponentStrengthTab from './components/chess/tabs/OpponentStrengthTab';
import OverviewTab from './components/chess/tabs/OverviewTab';
import RatingTab from './components/chess/tabs/RatingTab';
import RepertoireHubTab from './components/chess/tabs/RepertoireHubTab';
import DrillsHubTab from './components/chess/tabs/DrillsHubTab';
import TournamentsTab from './components/chess/tabs/TournamentsTab';
import TrainingTab from './components/chess/tabs/TrainingTab';
import GameAnnotationTab from './components/chess/tabs/GameAnnotationTab';
import StreaksTab from './components/chess/tabs/StreaksTab';
const GeographyTab = lazy(() => import('./components/chess/tabs/GeographyTab'));
import RecordsTab from './components/chess/tabs/RecordsTab';
const AnalysisBoardTab = lazy(() => import('./components/chess/tabs/AnalysisBoardTab'));
const OpponentPrepTab = lazy(() => import('./components/chess/tabs/OpponentPrepTab'));
const NormTrackerTab = lazy(() => import('./components/chess/tabs/NormTrackerTab'));
const ConceptsTab = lazy(() => import('./components/chess/tabs/ConceptsTab'));
import {
  Squares2X2Icon,
  CpuChipIcon,
  ArrowTrendingUpIcon,
  TrophyIcon,
  GlobeAmericasIcon,
  BookOpenIcon,
  DocumentTextIcon,
  ChartBarSquareIcon,
  FireIcon,
  BeakerIcon,
  LightBulbIcon,
  FlagIcon,
  ScaleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  RocketLaunchIcon,
  PuzzlePieceIcon,
} from '@heroicons/react/24/outline';
import { ByColorPieces } from './components/icons/ChessIcons';
import { ecoNames } from './constants/ecoNames';
import { parsePGN, convertPGNGamesToInternal } from './utils/pgnUtils';
import type { Game } from './types/chess';

/**
 * Top-level tabs that became sub-tabs when Repertorio and Drills were merged.
 * `repertoire-study` is absent on purpose: it already reads as a sub-tab id.
 */
const LEGACY_TABS: Record<string, string> = {
  'openings-trainer': 'repertoire-train',
  'tournament-prep': 'repertoire-lines',
  'blunder-drills': 'drills',
  'endgame-drills': 'drills-endgames',
};

const ChessDashboard = () => {
  const modal = useModal();
  const {
    games,
    syncLichessGames,
    removeLichessGames,
    importPgnGames,
    addManualGame,
    playerInfo,
    mainRepertoire,
    setMainRepertoire,
    openingHeroes,
    setOpeningHeroes,
    targetElo,
    setTargetElo,
    targetDate,
    setTargetDate,
    dailyNotes,
    setDailyNotes,
    upcomingTournaments,
  } = useGames();

  const {
    activeTab,
    setActiveTab,
    gameFilter,
    setGameFilter,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    whiteSortBy,
    setWhiteSortBy,
    whiteSortOrder,
    setWhiteSortOrder,
    blackSortBy,
    setBlackSortBy,
    blackSortOrder,
    setBlackSortOrder,
    showPgnImport,
    setShowPgnImport,
    pgnText,
    setPgnText,
  } = useUI();

  // Get computed stats based on current game filter
  const {
    filteredGames,
    ratedGames,
    overallStats,
    eloHistory,
    tournamentStats,
    whiteStats,
    blackStats,
    monthlyStats,
    formStats,
    streaks,
    timeOfDayStats,
    tournamentComparison,
    openingRepertoireAnalysis,
    openingRecommendations,
    gamesWithoutEco,
    goalProjections,
    achievements,
    nextMilestones,
  } = useComputedStats(gameFilter);

  // Handler for Lichess game sync (server upserts by Lichess game id)
  const handleLichessSync = async (transformedGames: Game[]) => {
    await syncLichessGames(transformedGames);
  };

  // Handler to remove all Lichess games
  const handleRemoveLichessGames = async () => {
    const lichessCount = games.filter(g => g.source === 'lichess').length;
    if (lichessCount === 0) {
      await modal.alert('No Lichess games to remove');
      return;
    }
    const confirmed = await modal.confirm(`Are you sure you want to remove all ${lichessCount} Lichess game${lichessCount !== 1 ? 's' : ''}? This action cannot be undone.`);
    if (confirmed) {
      await removeLichessGames();
    }
  };

  const updateDailyNote = (date: string, note: string) => {
    setDailyNotes(prev => ({
      ...prev,
      [date]: note,
    }));
  };

  // PGN Import Handler
  const handlePgnImport = async () => {
    try {
      const parsedGames = parsePGN(pgnText);
      if (parsedGames.length === 0) {
        await modal.alert('No valid games found in PGN');
        return;
      }

      const playerName = await modal.prompt(`Found ${parsedGames.length} games. Enter your name as it appears in the PGN (White or Black player name):`);
      if (!playerName?.trim()) {
        await modal.alert('Player name is required');
        return;
      }
      if (playerName.trim().length > 100) {
        await modal.alert('Player name is too long (maximum 100 characters)');
        return;
      }

      const playerElo = await modal.prompt('Enter your ELO rating at the time of this tournament:');
      if (!playerElo || isNaN(parseInt(playerElo))) {
        await modal.alert('Valid ELO rating is required');
        return;
      }

      const { games: formattedGames, skippedCount } = convertPGNGamesToInternal(
        parsedGames,
        playerName.trim(),
        parseInt(playerElo)
      );

      if (formattedGames.length === 0) {
        await modal.alert(`Could not match any games to player name "${playerName}". Please check the name and try again.`);
        return;
      }

      const confirmImport = await modal.confirm(
        `Ready to import ${formattedGames.length} game(s)${skippedCount > 0 ? ` (${skippedCount} skipped)` : ''}. Continue?`
      );

      if (confirmImport) {
        await importPgnGames(formattedGames);
        await modal.alert(`Successfully imported ${formattedGames.length} game(s)!`);
        setPgnText('');
        setShowPgnImport(false);
      }
    } catch (error) {
      await modal.alert(error instanceof Error ? error.message : 'Failed to import PGN');
    }
  };

  // Repertoire and Drills used to be six separate sidebar entries. Anything
  // still pointing at an old id lands on the sub-tab that replaced it rather
  // than on a blank page.
  const resolvedTab = LEGACY_TABS[activeTab] ?? activeTab;
  const isRepertoireTab = resolvedTab === 'repertoire' || resolvedTab.startsWith('repertoire-');
  const isDrillsTab = resolvedTab === 'drills' || resolvedTab.startsWith('drills-');

  // Navigation grouped into sections for a clearer information architecture.
  const navigationSections = [
    {
      section: 'Play & Review',
      items: [
        { id: 'overview', label: 'Overview', icon: Squares2X2Icon },
        { id: 'analysis-board', label: 'Analysis Board', icon: CpuChipIcon },
        { id: 'annotations', label: 'Game Library', icon: DocumentTextIcon },
      ],
    },
    {
      section: 'Analytics',
      items: [
        { id: 'rating', label: 'ELO Progress', icon: ArrowTrendingUpIcon },
        { id: 'opponent-analysis', label: 'Performance', icon: BeakerIcon },
        { id: 'by-color', label: 'By Color', icon: ByColorPieces },
        { id: 'records', label: 'Records', icon: ChartBarSquareIcon },
        { id: 'streaks', label: 'Streaks', icon: FireIcon },
      ],
    },
    {
      section: 'Study & Prep',
      items: [
        { id: 'repertoire', label: 'Repertoire', icon: BookOpenIcon },
        { id: 'drills', label: 'Drills', icon: ExclamationTriangleIcon },
        { id: 'concepts', label: 'Concepts & Books', icon: PuzzlePieceIcon },
        { id: 'opponent-prep', label: 'Opponent Prep', icon: UserGroupIcon },
        { id: 'tournaments', label: 'Tournaments', icon: TrophyIcon },
        { id: 'geography', label: 'Geography', icon: GlobeAmericasIcon },
      ],
    },
    {
      section: 'Progress',
      items: [
        { id: 'goals', label: 'Goals', icon: FlagIcon },
        { id: 'norm-tracker', label: 'Norm Tracker', icon: RocketLaunchIcon },
        { id: 'training', label: 'Training Plan', icon: LightBulbIcon },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-app text-fg">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        playerInfo={playerInfo}
        filteredGames={filteredGames}
        navigationSections={navigationSections}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <div className={`min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'}`}>
        {/* Mobile Header with Hamburger */}
        <MobileHeader setIsMobileMenuOpen={setIsMobileMenuOpen} />

        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Desktop Header */}
          <div className="hidden lg:block mb-8 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-fg">
                  Lucas's Chess Performance
                </h1>
                <p className="mt-1 text-sm text-fg-muted flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                  </svg>
                  Classical OTB Performance Analysis
                </p>
              </div>

              {/* Game Source Filter */}
              <GameFilter
                gameFilter={gameFilter}
                setGameFilter={setGameFilter}
                filteredGames={filteredGames}
              />
            </div>
          </div>

          {/* Tab Content */}
          <div key={activeTab} className="animate-fadeIn">
          {activeTab === 'overview' && (
            <OverviewTab
              playerInfo={playerInfo}
              overallStats={overallStats}
              whiteStats={whiteStats}
              blackStats={blackStats}
              eloHistory={eloHistory}
              tournamentStats={tournamentStats}
              formStats={formStats}
              streaks={streaks}
              upcomingTournaments={upcomingTournaments}
              goalProjections={goalProjections}
              onNavigate={setActiveTab}
              Target={ScaleIcon}
              TrendingUp={ArrowTrendingUpIcon}
              games={games}
              addManualGame={addManualGame}
              showPgnImport={showPgnImport}
              setShowPgnImport={setShowPgnImport}
              pgnText={pgnText}
              setPgnText={setPgnText}
              handlePgnImport={handlePgnImport}
              LichessSyncPanel={LichessSyncPanel}
              onLichessSync={handleLichessSync}
              onRemoveLichessGames={handleRemoveLichessGames}
              lichessGamesCount={games.filter(g => g.source === 'lichess').length}
            />
          )}

          {activeTab === 'rating' && <RatingTab eloHistory={eloHistory} />}

          {activeTab === 'tournaments' && (
            <TournamentsTab
              tournamentStats={tournamentStats}
              ratedGames={ratedGames}
            />
          )}

          {activeTab === 'opponent-analysis' && (
            <OpponentStrengthTab
              games={ratedGames}
              currentElo={playerInfo.current_elo}
              timeOfDayStats={timeOfDayStats}
              tournamentComparison={tournamentComparison}
            />
          )}

          {activeTab === 'analysis-board' && <LazyTab><AnalysisBoardTab /></LazyTab>}

          {activeTab === 'geography' && <LazyTab><GeographyTab /></LazyTab>}

          {activeTab === 'records' && (
            <RecordsTab games={ratedGames} eloHistory={eloHistory} />
          )}

          {(activeTab === 'by-color' || activeTab === 'by-color-white' || activeTab === 'by-color-black') && (
            <div className="space-y-6">
              <div className="inline-flex gap-1 rounded-lg border border-hairline bg-surface p-1">
                <button
                  onClick={() => setActiveTab('by-color-white')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab !== 'by-color-black' ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:bg-surface-2'
                  }`}
                >
                  ⚪ White Games
                </button>
                <button
                  onClick={() => setActiveTab('by-color-black')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'by-color-black' ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:bg-surface-2'
                  }`}
                >
                  ⚫ Black Games
                </button>
              </div>
              {activeTab === 'by-color-black' ? (
                <ColorGamesTab
                  color="B"
                  colorStats={blackStats}
                  sortBy={blackSortBy}
                  setSortBy={setBlackSortBy}
                  sortOrder={blackSortOrder}
                  setSortOrder={setBlackSortOrder}
                  games={ratedGames}
                  ecoNames={ecoNames}
                />
              ) : (
                <ColorGamesTab
                  color="W"
                  colorStats={whiteStats}
                  sortBy={whiteSortBy}
                  setSortBy={setWhiteSortBy}
                  sortOrder={whiteSortOrder}
                  setSortOrder={setWhiteSortOrder}
                  games={ratedGames}
                  ecoNames={ecoNames}
                />
              )}
            </div>
          )}

          {isRepertoireTab && (
            <RepertoireHubTab
              activeTab={resolvedTab}
              onNavigate={setActiveTab}
              openingRecommendations={openingRecommendations}
              openingRepertoireAnalysis={openingRepertoireAnalysis}
              mainRepertoire={mainRepertoire}
              setMainRepertoire={setMainRepertoire}
              openingHeroes={openingHeroes}
              setOpeningHeroes={setOpeningHeroes}
              gamesWithoutEco={gamesWithoutEco}
            />
          )}

          {isDrillsTab && <DrillsHubTab activeTab={resolvedTab} onNavigate={setActiveTab} />}

          {activeTab === 'opponent-prep' && <LazyTab><OpponentPrepTab /></LazyTab>}

          {activeTab === 'norm-tracker' && <LazyTab><NormTrackerTab /></LazyTab>}
          {activeTab === 'concepts' && <LazyTab><ConceptsTab /></LazyTab>}

          {activeTab === 'training' && (
            <TrainingTab dailyNotes={dailyNotes} updateDailyNote={updateDailyNote} />
          )}

          {activeTab === 'goals' && (
            <GoalsTab
              targetElo={targetElo}
              setTargetElo={setTargetElo}
              targetDate={targetDate}
              setTargetDate={setTargetDate}
              goalProjections={goalProjections}
              achievements={achievements}
              nextMilestones={nextMilestones}
            />
          )}

          {/* Deliberately not `filteredGames`: the header filter defaults to
              OTB, and a post-mortem is owed for every game played, online
              included — the tab reads the unfiltered list itself. */}
          {activeTab === 'annotations' && <GameAnnotationTab />}

          {activeTab === 'streaks' && (
            <StreaksTab
              games={filteredGames}
              formStats={formStats}
              monthlyStats={monthlyStats}
            />
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChessDashboard;
