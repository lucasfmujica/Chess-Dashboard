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
import RepertoireTab from './components/chess/tabs/RepertoireTab';
import TournamentsTab from './components/chess/tabs/TournamentsTab';
import TrainingTab from './components/chess/tabs/TrainingTab';
import GameAnnotationTab from './components/chess/tabs/GameAnnotationTab';
import StreaksTab from './components/chess/tabs/StreaksTab';
const GeographyTab = lazy(() => import('./components/chess/tabs/GeographyTab'));
import RecordsTab from './components/chess/tabs/RecordsTab';
import OpeningsFlashcardsTab from './components/chess/tabs/OpeningsFlashcardsTab';
import TournamentPrepTab from './components/chess/tabs/TournamentPrepTab';
const AnalysisBoardTab = lazy(() => import('./components/chess/tabs/AnalysisBoardTab'));
const RepertoireStudyTab = lazy(() => import('./components/chess/tabs/RepertoireStudyTab'));
import {
  Squares2X2Icon,
  CpuChipIcon,
  ArrowTrendingUpIcon,
  TrophyIcon,
  GlobeAmericasIcon,
  BookOpenIcon,
  RectangleStackIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  ChartBarSquareIcon,
  FireIcon,
  BeakerIcon,
  LightBulbIcon,
  FlagIcon,
  ScaleIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import { Swords, ByColorPieces } from './components/icons/ChessIcons';
import { ecoNames } from './constants/ecoNames';
import { parsePGN, convertPGNGamesToInternal } from './utils/pgnUtils';
import type { Game } from './types/chess';
import type { DayPlan } from './types/training';

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
    weeklyPlans,
    setWeeklyPlans,
    dailyNotes,
    setDailyNotes,
    weeklyHours,
    setWeeklyHours,
    upcomingTournaments,
    setUpcomingTournaments,
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
    currentWeek,
    setCurrentWeek,
    editingDay,
    setEditingDay,
  } = useUI();

  // Get computed stats based on current game filter
  const {
    filteredGames,
    ratedGames,
    overallStats,
    eloHistory,
    tournamentStats,
    bestResults,
    worstResults,
    whiteStats,
    blackStats,
    monthlyStats,
    formStats,
    streaks,
    timeOfDayStats,
    tournamentComparison,
    openingRepertoireAnalysis,
    openingRecommendations,
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

  // Training plan helper functions
  const getCurrentWeekPlan = () => weeklyPlans[currentWeek] || {};

  const updateDayPlan = (date: string, activities: DayPlan) => {
    setWeeklyPlans(prev => ({
      ...prev,
      [currentWeek]: {
        ...prev[currentWeek],
        [date]: activities,
      },
    }));
  };

  const updateDailyNote = (date: string, note: string) => {
    setDailyNotes(prev => ({
      ...prev,
      [date]: note,
    }));
  };

  // Google Calendar export function
  const exportToGoogleCalendar = async (date: string, dayPlan: DayPlan, note: string) => {
    if (dayPlan.length === 0) {
      await modal.alert('No activities planned for this day');
      return;
    }

    const dateObj = new Date(date);
    const title = `Chess Training - ${dayPlan.length} activities`;
    const totalMinutes = dayPlan.reduce((sum, activity) => sum + (activity.minutes || 0), 0);

    let description = 'Chess Training Activities:\\n\\n';
    dayPlan.forEach((activity, idx) => {
      description += `${idx + 1}. ${activity.label || activity.id}`;
      if ((activity.minutes ?? 0) > 0) description += ` (${activity.minutes} min)`;
      if (activity.details) description += ` - ${activity.details}`;
      description += '\\n';
    });

    if (note) description += `\\nNotes: ${note}`;

    const startTime = new Date(dateObj);
    startTime.setHours(9, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + (totalMinutes || 120));

    const formatGoogleDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      details: description,
      dates: `${formatGoogleDate(startTime)}/${formatGoogleDate(endTime)}`,
      location: 'Online/Home',
    });

    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank');
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
        { id: 'repertoire-study', label: 'Repertoire Study', icon: RectangleStackIcon },
        { id: 'openings-trainer', label: 'Opening Trainer', icon: AcademicCapIcon },
        { id: 'tournament-prep', label: 'Tournament Prep', icon: ClipboardDocumentCheckIcon },
        { id: 'tournaments', label: 'Tournaments', icon: TrophyIcon },
        { id: 'geography', label: 'Geography', icon: GlobeAmericasIcon },
      ],
    },
    {
      section: 'Progress',
      items: [
        { id: 'goals', label: 'Goals', icon: FlagIcon },
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
              ratedGames={ratedGames}
              eloHistory={eloHistory}
              tournamentStats={tournamentStats}
              bestResults={bestResults}
              worstResults={worstResults}
              formStats={formStats}
              streaks={streaks}
              upcomingTournaments={upcomingTournaments}
              goalProjections={goalProjections}
              onNavigate={setActiveTab}
              Swords={Swords}
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
              upcomingTournaments={upcomingTournaments}
              setUpcomingTournaments={setUpcomingTournaments}
              ratedGames={ratedGames}
            />
          )}

          {activeTab === 'opponent-analysis' && (
            <OpponentStrengthTab
              games={games}
              currentElo={playerInfo.current_elo}
              timeOfDayStats={timeOfDayStats}
              tournamentComparison={tournamentComparison}
            />
          )}

          {activeTab === 'analysis-board' && <LazyTab><AnalysisBoardTab /></LazyTab>}

          {activeTab === 'geography' && <LazyTab><GeographyTab /></LazyTab>}

          {activeTab === 'openings-trainer' && <OpeningsFlashcardsTab />}

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
                  games={games}
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
                  games={games}
                  ecoNames={ecoNames}
                />
              )}
            </div>
          )}

          {activeTab === 'repertoire' && (
            <RepertoireTab
              openingRecommendations={openingRecommendations}
              openingRepertoireAnalysis={openingRepertoireAnalysis}
              mainRepertoire={mainRepertoire}
              setMainRepertoire={setMainRepertoire}
              openingHeroes={openingHeroes}
              setOpeningHeroes={setOpeningHeroes}
            />
          )}

          {activeTab === 'repertoire-study' && <LazyTab><RepertoireStudyTab /></LazyTab>}

          {activeTab === 'tournament-prep' && <TournamentPrepTab />}

          {activeTab === 'training' && (
            <TrainingTab
              currentWeek={currentWeek}
              setCurrentWeek={setCurrentWeek}
              weeklyPlans={weeklyPlans}
              setWeeklyPlans={setWeeklyPlans}
              dailyNotes={dailyNotes}
              updateDailyNote={updateDailyNote}
              editingDay={editingDay}
              setEditingDay={setEditingDay}
              weeklyHours={weeklyHours}
              setWeeklyHours={setWeeklyHours}
              getCurrentWeekPlan={getCurrentWeekPlan}
              updateDayPlan={updateDayPlan}
              exportToGoogleCalendar={exportToGoogleCalendar}
            />
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

          {activeTab === 'annotations' && (
            <GameAnnotationTab games={filteredGames} />
          )}

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
