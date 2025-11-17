import React, { useMemo } from 'react';
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { TrophyIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, ChartBarIcon, FireIcon, BoltIcon } from '@heroicons/react/24/outline';

const RatingTab = ({ eloHistory }) => {
  // Calculate statistics
  const stats = useMemo(() => {
    if (!eloHistory || eloHistory.length === 0) {
      return {
        currentElo: 0,
        highestElo: 0,
        lowestElo: 0,
        totalChange: 0,
        biggestGain: 0,
        biggestLoss: 0,
        averagePerformance: 0,
        averageEloChange: 0,
        positiveGames: 0,
        negativeGames: 0
      };
    }

    const eloValues = eloHistory.map(h => h.elo);
    const currentElo = eloHistory[eloHistory.length - 1].elo;
    const highestElo = Math.max(...eloValues);
    const lowestElo = Math.min(...eloValues);
    const totalChange = currentElo - eloHistory[0].elo;

    // Calculate biggest gain and loss
    let biggestGain = 0;
    let biggestLoss = 0;
    let positiveGames = 0;
    let negativeGames = 0;
    let totalEloChange = 0;

    for (let i = 0; i < eloHistory.length; i++) {
      const change = eloHistory[i].eloChange;
      totalEloChange += change;
      if (change > biggestGain) biggestGain = change;
      if (change < biggestLoss) biggestLoss = change;
      if (change > 0) positiveGames++;
      if (change < 0) negativeGames++;
    }

    // Calculate average performance differential
    const totalDiff = eloHistory.reduce((sum, game) => sum + game.diff, 0);
    const averagePerformance = totalDiff / eloHistory.length;
    const averageEloChange = totalEloChange / eloHistory.length;

    return {
      currentElo,
      highestElo,
      lowestElo,
      totalChange,
      biggestGain,
      biggestLoss,
      averagePerformance,
      averageEloChange,
      positiveGames,
      negativeGames
    };
  }, [eloHistory]);

  // Calculate ELO change distribution
  const eloChangeDistribution = useMemo(() => {
    if (!eloHistory || eloHistory.length === 0) return [];

    const ranges = {
      '-20+': 0,
      '-10 to -19': 0,
      '-1 to -9': 0,
      '0': 0,
      '+1 to +9': 0,
      '+10 to +19': 0,
      '+20 to +29': 0,
      '+30+': 0
    };

    eloHistory.forEach(game => {
      const change = game.eloChange;
      if (change <= -20) ranges['-20+']++;
      else if (change >= -19 && change <= -10) ranges['-10 to -19']++;
      else if (change >= -9 && change <= -1) ranges['-1 to -9']++;
      else if (change === 0) ranges['0']++;
      else if (change >= 1 && change <= 9) ranges['+1 to +9']++;
      else if (change >= 10 && change <= 19) ranges['+10 to +19']++;
      else if (change >= 20 && change <= 29) ranges['+20 to +29']++;
      else if (change >= 30) ranges['+30+']++;
    });

    return Object.entries(ranges).map(([range, count]) => ({
      range,
      count,
      fill: range.startsWith('+') ? '#10b981' : range.startsWith('-') ? '#ef4444' : '#6b7280'
    }));
  }, [eloHistory]);

  // Tournament performance summary
  const tournamentPerformance = useMemo(() => {
    if (!eloHistory || eloHistory.length === 0) return [];

    const tournaments = {};
    eloHistory.forEach(game => {
      if (!tournaments[game.tournament]) {
        tournaments[game.tournament] = {
          name: game.tournament,
          totalChange: 0,
          games: 0,
          startElo: game.eloBefore,
          endElo: game.elo
        };
      }
      tournaments[game.tournament].totalChange += game.eloChange;
      tournaments[game.tournament].games++;
      tournaments[game.tournament].endElo = game.elo;
    });

    return Object.values(tournaments).map(t => ({
      ...t,
      avgChange: (t.totalChange / t.games).toFixed(1)
    }));
  }, [eloHistory]);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700 rounded-2xl shadow-xl">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative px-8 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
              <ChartBarIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">ELO Progress</h2>
              <p className="text-blue-100">Track your rating journey and performance</p>
            </div>
          </div>

          {/* Current ELO Display */}
          <div className="mt-6">
            <p className="text-blue-100 text-sm font-medium mb-2">Current Rating</p>
            <div className="flex items-baseline gap-3">
              <span className="text-6xl font-bold text-white">{stats.currentElo}</span>
              <span className={`text-2xl font-semibold ${stats.totalChange >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {stats.totalChange >= 0 ? '+' : ''}{stats.totalChange}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {/* Highest Rating */}
        <div className="relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-600"></div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg">
                <TrophyIcon className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Peak Rating</p>
            <p className="text-2xl font-bold text-gray-900">{stats.highestElo}</p>
          </div>
        </div>

        {/* Biggest Gain */}
        <div className="relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg">
                <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Best Game</p>
            <p className="text-2xl font-bold text-emerald-600">+{stats.biggestGain}</p>
          </div>
        </div>

        {/* Biggest Loss */}
        <div className="relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-400 to-rose-600"></div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-gradient-to-br from-rose-50 to-rose-100 rounded-lg">
                <ArrowTrendingDownIcon className="w-5 h-5 text-rose-600" />
              </div>
            </div>
            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Worst Game</p>
            <p className="text-2xl font-bold text-rose-600">{stats.biggestLoss}</p>
          </div>
        </div>

        {/* Average ELO Change */}
        <div className="relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <BoltIcon className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Avg Change</p>
            <p className={`text-2xl font-bold ${stats.averageEloChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {stats.averageEloChange >= 0 ? '+' : ''}{stats.averageEloChange.toFixed(1)}
            </p>
          </div>
        </div>

        {/* Positive Games */}
        <div className="relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-green-600"></div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                <FireIcon className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Rating Gains</p>
            <p className="text-2xl font-bold text-green-600">{stats.positiveGames}</p>
          </div>
        </div>

        {/* Negative Games */}
        <div className="relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-orange-600"></div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                <ChartBarIcon className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Rating Drops</p>
            <p className="text-2xl font-bold text-orange-600">{stats.negativeGames}</p>
          </div>
        </div>
      </div>

      {/* ELO Progression Chart */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-xl">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500"></div>
        <div className="p-8">
          <div className="mb-6">
            <h3 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Rating Progression
            </h3>
            <p className="text-gray-600">Complete journey from 1651 to {stats.currentElo} • {eloHistory.length} rated games</p>
          </div>
          <ResponsiveContainer width="100%" height={500}>
            <ComposedChart data={eloHistory}>
              <defs>
                <linearGradient id="eloAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
              <XAxis
                dataKey="game"
                label={{ value: 'Game Number', position: 'insideBottom', offset: -8, style: { fontSize: 14, fontWeight: 600 } }}
                stroke="#6b7280"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                domain={[1400, 1950]}
                label={{ value: 'ELO Rating', angle: -90, position: 'insideLeft', style: { fontSize: 14, fontWeight: 600 } }}
                stroke="#6b7280"
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const changeColor = data.eloChange > 0 ? 'text-emerald-600' : data.eloChange < 0 ? 'text-rose-600' : 'text-gray-600';
                    const changeBg = data.eloChange > 0 ? 'bg-emerald-50' : data.eloChange < 0 ? 'bg-rose-50' : 'bg-gray-50';
                    return (
                      <div className="p-5 bg-white border-2 border-blue-100 rounded-2xl shadow-2xl backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xl font-bold text-gray-900">Game {data.game}</p>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${changeBg} ${changeColor}`}>
                            {data.eloChange > 0 ? '+' : ''}{data.eloChange}
                          </span>
                        </div>
                        <p className="text-sm text-indigo-600 font-semibold mb-1">{data.tournament}</p>
                        <p className="text-sm text-gray-700 font-medium mb-1">vs {data.opponent}</p>
                        <p className="text-xs text-gray-500 mb-3">{data.opening}</p>
                        <div className="pt-3 border-t-2 border-gray-100 space-y-2">
                          <div className="flex justify-between gap-8">
                            <span className="text-sm text-gray-600 font-medium">Before:</span>
                            <span className="text-sm font-bold text-gray-800">{data.eloBefore}</span>
                          </div>
                          <div className="flex justify-between gap-8">
                            <span className="text-sm text-gray-600 font-medium">After:</span>
                            <span className="text-sm font-bold text-blue-600">{data.elo}</span>
                          </div>
                          <div className="flex justify-between gap-8">
                            <span className="text-sm text-gray-600 font-medium">K-factor:</span>
                            <span className="text-sm font-semibold text-purple-600">{data.kFactor}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Area
                type="monotone"
                dataKey="elo"
                fill="url(#eloAreaGradient)"
                stroke="none"
              />
              <Line
                type="monotone"
                dataKey="elo"
                stroke="#3b82f6"
                strokeWidth={3}
                name="ELO Rating"
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  const dotColor = payload.eloChange > 0 ? '#10b981' : payload.eloChange < 0 ? '#ef4444' : '#6b7280';
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill={dotColor}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  );
                }}
                activeDot={{ r: 8, fill: '#2563eb', stroke: '#fff', strokeWidth: 3 }}
              />
              <ReferenceLine y={stats.highestElo} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: `Peak: ${stats.highestElo}`, position: 'right', fill: '#f59e0b', fontSize: 12, fontWeight: 'bold' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="relative overflow-hidden bg-white rounded-xl shadow-lg">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500"></div>
        <div className="p-8">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Expected vs Actual Performance</h3>
            <p className="text-gray-600">Compare your actual results with statistical expectations</p>
          </div>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={eloHistory}>
              <defs>
                <linearGradient id="expectedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.3}/>
                </linearGradient>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="game"
                label={{ value: 'Game Number', position: 'insideBottom', offset: -5 }}
                stroke="#6b7280"
              />
              <YAxis
                domain={[0, 1]}
                label={{ value: 'Score', angle: -90, position: 'insideLeft' }}
                stroke="#6b7280"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const diffColor = data.diff > 0 ? 'text-emerald-600' : 'text-rose-600';
                    return (
                      <div className="p-4 bg-white border-0 rounded-xl shadow-xl">
                        <p className="font-bold text-gray-900 text-lg mb-2">Game {data.game}</p>
                        <p className="text-sm text-gray-600 mb-3">{data.opening}</p>
                        <div className="space-y-1 mb-2">
                          <div className="flex justify-between gap-4">
                            <span className="text-sm text-gray-600">Expected:</span>
                            <span className="text-sm font-semibold text-gray-700">{data.expected.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-sm text-gray-600">Actual:</span>
                            <span className="text-sm font-semibold text-blue-600">{data.actual.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-gray-200">
                          <div className="flex justify-between gap-4">
                            <span className="text-sm text-gray-600">Difference:</span>
                            <span className={`text-sm font-bold ${diffColor}`}>
                              {data.diff > 0 ? '+' : ''}{data.diff.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar dataKey="expected" fill="url(#expectedGradient)" name="Expected Score" radius={[8, 8, 0, 0]} />
              <Bar dataKey="actual" fill="url(#actualGradient)" name="Actual Score" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two column layout for new charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ELO Change Distribution */}
        <div className="relative overflow-hidden bg-white rounded-xl shadow-lg">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"></div>
          <div className="p-8">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Rating Change Distribution</h3>
              <p className="text-gray-600">How your rating changes are distributed across games</p>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={eloChangeDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="range"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 11 }}
                  stroke="#6b7280"
                />
                <YAxis
                  label={{ value: 'Games', angle: -90, position: 'insideLeft' }}
                  stroke="#6b7280"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-4 bg-white border-0 rounded-xl shadow-xl">
                          <p className="font-bold text-gray-900 text-lg mb-2">{data.range}</p>
                          <p className="text-sm text-gray-600">Games: <span className="font-bold text-blue-600">{data.count}</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {eloChangeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tournament Performance Comparison */}
        <div className="relative overflow-hidden bg-white rounded-xl shadow-lg">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
          <div className="p-8">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Tournament Performance</h3>
              <p className="text-gray-600">Rating change by tournament</p>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={tournamentPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  type="number"
                  label={{ value: 'Total ELO Change', position: 'insideBottom', offset: -5 }}
                  stroke="#6b7280"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  tick={{ fontSize: 10 }}
                  stroke="#6b7280"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-4 bg-white border-0 rounded-xl shadow-xl">
                          <p className="font-bold text-gray-900 text-base mb-2">{data.name}</p>
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600">Games: <span className="font-semibold text-gray-800">{data.games}</span></p>
                            <p className="text-sm text-gray-600">Total Change: <span className={`font-bold ${data.totalChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{data.totalChange >= 0 ? '+' : ''}{data.totalChange}</span></p>
                            <p className="text-sm text-gray-600">Avg/Game: <span className="font-semibold text-blue-600">{data.avgChange}</span></p>
                            <div className="pt-2 border-t border-gray-200 mt-2">
                              <p className="text-xs text-gray-500">Start: {data.startElo} → End: {data.endElo}</p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="totalChange" radius={[0, 8, 8, 0]}>
                  {tournamentPerformance.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.totalChange >= 0 ? '#10b981' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RatingTab;
