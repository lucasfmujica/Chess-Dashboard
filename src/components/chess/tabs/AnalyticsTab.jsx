import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area } from 'recharts';
import {
  ClockIcon,
  TrophyIcon,
  ChartBarIcon,
  SparklesIcon,
  FireIcon,
  LightBulbIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

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
  // Manual game entry state
  const [showManualEntry, setShowManualEntry] = React.useState(false);
  const [gameForm, setGameForm] = React.useState({
    tournament: '',
    elo: '',
    opp: '',
    opp_elo: '',
    color: 'W',
    result: 'W',
    eco: '',
    rated: true,
  });

  // Get unique tournament names for dropdown
  const uniqueTournaments = React.useMemo(() => {
    const tournaments = [...new Set(games.map(g => g.tournament))];
    return tournaments.sort();
  }, [games]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setGameForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddGame = () => {
    // Validation
    if (!gameForm.tournament.trim()) {
      alert('Tournament name is required');
      return;
    }
    if (!gameForm.elo || isNaN(parseInt(gameForm.elo))) {
      alert('Valid player ELO is required');
      return;
    }
    if (!gameForm.opp.trim()) {
      alert('Opponent name is required');
      return;
    }
    if (!gameForm.opp_elo || isNaN(parseInt(gameForm.opp_elo))) {
      alert('Valid opponent ELO is required');
      return;
    }

    const newGame = {
      elo: parseInt(gameForm.elo),
      color: gameForm.color,
      result: gameForm.result,
      opp: gameForm.opp.trim(),
      opp_elo: parseInt(gameForm.opp_elo),
      eco: gameForm.eco.trim() || 'Unknown',
      tournament: gameForm.tournament.trim(),
      rated: gameForm.rated,
      source: 'otb',
      time: '00:00',
    };

    setGames(prev => [...prev, newGame]);

    // Reset form
    setGameForm({
      tournament: gameForm.tournament, // Keep tournament name
      elo: gameForm.elo, // Keep ELO
      opp: '',
      opp_elo: '',
      color: 'W',
      result: 'W',
      eco: '',
      rated: true,
    });

    alert('Game added successfully!');
  };

  const resetForm = () => {
    setGameForm({
      tournament: '',
      elo: '',
      opp: '',
      opp_elo: '',
      color: 'W',
      result: 'W',
      eco: '',
      rated: true,
    });
    setShowManualEntry(false);
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
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}></div>

        <div className="relative px-8 py-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
              <ChartBarIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Performance Analytics</h2>
              <p className="text-indigo-100">Deep dive into your chess performance patterns</p>
            </div>
          </div>

          {/* Insight Cards Grid */}
          <div className="grid grid-cols-1 gap-4 mt-6 md:grid-cols-4">
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <ClockIcon className="w-5 h-5 text-yellow-300" />
                <p className="text-sm font-medium text-white/80">Best Time Slot</p>
              </div>
              <p className="text-2xl font-bold text-white">{insights.bestTimeSlot?.time || 'N/A'}</p>
              <p className="text-sm text-indigo-100">{insights.bestTimeSlot?.score}% score</p>
            </div>

            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <TrophyIcon className="w-5 h-5 text-yellow-300" />
                <p className="text-sm font-medium text-white/80">Best Tournament</p>
              </div>
              <p className="text-lg font-bold text-white leading-tight">{insights.bestTournament?.name?.slice(0, 20) || 'N/A'}</p>
              <p className="text-sm text-indigo-100">{insights.bestTournament?.performance || 'N/A'} perf rating</p>
            </div>

            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <FireIcon className="w-5 h-5 text-orange-300" />
                <p className="text-sm font-medium text-white/80">Games Analyzed</p>
              </div>
              <p className="text-2xl font-bold text-white">{insights.totalTimeGames}</p>
              <p className="text-sm text-indigo-100">by time of day</p>
            </div>

            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <SparklesIcon className="w-5 h-5 text-emerald-300" />
                <p className="text-sm font-medium text-white/80">Avg Performance</p>
              </div>
              <p className="text-2xl font-bold text-white">{insights.avgPerformance}</p>
              <p className="text-sm text-indigo-100">across tournaments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Game Entry Section */}
      <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg border border-slate-200/60 transition-all duration-300 hover:shadow-xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600"></div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Add Game Manually</h3>
                <p className="text-sm text-slate-600">Record individual tournament games</p>
              </div>
            </div>
            <button
              onClick={() => setShowManualEntry(!showManualEntry)}
              className="px-4 py-2 text-sm font-medium text-white transition-all duration-300 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105"
            >
              {showManualEntry ? '✕ Close Form' : '➕ Add Game'}
            </button>
          </div>

          {showManualEntry && (
            <div className="space-y-4 animate-slideUp">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tournament Name */}
                <div>
                  <label className="block mb-2 text-sm font-semibold text-slate-700">
                    Tournament Name *
                  </label>
                  <input
                    type="text"
                    name="tournament"
                    list="tournament-suggestions"
                    value={gameForm.tournament}
                    onChange={handleInputChange}
                    placeholder="e.g., Lago Puelo Open 2025"
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                  <datalist id="tournament-suggestions">
                    {uniqueTournaments.map((t, idx) => (
                      <option key={idx} value={t} />
                    ))}
                  </datalist>
                </div>

                {/* Your ELO */}
                <div>
                  <label className="block mb-2 text-sm font-semibold text-slate-700">
                    Your ELO *
                  </label>
                  <input
                    type="number"
                    name="elo"
                    value={gameForm.elo}
                    onChange={handleInputChange}
                    placeholder="e.g., 1650"
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>

                {/* Opponent Name */}
                <div>
                  <label className="block mb-2 text-sm font-semibold text-slate-700">
                    Opponent Name *
                  </label>
                  <input
                    type="text"
                    name="opp"
                    value={gameForm.opp}
                    onChange={handleInputChange}
                    placeholder="e.g., John Smith"
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>

                {/* Opponent ELO */}
                <div>
                  <label className="block mb-2 text-sm font-semibold text-slate-700">
                    Opponent ELO *
                  </label>
                  <input
                    type="number"
                    name="opp_elo"
                    value={gameForm.opp_elo}
                    onChange={handleInputChange}
                    placeholder="e.g., 1700"
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="block mb-2 text-sm font-semibold text-slate-700">
                    Your Color
                  </label>
                  <select
                    name="color"
                    value={gameForm.color}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  >
                    <option value="W">⚪ White</option>
                    <option value="B">⚫ Black</option>
                  </select>
                </div>

                {/* Result */}
                <div>
                  <label className="block mb-2 text-sm font-semibold text-slate-700">
                    Result
                  </label>
                  <select
                    name="result"
                    value={gameForm.result}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  >
                    <option value="W">✅ Win</option>
                    <option value="D">➖ Draw</option>
                    <option value="L">❌ Loss</option>
                  </select>
                </div>

                {/* ECO Code */}
                <div>
                  <label className="block mb-2 text-sm font-semibold text-slate-700">
                    ECO Code (Optional)
                  </label>
                  <input
                    type="text"
                    name="eco"
                    value={gameForm.eco}
                    onChange={handleInputChange}
                    placeholder="e.g., B23"
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>

                {/* Rated */}
                <div className="flex items-center pt-8">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="rated"
                      checked={gameForm.rated}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-emerald-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-sm font-semibold text-slate-700">Rated Game</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAddGame}
                  className="px-6 py-2.5 text-sm font-medium text-white transition-all duration-300 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105"
                >
                  ✓ Add Game
                </button>
                <button
                  onClick={resetForm}
                  className="px-6 py-2.5 text-sm font-medium text-slate-700 transition-all bg-slate-100 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>

              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <LightBulbIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800">
                  <strong>Tip:</strong> Tournament and ELO are preserved when adding multiple games from the same event. Games are saved automatically to your browser's localStorage.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PGN Import Section */}
      <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg border border-slate-200/60 transition-all duration-300 hover:shadow-xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-600"></div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <DocumentTextIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">PGN Import</h3>
                <p className="text-sm text-slate-600">Import games from PGN notation</p>
              </div>
            </div>
            <button
              onClick={() => setShowPgnImport(!showPgnImport)}
              className="px-4 py-2 text-sm font-medium text-white transition-all duration-300 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105"
            >
              {showPgnImport ? '✕ Close Import' : '📥 Import Games'}
            </button>
          </div>

          {showPgnImport && (
            <div className="space-y-4 animate-slideUp">
              <div>
                <label className="block mb-2 text-sm font-medium text-slate-700">
                  Paste PGN text below:
                </label>
                <textarea
                  value={pgnText}
                  onChange={(e) => setPgnText(e.target.value)}
                  placeholder={`[Event "Tournament Name"]\n[White "Player1"]\n[Black "Player2"]\n[Result "1-0"]\n[WhiteElo "1800"]\n[BlackElo "1750"]\n[ECO "B23"]\n\n1. e4 c5 2. Nc3 ...`}
                  className="w-full h-64 px-4 py-3 font-mono text-sm border-2 border-slate-300 rounded-xl resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handlePgnImport}
                  className="px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:shadow-lg hover:shadow-emerald-500/30"
                >
                  ✓ Parse PGN
                </button>
                <button
                  onClick={() => {
                    setPgnText('');
                    setShowPgnImport(false);
                  }}
                  className="px-5 py-2.5 text-sm font-medium text-slate-700 transition-all bg-slate-100 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <LightBulbIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800">
                  <strong>How to use:</strong> Paste your PGN text, then enter your name as it appears in the games and your ELO rating. Games will be automatically added to your database.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

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
      <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg border border-slate-200/60">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-600"></div>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-100 rounded-xl">
              <ClockIcon className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">⏰ Time of Day Performance</h3>
              <p className="text-sm text-slate-600">Analyze when you perform best during the day</p>
            </div>
          </div>

          {/* Performance Summary Cards */}
          <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
            {timeOfDayStats.slice(0, 3).map((slot, idx) => {
              const isTopPerformer = idx === 0;
              return (
                <div key={idx} className={`p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-md ${
                  isTopPerformer
                    ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700">{slot.time}</span>
                    {isTopPerformer && (
                      <span className="px-2 py-0.5 text-xs font-bold text-emerald-700 bg-emerald-200 rounded-full">
                        🏆 BEST
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900">{slot.score}%</span>
                    <span className="text-sm text-slate-600">score</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-600">
                    <span className="text-emerald-600 font-medium">{slot.wins}W</span> -
                    <span className="text-amber-600 font-medium">{slot.draws}D</span> -
                    <span className="text-rose-600 font-medium">{slot.losses}L</span>
                    <span className="ml-2 text-slate-500">({slot.total} games)</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Enhanced Table */}
          <div className="overflow-hidden border border-slate-200 rounded-xl">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold text-left text-slate-700 uppercase tracking-wider">Time Slot</th>
                    <th className="px-6 py-3 text-xs font-semibold text-center text-slate-700 uppercase tracking-wider">Games</th>
                    <th className="px-6 py-3 text-xs font-semibold text-center text-slate-700 uppercase tracking-wider">W-D-L</th>
                    <th className="px-6 py-3 text-xs font-semibold text-center text-slate-700 uppercase tracking-wider">Score %</th>
                    <th className="px-6 py-3 text-xs font-semibold text-center text-slate-700 uppercase tracking-wider">Win Rate</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {timeOfDayStats.map((slot, idx) => (
                    <tr key={idx} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{slot.time}</td>
                      <td className="px-6 py-4 text-sm text-center text-slate-700">{slot.total}</td>
                      <td className="px-6 py-4 text-sm text-center">
                        <span className="text-emerald-600 font-medium">{slot.wins}</span>
                        <span className="text-slate-400 mx-1">-</span>
                        <span className="text-amber-600 font-medium">{slot.draws}</span>
                        <span className="text-slate-400 mx-1">-</span>
                        <span className="text-rose-600 font-medium">{slot.losses}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        <span className="px-3 py-1 font-bold text-slate-900 bg-slate-100 rounded-lg">
                          {slot.score}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        <span className={`px-3 py-1 font-bold rounded-lg ${
                          parseFloat(slot.winRate) >= 50
                            ? 'text-emerald-700 bg-emerald-100'
                            : 'text-rose-700 bg-rose-100'
                        }`}>
                          {slot.winRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Enhanced Visual Chart */}
          <div className="mt-6 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
            <h4 className="mb-4 text-sm font-semibold text-slate-700 flex items-center gap-2">
              <ChartBarIcon className="w-4 h-4" />
              Performance Distribution
            </h4>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={timeOfDayStats}>
                <defs>
                  <linearGradient id="colorWins" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.7}/>
                  </linearGradient>
                  <linearGradient id="colorDraws" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.7}/>
                  </linearGradient>
                  <linearGradient id="colorLosses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.7}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#64748b" style={{ fontSize: '12px', fontWeight: 600 }} />
                <YAxis stroke="#64748b" style={{ fontSize: '12px', fontWeight: 600 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 600 }} />
                <Bar dataKey="wins" fill="url(#colorWins)" name="Wins" radius={[8, 8, 0, 0]} />
                <Bar dataKey="draws" fill="url(#colorDraws)" name="Draws" radius={[8, 8, 0, 0]} />
                <Bar dataKey="losses" fill="url(#colorLosses)" name="Losses" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tournament Comparison */}
      <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg border border-slate-200/60">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-600"></div>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-xl">
              <TrophyIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">🏆 Tournament Comparison</h3>
              <p className="text-sm text-slate-600">Compare your performance across all rated tournaments</p>
            </div>
          </div>

          {/* Tournament Stats Summary */}
          <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2">
            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-purple-700">Total Tournaments</span>
                <TrophyIcon className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-purple-900">{tournamentComparison.length}</span>
                <span className="text-sm text-purple-600">events</span>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-emerald-700">Best Performance</span>
                <SparklesIcon className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-emerald-900">
                  {Math.max(...tournamentComparison.map(t => t.performance || 0))}
                </span>
                <span className="text-sm text-emerald-600">rating</span>
              </div>
            </div>
          </div>

          {/* Enhanced Table */}
          <div className="overflow-hidden border border-slate-200 rounded-xl">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-left text-slate-700 uppercase tracking-wider">Tournament</th>
                    <th className="px-4 py-3 text-xs font-semibold text-center text-slate-700 uppercase tracking-wider">Games</th>
                    <th className="px-4 py-3 text-xs font-semibold text-center text-slate-700 uppercase tracking-wider">Score %</th>
                    <th className="px-4 py-3 text-xs font-semibold text-center text-slate-700 uppercase tracking-wider">Your ELO</th>
                    <th className="px-4 py-3 text-xs font-semibold text-center text-slate-700 uppercase tracking-wider">Avg Opp</th>
                    <th className="px-4 py-3 text-xs font-semibold text-center text-slate-700 uppercase tracking-wider">Performance</th>
                    <th className="px-4 py-3 text-xs font-semibold text-center text-slate-700 uppercase tracking-wider">ELO Δ</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {tournamentComparison.map((t, idx) => (
                    <tr key={idx} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{t.name}</td>
                      <td className="px-4 py-3 text-sm text-center text-slate-700">{t.games}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={`px-2.5 py-1 font-bold rounded-lg ${
                          t.score >= 50 ? 'text-emerald-700 bg-emerald-100' : 'text-rose-700 bg-rose-100'
                        }`}>
                          {t.score}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className="px-2.5 py-1 font-semibold text-blue-700 bg-blue-100 rounded-lg">
                          {t.playerElo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className="px-2.5 py-1 font-semibold text-purple-700 bg-purple-100 rounded-lg">
                          {t.avgOppElo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={`px-2.5 py-1 font-bold rounded-lg ${
                          t.performance > t.playerElo ? 'text-emerald-700 bg-emerald-100' :
                          t.performance < t.playerElo ? 'text-rose-700 bg-rose-100' : 'text-slate-700 bg-slate-100'
                        }`}>
                          {t.performance || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={`px-2.5 py-1 font-bold rounded-lg ${
                          t.eloChange > 0 ? 'text-emerald-700 bg-emerald-100' :
                          t.eloChange < 0 ? 'text-rose-700 bg-rose-100' : 'text-slate-700 bg-slate-100'
                        }`}>
                          {t.eloChange > 0 ? '+' : ''}{t.eloChange}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Enhanced Tournament Performance Trend Chart */}
          <div className="mt-6 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
            <h4 className="mb-4 text-sm font-semibold text-slate-700 flex items-center gap-2">
              <ChartBarIcon className="w-4 h-4" />
              Performance Rating Trend
            </h4>
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={tournamentComparison}>
                <defs>
                  <linearGradient id="gradientPlayerElo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="gradientOppElo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="gradientPerformance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  angle={-15}
                  textAnchor="end"
                  height={80}
                  style={{ fontWeight: 600 }}
                />
                <YAxis stroke="#64748b" domain={[1600, 2100]} style={{ fontSize: '12px', fontWeight: 600 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 600 }} />
                <Area
                  type="monotone"
                  dataKey="playerElo"
                  stroke="#3b82f6"
                  fill="url(#gradientPlayerElo)"
                  name="Your ELO"
                  strokeWidth={3}
                />
                <Line
                  type="monotone"
                  dataKey="avgOppElo"
                  stroke="#8b5cf6"
                  name="Avg Opponent"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#8b5cf6', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="performance"
                  stroke="#10b981"
                  name="Performance"
                  strokeWidth={3}
                  connectNulls
                  dot={{ fill: '#10b981', r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTab;
