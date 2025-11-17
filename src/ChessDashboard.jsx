import React, { useMemo, useState } from 'react';
import LichessSyncPanel from './components/chess/LichessSyncPanel';
import AnalyticsTab from './components/chess/tabs/AnalyticsTab';
import BlackGamesTab from './components/chess/tabs/BlackGamesTab';
import GoalsTab from './components/chess/tabs/GoalsTab';
import OpeningsTab from './components/chess/tabs/OpeningsTab';
import OpponentsTab from './components/chess/tabs/OpponentsTab';
import OpponentStrengthTab from './components/chess/tabs/OpponentStrengthTab';
import OverviewTab from './components/chess/tabs/OverviewTab';
import RatingTab from './components/chess/tabs/RatingTab';
import RepertoireTab from './components/chess/tabs/RepertoireTab';
import TournamentsTab from './components/chess/tabs/TournamentsTab';
import TrainingTab from './components/chess/tabs/TrainingTab';
import TrendsTab from './components/chess/tabs/TrendsTab';
import WhiteGamesTab from './components/chess/tabs/WhiteGamesTab';
import GameAnnotationTab from './components/chess/tabs/GameAnnotationTab';
import AchievementsTab from './components/chess/tabs/AchievementsTab';
import StreaksTab from './components/chess/tabs/StreaksTab';
import RecordsTab from './components/chess/tabs/RecordsTab';
import { Swords, Target, TrendingUp, Trophy } from './components/icons/ChessIcons';
import { ecoNames } from './constants/ecoNames';
import { trainingActivities } from './constants/trainingActivities';
import { DEFAULTS } from './constants/chessConstants';
import { mergeGames } from './utils/lichessApi';
import { initialGames, playerInfo as initialPlayerInfo } from './data/initialGames';
import { useGameStats } from './hooks/useGameStats';
import { useTrendsAndAnalytics } from './hooks/useTrendsAndAnalytics';
import { useRepertoireAnalysis } from './hooks/useRepertoireAnalysis';
import { useGoalsAndAchievements } from './hooks/useGoalsAndAchievements';
import { getEloRatingBracket } from './utils/eloCalculations';

const ChessDashboard = () => {
  // UI State
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedBracket, setSelectedBracket] = useState(null);
  const [gameFilter, setGameFilter] = useState('otb'); // 'all', 'otb', 'online'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Repertoire State
  const [mainRepertoire, setMainRepertoire] = useState({
    white: ['A15', 'A20', 'A13', 'A10'],
    black: ['B35', 'B30', 'B23'],
  });

  // Goals State
  const [targetElo, setTargetElo] = useState(DEFAULTS.TARGET_ELO);
  const [targetDate, setTargetDate] = useState(DEFAULTS.TARGET_DATE);

  // Training Plan State
  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = new Date(); // Use actual current date
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(today.getDate() - daysFromMonday);

    const year = startOfWeek.getFullYear();
    const month = String(startOfWeek.getMonth() + 1).padStart(2, '0');
    const day = String(startOfWeek.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [weeklyPlans, setWeeklyPlans] = useState({});
  const [dailyNotes, setDailyNotes] = useState({});
  const [editingDay, setEditingDay] = useState(null);
  const [weeklyHours, setWeeklyHours] = useState(DEFAULTS.WEEKLY_TRAINING_HOURS);

  // Sorting State
  const [whiteSortBy, setWhiteSortBy] = useState('date');
  const [whiteSortOrder, setWhiteSortOrder] = useState('desc');
  const [blackSortBy, setBlackSortBy] = useState('date');
  const [blackSortOrder, setBlackSortOrder] = useState('desc');

  // PGN Import State
  const [showPgnImport, setShowPgnImport] = useState(false);
  const [pgnText, setPgnText] = useState('');

  // Games State
  const [games, setGames] = useState(initialGames);
  const playerInfo = initialPlayerInfo;

  // Handler for Lichess game sync
  const handleLichessSync = (transformedGames) => {
    const merged = mergeGames(games, transformedGames);
    setGames(merged);
  };

  // Filter games based on source
  const filteredGames = useMemo(() => {
    if (gameFilter === 'all') return games;
    if (gameFilter === 'otb') return games.filter(g => g.source === 'otb' || !g.source);
    if (gameFilter === 'online') return games.filter(g => g.source === 'lichess');
    return games;
  }, [games, gameFilter]);

  const ratedGames = useMemo(() => filteredGames.filter(g => g.rated), [filteredGames]);

  // Use custom hooks for complex calculations
  const {
    overallStats,
    eloHistory,
    tournamentStats,
    bestResults,
    worstResults,
    opponentBracketStats,
    whiteStats,
    blackStats,
    allOpeningsStats,
  } = useGameStats(games, filteredGames, ratedGames);

  const {
    monthlyStats,
    formStats,
    streaks,
    timeOfDayStats,
    tournamentComparison,
  } = useTrendsAndAnalytics(games, ratedGames);

  const {
    openingRepertoireAnalysis,
    openingRecommendations,
  } = useRepertoireAnalysis(ratedGames, allOpeningsStats, mainRepertoire);

  const {
    goalProjections,
    achievements,
    nextMilestones,
  } = useGoalsAndAchievements(
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

  // Bracket games for opponent analysis
  const bracketGames = useMemo(() => {
    if (!selectedBracket) return [];

    return ratedGames
      .filter(g => g.opp_elo > 0)
      .map((game, idx) => {
        const bracket = getEloRatingBracket(game.elo, game.opp_elo);
        const diff = game.opp_elo - game.elo;

        return {
          ...game,
          gameNumber: idx + 1,
          bracket,
          ratingDiff: diff,
          opening: ecoNames[game.eco] || game.eco,
        };
      })
      .filter(g => g.bracket === selectedBracket);
  }, [ratedGames, selectedBracket]);

  // Training plan helper functions
  const getCurrentWeekPlan = () => weeklyPlans[currentWeek] || {};

  const updateDayPlan = (date, activities) => {
    setWeeklyPlans(prev => ({
      ...prev,
      [currentWeek]: {
        ...prev[currentWeek],
        [date]: activities,
      },
    }));
  };

  const updateDailyNote = (date, note) => {
    setDailyNotes(prev => ({
      ...prev,
      [date]: note,
    }));
  };

  // Google Calendar export function
  const exportToGoogleCalendar = (date, dayPlan, note) => {
    if (dayPlan.length === 0) {
      alert('No activities planned for this day');
      return;
    }

    const dateObj = new Date(date);
    const title = `Chess Training - ${dayPlan.length} activities`;

    const totalMinutes = dayPlan.reduce((sum, activity) => sum + (activity.minutes || 0), 0);

    let description = 'Chess Training Activities:\\n\\n';
    dayPlan.forEach((activity, idx) => {
      const activityDef = trainingActivities.find(a => a.id === activity.id);
      description += `${idx + 1}. ${activityDef?.label || activity.id}`;
      if (activity.minutes > 0) {
        description += ` (${activity.minutes} min)`;
      }
      if (activity.details) {
        description += ` - ${activity.details}`;
      }
      description += '\\n';
    });

    if (note) {
      description += `\\nNotes: ${note}`;
    }

    const startTime = new Date(dateObj);
    startTime.setHours(9, 0, 0, 0);

    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + (totalMinutes || 120));

    const formatGoogleDate = (d) => {
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const startStr = formatGoogleDate(startTime);
    const endStr = formatGoogleDate(endTime);

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      details: description,
      dates: `${startStr}/${endStr}`,
      location: 'Online/Home',
    });

    const url = `https://calendar.google.com/calendar/render?${params.toString()}`;
    window.open(url, '_blank');
  };

  // PGN Import Parser
  const parsePGN = (pgnText) => {
    try {
      const parsedGames = [];
      const gameBlocks = pgnText.split(/\n\n(?=\[Event)/);

      gameBlocks.forEach(block => {
        if (!block.trim()) return;

        const game = {};
        const lines = block.split('\n');

        lines.forEach(line => {
          if (line.startsWith('[')) {
            const match = line.match(/\[(\w+)\s+"([^"]+)"\]/);
            if (match) {
              const [, key, value] = match;
              if (key === 'WhiteElo') game.whiteElo = parseInt(value);
              if (key === 'BlackElo') game.blackElo = parseInt(value);
              if (key === 'White') game.white = value;
              if (key === 'Black') game.black = value;
              if (key === 'Result') game.result = value;
              if (key === 'ECO') game.eco = value;
              if (key === 'Event') game.tournament = value;
            }
          }
        });

        if (game.white && game.black) {
          parsedGames.push(game);
        }
      });

      return parsedGames;
    } catch (error) {
      alert('Error parsing PGN: ' + error.message);
      return [];
    }
  };

  const handlePgnImport = () => {
    const parsedGames = parsePGN(pgnText);
    if (parsedGames.length === 0) {
      alert('No valid games found in PGN');
      return;
    }

    const confirmImport = window.confirm(
      `Found ${parsedGames.length} games. This is a preview feature. ` +
      `Imported games would need to be manually added to the games array.`
    );

    if (confirmImport) {
      console.log('Parsed games:', parsedGames);
      alert(`Successfully parsed ${parsedGames.length} games. Check console for details.`);
      setPgnText('');
      setShowPgnImport(false);
    }
  };

  // Navigation tabs configuration
  const navigationTabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'rating', label: 'ELO Progress', icon: '📈' },
    { id: 'trends', label: 'Trends', icon: '🔥' },
    { id: 'tournaments', label: 'Tournaments', icon: '🏆' },
    { id: 'opponents', label: 'vs Opponents', icon: '⚔️' },
    { id: 'opponent-strength', label: 'Opponent Strength', icon: '💪' },
    { id: 'white', label: 'As White', icon: '⚪' },
    { id: 'black', label: 'As Black', icon: '⚫' },
    { id: 'openings', label: 'Openings', icon: '📚' },
    { id: 'repertoire', label: 'Repertoire', icon: '🎯' },
    { id: 'annotations', label: 'Game Library', icon: '📝' },
    { id: 'achievements', label: 'Achievements', icon: '🏅' },
    { id: 'streaks', label: 'Streaks', icon: '🔥' },
    { id: 'records', label: 'Records', icon: '⭐' },
    { id: 'analytics', label: 'Analytics', icon: '🔬' },
    { id: 'training', label: 'Training Plan', icon: '💡' },
    { id: 'goals', label: 'Goals', icon: '🎖️' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 chess-pattern">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white/95 backdrop-blur-md shadow-2xl z-50 transition-transform duration-300 ease-in-out overflow-y-auto ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Chess Analytics</h2>
                <p className="text-xs text-slate-600">Lucas's Performance</p>
              </div>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Quick Stats in Sidebar */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg">
              <span className="text-xs font-medium text-slate-600">Current ELO</span>
              <span className="text-sm font-bold text-emerald-600">{playerInfo.current_elo}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
              <span className="text-xs font-medium text-slate-600">Total Games</span>
              <span className="text-sm font-bold text-slate-900">{filteredGames.length}</span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1">
          {navigationTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="lg:ml-72 min-h-screen">
        {/* Mobile Header with Hamburger */}
        <div className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md shadow-md border-b border-slate-200">
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-slate-900">Chess Dashboard</h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Desktop Header - Hidden on mobile since we have mobile header */}
        <div className="hidden lg:block mb-8 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">
                Lucas's Chess Performance
              </h1>
              <p className="mt-1 text-slate-600 font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                </svg>
                Classical OTB Performance Analysis
              </p>
            </div>

            {/* Enhanced Game Source Filter */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/60 p-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-2">
                  <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span className="text-sm font-semibold text-slate-700">Filter:</span>
                </div>
                <button
                  onClick={() => setGameFilter('otb')}
                  className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                    gameFilter === 'otb'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 scale-105'
                      : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200 hover:scale-105'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd"/>
                    </svg>
                    OTB
                    {gameFilter === 'otb' && (
                      <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">
                        {filteredGames.length}
                      </span>
                    )}
                  </span>
                </button>
                <button
                  onClick={() => setGameFilter('online')}
                  className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                    gameFilter === 'online'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                      : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200 hover:scale-105'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                    </svg>
                    Online
                    {gameFilter === 'online' && (
                      <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">
                        {filteredGames.length}
                      </span>
                    )}
                  </span>
                </button>
                <button
                  onClick={() => setGameFilter('all')}
                  className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                    gameFilter === 'all'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30 scale-105'
                      : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200 hover:scale-105'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                    </svg>
                    All
                    {gameFilter === 'all' && (
                      <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">
                        {filteredGames.length}
                      </span>
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
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
            Trophy={Trophy}
            Swords={Swords}
            Target={Target}
            TrendingUp={TrendingUp}
          />
        )}

        {activeTab === 'rating' && <RatingTab eloHistory={eloHistory} />}

        {activeTab === 'trends' && (
          <TrendsTab
            formStats={formStats}
            streaks={streaks}
            monthlyStats={monthlyStats}
          />
        )}

        {activeTab === 'tournaments' && (
          <TournamentsTab tournamentStats={tournamentStats} />
        )}

        {activeTab === 'opponents' && (
          <OpponentsTab
            selectedBracket={selectedBracket}
            setSelectedBracket={setSelectedBracket}
            opponentBracketStats={opponentBracketStats}
            bracketGames={bracketGames}
            ecoNames={ecoNames}
          />
        )}

        {activeTab === 'opponent-strength' && (
          <OpponentStrengthTab
            games={games}
            currentElo={playerInfo.current_elo}
          />
        )}

        {activeTab === 'white' && (
          <WhiteGamesTab
            whiteStats={whiteStats}
            whiteSortBy={whiteSortBy}
            setWhiteSortBy={setWhiteSortBy}
            whiteSortOrder={whiteSortOrder}
            setWhiteSortOrder={setWhiteSortOrder}
            games={games}
            ecoNames={ecoNames}
          />
        )}

        {activeTab === 'black' && (
          <BlackGamesTab
            blackStats={blackStats}
            blackSortBy={blackSortBy}
            setBlackSortBy={setBlackSortBy}
            blackSortOrder={blackSortOrder}
            setBlackSortOrder={setBlackSortOrder}
            games={games}
            ecoNames={ecoNames}
          />
        )}

        {activeTab === 'openings' && (
          <OpeningsTab allOpeningsStats={allOpeningsStats} />
        )}

        {activeTab === 'repertoire' && (
          <RepertoireTab
            openingRecommendations={openingRecommendations}
            openingRepertoireAnalysis={openingRepertoireAnalysis}
            mainRepertoire={mainRepertoire}
            setMainRepertoire={setMainRepertoire}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab
            showPgnImport={showPgnImport}
            setShowPgnImport={setShowPgnImport}
            pgnText={pgnText}
            setPgnText={setPgnText}
            handlePgnImport={handlePgnImport}
            timeOfDayStats={timeOfDayStats}
            tournamentComparison={tournamentComparison}
            LichessSyncPanel={LichessSyncPanel}
            onLichessSync={handleLichessSync}
          />
        )}

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

        {activeTab === 'achievements' && (
          <AchievementsTab games={filteredGames} />
        )}

        {activeTab === 'streaks' && (
          <StreaksTab games={filteredGames} />
        )}

        {activeTab === 'records' && (
          <RecordsTab games={filteredGames} eloHistory={eloHistory} />
        )}
        </div>
      </div>
    </div>
  );
};

export default ChessDashboard;
