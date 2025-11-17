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
import { Swords, Target, TrendingUp, Trophy } from './components/icons/ChessIcons';
import { ecoNames } from './constants/ecoNames';
import { trainingActivities } from './constants/trainingActivities';
import { DEFAULTS, DATE_CONFIG } from './constants/chessConstants';
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
    const today = DATE_CONFIG.CURRENT_DATE;
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

  return (
    <div className="min-h-screen p-8 bg-slate-50">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-4xl font-bold text-slate-900">
                Lucas's Chess Performance Dashboard
              </h1>
              <p className="text-slate-600">Classical OTB Games Analysis</p>
            </div>

            {/* Game Source Filter */}
            <div className="flex items-center gap-2 p-2 bg-white rounded-lg shadow-sm">
              <span className="text-sm font-medium text-slate-600">Show:</span>
              <button
                onClick={() => setGameFilter('otb')}
                className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                  gameFilter === 'otb'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                OTB Only
                {gameFilter === 'otb' && (
                  <span className="ml-2 text-xs opacity-90">({filteredGames.length})</span>
                )}
              </button>
              <button
                onClick={() => setGameFilter('online')}
                className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                  gameFilter === 'online'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Online Only
                {gameFilter === 'online' && (
                  <span className="ml-2 text-xs opacity-90">({filteredGames.length})</span>
                )}
              </button>
              <button
                onClick={() => setGameFilter('all')}
                className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                  gameFilter === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Games
                {gameFilter === 'all' && (
                  <span className="ml-2 text-xs opacity-90">({filteredGames.length})</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-slate-200">
          <div className="flex space-x-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'rating', label: 'ELO Progress' },
              { id: 'trends', label: 'Trends' },
              { id: 'tournaments', label: 'Tournaments' },
              { id: 'opponents', label: 'vs Opponents' },
              { id: 'opponent-strength', label: 'Opponent Strength' },
              { id: 'white', label: 'As White' },
              { id: 'black', label: 'As Black' },
              { id: 'openings', label: 'Openings' },
              { id: 'repertoire', label: 'Repertoire' },
              { id: 'analytics', label: 'Analytics' },
              { id: 'training', label: 'Training Plan' },
              { id: 'goals', label: 'Goals' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-emerald-600 text-emerald-700'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
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
      </div>
    </div>
  );
};

export default ChessDashboard;
