import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrophyIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, ChartBarIcon } from '@heroicons/react/24/outline';

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
        averagePerformance: 0
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
    for (let i = 1; i < eloHistory.length; i++) {
      const change = eloHistory[i].elo - eloHistory[i - 1].elo;
      if (change > biggestGain) biggestGain = change;
      if (change < biggestLoss) biggestLoss = change;
    }

    // Calculate average performance differential
    const totalDiff = eloHistory.reduce((sum, game) => sum + game.diff, 0);
    const averagePerformance = totalDiff / eloHistory.length;

    return {
      currentElo,
      highestElo,
      lowestElo,
      totalChange,
      biggestGain,
      biggestLoss,
      averagePerformance
    };
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Highest Rating */}
        <div className="relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-amber-600"></div>
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-amber-50 rounded-xl">
                <TrophyIcon className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Peak Rating</p>
            <p className="text-3xl font-bold text-gray-900">{stats.highestElo}</p>
          </div>
        </div>

        {/* Biggest Gain */}
        <div className="relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-emerald-600"></div>
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <ArrowTrendingUpIcon className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Biggest Gain</p>
            <p className="text-3xl font-bold text-emerald-600">+{stats.biggestGain}</p>
          </div>
        </div>

        {/* Biggest Loss */}
        <div className="relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-rose-400 to-rose-600"></div>
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-rose-50 rounded-xl">
                <ArrowTrendingDownIcon className="w-6 h-6 text-rose-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Biggest Loss</p>
            <p className="text-3xl font-bold text-rose-600">{stats.biggestLoss}</p>
          </div>
        </div>

        {/* Average Performance */}
        <div className="relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-blue-600"></div>
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <ChartBarIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Avg Performance</p>
            <p className={`text-3xl font-bold ${stats.averagePerformance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {stats.averagePerformance >= 0 ? '+' : ''}{stats.averagePerformance.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* ELO Progression Chart */}
      <div className="relative overflow-hidden bg-white rounded-xl shadow-lg">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500"></div>
        <div className="p-8">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Rating Progression</h3>
            <p className="text-gray-600">Your ELO journey over all games</p>
          </div>
          <ResponsiveContainer width="100%" height={450}>
            <LineChart data={eloHistory}>
              <defs>
                <linearGradient id="eloGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="game"
                label={{ value: 'Game Number', position: 'insideBottom', offset: -5 }}
                stroke="#6b7280"
              />
              <YAxis
                domain={[1400, 1950]}
                label={{ value: 'ELO Rating', angle: -90, position: 'insideLeft' }}
                stroke="#6b7280"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="p-4 bg-white border-0 rounded-xl shadow-xl">
                        <p className="font-bold text-gray-900 text-lg mb-2">Game {data.game}</p>
                        <p className="text-sm text-indigo-600 font-medium mb-1">{data.tournament}</p>
                        <p className="text-sm text-gray-700 mb-1">vs {data.opponent}</p>
                        <p className="text-sm text-gray-500 mb-2">{data.opening}</p>
                        <div className="pt-2 border-t border-gray-200">
                          <p className="font-bold text-blue-600 text-xl">ELO: {data.elo}</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="elo"
                stroke="#3b82f6"
                strokeWidth={3}
                name="ELO Rating"
                dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, fill: '#2563eb' }}
                fill="url(#eloGradient)"
              />
            </LineChart>
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
    </div>
  );
};

export default RatingTab;
