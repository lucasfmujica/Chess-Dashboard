import React from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FireIcon, TrophyIcon, ChartBarSquareIcon, SparklesIcon } from '@heroicons/react/24/outline';

const TrendsTab = ({ formStats, streaks, monthlyStats }) => {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-pink-600 to-rose-700 rounded-2xl shadow-xl">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative px-8 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
              <SparklesIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Performance Trends</h2>
              <p className="text-pink-100">Track your momentum and form over time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Current Form Card */}
        <div className="relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"></div>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <ChartBarSquareIcon className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Current Form</h3>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Last 5 Games</p>
                <p className="text-3xl font-bold text-emerald-600">{formStats.last5.score}</p>
                <p className="text-sm text-gray-500 mb-3">{formStats.last5.percentage}% success rate</p>
                <div className="flex gap-1.5">
                  {formStats.last5.details.map((result, idx) => (
                    <div
                      key={idx}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-md ${
                        result === 'W' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' :
                        result === 'D' ? 'bg-gradient-to-br from-amber-400 to-amber-500' :
                        'bg-gradient-to-br from-rose-500 to-rose-600'
                      }`}
                    >
                      {result}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-600 mb-1">Last 10 Games</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-blue-600">{formStats.last10.score}</p>
                  <p className="text-sm text-gray-500">({formStats.last10.percentage}%)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Current Streak Card */}
        <div className="relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500"></div>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-orange-50 rounded-xl">
                <FireIcon className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Current Streak</h3>
            </div>

            <div className="text-center mb-6">
              <div className={`text-6xl font-bold mb-2 ${
                streaks.current.type === 'win' ? 'text-emerald-600' :
                streaks.current.type === 'loss' ? 'text-rose-600' : 'text-blue-600'
              }`}>
                {streaks.current.count}
              </div>
              <div className={`inline-flex px-4 py-2 rounded-full font-semibold ${
                streaks.current.type === 'win' ? 'bg-emerald-100 text-emerald-700' :
                streaks.current.type === 'loss' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {streaks.current.type === 'win' ? '🔥 Win Streak' :
                  streaks.current.type === 'loss' ? '💫 Loss Streak' : '⭐ Unbeaten Streak'}
              </div>
            </div>

            <div className="pt-4 space-y-3 border-t border-gray-200">
              <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Longest Win Streak</span>
                <span className="text-lg font-bold text-emerald-600">{streaks.longestWin}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Longest Unbeaten</span>
                <span className="text-lg font-bold text-blue-600">{streaks.longestUnbeaten}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Performance Card */}
        <div className="relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500"></div>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-violet-50 rounded-xl">
                <TrophyIcon className="w-6 h-6 text-violet-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Recent Tournaments</h3>
            </div>

            <div className="space-y-3">
              {monthlyStats.slice(-3).map((stat, idx) => (
                <div key={idx} className="p-3 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{stat.tournament.split(' ')[0]}</p>
                      <p className="text-xs text-gray-500">{stat.games} games played</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex-1">
                      <span className="text-xs text-gray-600">Rating: </span>
                      <span className="font-bold text-violet-600">{stat.performanceRating}</span>
                    </div>
                    <div className="flex-1 text-right">
                      <span className="text-xs text-gray-600">Wins: </span>
                      <span className="font-bold text-emerald-600">{stat.winRate}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tournament Performance Chart */}
      <div className="relative overflow-hidden bg-white rounded-xl shadow-lg">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"></div>
        <div className="p-8">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Tournament Performance Analysis</h3>
            <p className="text-gray-600">Win rate and performance rating across tournaments</p>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={monthlyStats}>
              <defs>
                <linearGradient id="winRateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="performanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="tournament"
                angle={-45}
                textAnchor="end"
                height={100}
                stroke="#6b7280"
              />
              <YAxis
                yAxisId="left"
                domain={[25, 75]}
                label={{ value: 'Win Rate %', angle: -90, position: 'insideLeft' }}
                stroke="#10b981"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[1500, 2500]}
                label={{ value: 'Performance', angle: 90, position: 'insideRight' }}
                stroke="#3b82f6"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="p-4 bg-white border-0 rounded-xl shadow-xl">
                        <p className="font-bold text-gray-900 text-lg mb-2">{data.tournament}</p>
                        <div className="space-y-1">
                          <div className="flex justify-between gap-6">
                            <span className="text-sm text-gray-600">Win Rate:</span>
                            <span className="text-sm font-bold text-emerald-600">{data.winRate}%</span>
                          </div>
                          <div className="flex justify-between gap-6">
                            <span className="text-sm text-gray-600">Performance:</span>
                            <span className="text-sm font-bold text-blue-600">{data.performanceRating}</span>
                          </div>
                          <div className="flex justify-between gap-6">
                            <span className="text-sm text-gray-600">Games:</span>
                            <span className="text-sm font-semibold text-gray-700">{data.games}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="winRate"
                stroke="#10b981"
                strokeWidth={3}
                name="Win Rate %"
                dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 7 }}
                fill="url(#winRateGradient)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="performanceRating"
                stroke="#3b82f6"
                strokeWidth={3}
                name="Performance"
                dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 7 }}
                fill="url(#performanceGradient)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ELO Progression Chart */}
      <div className="relative overflow-hidden bg-white rounded-xl shadow-lg">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500"></div>
        <div className="p-8">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Rating Evolution</h3>
            <p className="text-gray-600">Your ELO progression across tournaments</p>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={monthlyStats}>
              <defs>
                <linearGradient id="eloTrendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="tournament"
                angle={-45}
                textAnchor="end"
                height={100}
                stroke="#6b7280"
              />
              <YAxis
                domain={[1600, 1950]}
                label={{ value: 'ELO Rating', angle: -90, position: 'insideLeft' }}
                stroke="#6b7280"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="p-4 bg-white border-0 rounded-xl shadow-xl">
                        <p className="font-bold text-gray-900 text-lg mb-2">{data.tournament}</p>
                        <p className="font-bold text-purple-600 text-2xl">ELO: {data.elo}</p>
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
                stroke="#8b5cf6"
                strokeWidth={4}
                name="ELO Rating"
                dot={{ r: 6, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 8, fill: '#7c3aed' }}
                fill="url(#eloTrendGradient)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default TrendsTab;
