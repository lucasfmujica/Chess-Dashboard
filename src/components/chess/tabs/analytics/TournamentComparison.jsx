import React from 'react';
import PropTypes from 'prop-types';
import { Area, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrophyIcon, SparklesIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const TournamentComparison = ({ tournamentComparison }) => {
  return (
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
  );
};

TournamentComparison.propTypes = {
  tournamentComparison: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    games: PropTypes.number.isRequired,
    score: PropTypes.number.isRequired,
    playerElo: PropTypes.number.isRequired,
    avgOppElo: PropTypes.number.isRequired,
    performance: PropTypes.number,
    eloChange: PropTypes.number.isRequired,
  })).isRequired,
};

export default TournamentComparison;
