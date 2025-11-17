import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrophyIcon, ChartBarIcon, StarIcon, UsersIcon } from '@heroicons/react/24/outline';

const TournamentsTab = ({ tournamentStats }) => {
  // Calculate summary statistics
  const stats = useMemo(() => {
    if (!tournamentStats || tournamentStats.length === 0) {
      return {
        totalTournaments: 0,
        totalGames: 0,
        bestPerformance: 0,
        averageScore: 0,
        totalWins: 0,
        totalDraws: 0,
        totalLosses: 0
      };
    }

    const totalTournaments = tournamentStats.length;
    const totalGames = tournamentStats.reduce((sum, t) => sum + t.total, 0);
    const bestPerformance = Math.max(...tournamentStats.map(t => t.performanceRating));
    const totalWins = tournamentStats.reduce((sum, t) => sum + t.wins, 0);
    const totalDraws = tournamentStats.reduce((sum, t) => sum + t.draws, 0);
    const totalLosses = tournamentStats.reduce((sum, t) => sum + t.losses, 0);
    const averageScore = ((totalWins + (totalDraws * 0.5)) / totalGames * 100).toFixed(1);

    return {
      totalTournaments,
      totalGames,
      bestPerformance,
      averageScore,
      totalWins,
      totalDraws,
      totalLosses
    };
  }, [tournamentStats]);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-600 via-orange-600 to-red-700 rounded-2xl shadow-xl">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative px-8 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
              <TrophyIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Tournament History</h2>
              <p className="text-orange-100">Complete record of your competitive performance</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-orange-100 text-sm font-medium mb-1">Tournaments</p>
              <p className="text-3xl font-bold text-white">{stats.totalTournaments}</p>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-orange-100 text-sm font-medium mb-1">Games Played</p>
              <p className="text-3xl font-bold text-white">{stats.totalGames}</p>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-orange-100 text-sm font-medium mb-1">Best Rating</p>
              <p className="text-3xl font-bold text-white">{stats.bestPerformance}</p>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-orange-100 text-sm font-medium mb-1">Avg Score</p>
              <p className="text-3xl font-bold text-white">{stats.averageScore}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-emerald-600"></div>
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <StarIcon className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Wins</p>
            <p className="text-3xl font-bold text-emerald-600">{stats.totalWins}</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-amber-600"></div>
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-amber-50 rounded-xl">
                <ChartBarIcon className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Draws</p>
            <p className="text-3xl font-bold text-amber-600">{stats.totalDraws}</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-rose-400 to-rose-600"></div>
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-rose-50 rounded-xl">
                <UsersIcon className="w-6 h-6 text-rose-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Losses</p>
            <p className="text-3xl font-bold text-rose-600">{stats.totalLosses}</p>
          </div>
        </div>
      </div>

      {/* Tournament Table */}
      <div className="relative overflow-hidden bg-white rounded-xl shadow-lg">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500"></div>
        <div className="p-8">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Tournament Performance</h3>
            <p className="text-gray-600">Detailed breakdown of all tournament results</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="px-6 py-4 text-xs font-bold text-left text-gray-700 uppercase tracking-wider">Tournament</th>
                  <th className="px-6 py-4 text-xs font-bold text-center text-gray-700 uppercase tracking-wider">Games</th>
                  <th className="px-6 py-4 text-xs font-bold text-center text-gray-700 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-4 text-xs font-bold text-center text-gray-700 uppercase tracking-wider">W-D-L</th>
                  <th className="px-6 py-4 text-xs font-bold text-center text-gray-700 uppercase tracking-wider">Avg Opp</th>
                  <th className="px-6 py-4 text-xs font-bold text-center text-gray-700 uppercase tracking-wider">Performance</th>
                  <th className="px-6 py-4 text-xs font-bold text-center text-gray-700 uppercase tracking-wider">White</th>
                  <th className="px-6 py-4 text-xs font-bold text-center text-gray-700 uppercase tracking-wider">Black</th>
                  <th className="px-6 py-4 text-xs font-bold text-center text-gray-700 uppercase tracking-wider">ELO Δ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tournamentStats.map((t, idx) => (
                  <tr key={idx} className="hover:bg-gradient-to-r hover:from-slate-50 hover:to-transparent transition-colors duration-150">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{t.tournament}</td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {t.total}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-center text-gray-900">{t.score}</td>
                    <td className="px-6 py-4 text-sm text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-semibold text-xs">{t.wins}</span>
                        <span className="text-gray-400">-</span>
                        <span className="inline-flex items-center px-2 py-1 rounded bg-amber-100 text-amber-700 font-semibold text-xs">{t.draws}</span>
                        <span className="text-gray-400">-</span>
                        <span className="inline-flex items-center px-2 py-1 rounded bg-rose-100 text-rose-700 font-semibold text-xs">{t.losses}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-gray-700 font-medium">{t.avgOppElo}</td>
                    <td className="px-6 py-4 text-sm font-bold text-center">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold">
                        {t.performanceRating}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-gray-700 font-medium">{t.whitePerformance}</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-700 font-medium">{t.blackPerformance}</td>
                    <td className="px-6 py-4 text-sm font-bold text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-bold ${
                        t.eloChange > 0 ? 'bg-emerald-100 text-emerald-700' :
                        t.eloChange < 0 ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-700'
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
      </div>

      {/* Performance Chart */}
      <div className="relative overflow-hidden bg-white rounded-xl shadow-lg">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        <div className="p-8">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Performance Rating Comparison</h3>
            <p className="text-gray-600">Visual comparison of performance ratings across tournaments</p>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={tournamentStats} layout="vertical">
              <defs>
                <linearGradient id="performanceBarGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" domain={[1600, 2100]} stroke="#6b7280" />
              <YAxis type="category" dataKey="tournament" width={150} stroke="#6b7280" />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="p-4 bg-white border-0 rounded-xl shadow-xl">
                        <p className="font-bold text-gray-900 text-lg mb-3">{data.tournament}</p>
                        <div className="space-y-2">
                          <div className="flex justify-between gap-6">
                            <span className="text-sm text-gray-600">Performance:</span>
                            <span className="text-sm font-bold text-blue-600">{data.performanceRating}</span>
                          </div>
                          <div className="flex justify-between gap-6">
                            <span className="text-sm text-gray-600">Score:</span>
                            <span className="text-sm font-semibold text-gray-700">{data.score}</span>
                          </div>
                          <div className="flex justify-between gap-6">
                            <span className="text-sm text-gray-600">Record:</span>
                            <span className="text-sm font-semibold text-gray-700">
                              {data.wins}-{data.draws}-{data.losses}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="performanceRating"
                fill="url(#performanceBarGradient)"
                name="Performance Rating"
                radius={[0, 8, 8, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default TournamentsTab;
