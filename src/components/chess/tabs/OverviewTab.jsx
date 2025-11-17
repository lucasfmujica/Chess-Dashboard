import React from 'react';
import { CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ArgentinaMap from '../../charts/ArgentinaMap';
import StatCard from '../StatCard';

const OverviewTab = ({
  playerInfo,
  overallStats,
  whiteStats,
  blackStats,
  ratedGames,
  eloHistory,
  tournamentStats,
  bestResults,
  worstResults,
  Trophy,
  Swords,
  Target,
  TrendingUp
}) => {
  // Generate ELO progress timeline from tournament stats (use starting ELO for each tournament)
  const eloTimeline = tournamentStats && tournamentStats.length > 0 ?
    tournamentStats.map((t, idx) => ({
      tournament: t.name.length > 15 ? t.name.substring(0, 15) + '...' : t.name,
      elo: t.eloBefore || playerInfo.current_elo,
      performanceRating: t.performanceRating
    })) : [];

  // Extract numeric score from whiteStats and blackStats
  const whiteScore = whiteStats.score || '0/0';
  const blackScore = blackStats.score || '0/0';
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <StatCard
          title="Current ELO"
          value={playerInfo.current_elo}
          subtitle={`${playerInfo.elo_change_last_tournament > 0 ? '+' : ''}${playerInfo.elo_change_last_tournament} last tournament`}
          icon={Trophy}
          trend={playerInfo.elo_change_last_tournament > 0 ? 'up' : 'down'}
        />
        <StatCard
          title="Total Games"
          value={overallStats.total}
          subtitle={`Win rate: ${overallStats.winRate}%`}
          icon={Swords}
        />
        <StatCard
          title="Performance Rating"
          value={overallStats.performanceRating}
          subtitle={`Score: ${overallStats.actualScore}/${overallStats.total}`}
          icon={Target}
          trend={overallStats.performanceRating > playerInfo.current_elo ? 'up' : 'down'}
        />
        <StatCard
          title="Expected vs Actual"
          value={overallStats.actualScore}
          subtitle={`Expected: ${overallStats.expectedScore}`}
          icon={TrendingUp}
          trend={parseFloat(overallStats.actualScore) > parseFloat(overallStats.expectedScore) ? 'up' : 'down'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="p-6 bg-white rounded-lg shadow-md">
          <h3 className="mb-4 text-lg font-semibold">Results Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Wins', value: overallStats.wins },
                  { name: 'Draws', value: overallStats.draws },
                  { name: 'Losses', value: overallStats.losses }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell fill="#10b981" />
                <Cell fill="#f59e0b" />
                <Cell fill="#ef4444" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="p-6 bg-white rounded-lg shadow-md">
          <h3 className="mb-4 text-lg font-semibold">Performance by Color</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">White</span>
                <span className="text-sm font-semibold text-gray-900">{whiteScore}</span>
              </div>
              <div className="w-full h-4 bg-gray-200 rounded-full">
                <div
                  className="h-4 bg-blue-600 rounded-full"
                  style={{ width: `${whiteStats.winRate}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">{whiteStats.winRate}% win rate • {whiteStats.wins}-{whiteStats.draws}-{whiteStats.losses}</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Black</span>
                <span className="text-sm font-semibold text-gray-900">{blackScore}</span>
              </div>
              <div className="w-full h-4 bg-gray-200 rounded-full">
                <div
                  className="h-4 bg-gray-800 rounded-full"
                  style={{ width: `${blackStats.winRate}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">{blackStats.winRate}% win rate • {blackStats.wins}-{blackStats.draws}-{blackStats.losses}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="p-6 bg-white rounded-lg shadow-md">
          <h3 className="mb-4 text-lg font-semibold">ELO Progress Timeline</h3>
          {eloTimeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={eloTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="tournament" angle={-15} textAnchor="end" height={70} stroke="#64748b" tick={{ fontSize: 12 }} />
                <YAxis domain={['auto', 'auto']} stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="elo" stroke="#3b82f6" strokeWidth={3} name="ELO Rating" dot={{ r: 5 }} />
                <Line type="monotone" dataKey="performanceRating" stroke="#10b981" strokeWidth={2} name="Performance" dot={{ r: 4 }} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-500">
              <p>No tournament data available</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-white rounded-lg shadow-md">
          <h3 className="mb-4 text-lg font-semibold">Tournament Locations</h3>
          <ArgentinaMap games={ratedGames} />
        </div>
      </div>

      {/* Best and Worst Results */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Best Results */}
        <div className="p-6 bg-white rounded-lg shadow-md">
          <h3 className="mb-4 text-lg font-semibold text-emerald-700">🏆 Top 3 Wins</h3>
          <p className="mb-4 text-sm text-slate-600">Biggest upsets - victories against higher-rated opponents</p>
          <div className="space-y-3">
            {bestResults && bestResults.length > 0 ? (
              bestResults.map((result, idx) => (
                <div key={idx} className="p-4 border border-emerald-200 rounded-lg bg-emerald-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-900">{result.opponent}</span>
                    <span className="px-2 py-1 text-xs font-bold text-emerald-700 bg-emerald-200 rounded">
                      +{result.diff} ELO
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">
                    <div className="flex justify-between">
                      <span>Your ELO: {result.elo}</span>
                      <span>Opp ELO: {result.oppElo}</span>
                    </div>
                    <div className="mt-1">
                      <span className="font-medium">{result.color === 'W' ? '⚪' : '⚫'} {result.opening}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {result.tournament}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No wins recorded yet</p>
            )}
          </div>
        </div>

        {/* Worst Results */}
        <div className="p-6 bg-white rounded-lg shadow-md">
          <h3 className="mb-4 text-lg font-semibold text-rose-700">⚠️ Top 3 Losses to Study</h3>
          <p className="mb-4 text-sm text-slate-600">Losses against lower-rated opponents - learning opportunities</p>
          <div className="space-y-3">
            {worstResults && worstResults.length > 0 ? (
              worstResults.map((result, idx) => (
                <div key={idx} className="p-4 border border-rose-200 rounded-lg bg-rose-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-900">{result.opponent}</span>
                    <span className="px-2 py-1 text-xs font-bold text-rose-700 bg-rose-200 rounded">
                      {result.diff > 0 ? `+${result.diff}` : result.diff} ELO
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">
                    <div className="flex justify-between">
                      <span>Your ELO: {result.elo}</span>
                      <span>Opp ELO: {result.oppElo}</span>
                    </div>
                    <div className="mt-1">
                      <span className="font-medium">{result.color === 'W' ? '⚪' : '⚫'} {result.opening}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {result.tournament}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No losses recorded yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Additional Stats Summary */}
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h3 className="mb-4 text-lg font-semibold">Quick Stats Summary</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="p-4 text-center bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-900">{overallStats.wins}</div>
            <div className="text-sm text-slate-600">Total Wins</div>
          </div>
          <div className="p-4 text-center bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-900">{overallStats.draws}</div>
            <div className="text-sm text-slate-600">Total Draws</div>
          </div>
          <div className="p-4 text-center bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-900">{overallStats.losses}</div>
            <div className="text-sm text-slate-600">Total Losses</div>
          </div>
          <div className="p-4 text-center bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-900">
              {((parseFloat(overallStats.actualScore) / overallStats.total) * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-slate-600">Score Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
