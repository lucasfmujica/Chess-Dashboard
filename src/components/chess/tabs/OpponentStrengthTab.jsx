import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getChartHeight } from '../../../utils/chartUtils';

const OpponentStrengthTab = ({ games, currentElo }) => {
  const strengthAnalysis = useMemo(() => {
    const ratedGames = games.filter(g => g.rated && g.opp_elo > 0 && g.elo > 0);

    // Define ELO brackets based on rating difference (opp_elo - player_elo at time of game)
    const brackets = [
      { label: 'Much Lower (-200+)', minDiff: -Infinity, maxDiff: -200, color: '#10b981' },
      { label: 'Lower (-100 to -199)', minDiff: -199, maxDiff: -100, color: '#22c55e' },
      { label: 'Similar (±99)', minDiff: -99, maxDiff: 99, color: '#3b82f6' },
      { label: 'Higher (+100 to +199)', minDiff: 100, maxDiff: 199, color: '#f59e0b' },
      { label: 'Much Higher (+200+)', minDiff: 200, maxDiff: Infinity, color: '#ef4444' },
    ];

    const analysis = brackets.map(bracket => {
      // Filter games based on rating difference at time of game
      const bracketGames = ratedGames.filter(g => {
        const diff = g.opp_elo - g.elo;
        return diff >= bracket.minDiff && diff <= bracket.maxDiff;
      });

      const wins = bracketGames.filter(g => g.result === 'W').length;
      const draws = bracketGames.filter(g => g.result === 'D').length;
      const losses = bracketGames.filter(g => g.result === 'L').length;
      const total = bracketGames.length;
      const score = wins + draws * 0.5;
      const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;
      const scorePercentage = total > 0 ? ((score / total) * 100).toFixed(1) : 0;

      // Calculate average ELO difference using player's ELO at time of each game
      const avgEloDiff = total > 0
        ? (bracketGames.reduce((sum, g) => sum + (g.opp_elo - g.elo), 0) / total).toFixed(0)
        : 0;

      // Calculate expected score using player's ELO at time of each game
      const expectedScore = bracketGames.reduce((sum, g) => {
        const ratingDiff = g.opp_elo - g.elo;
        const expected = 1 / (1 + Math.pow(10, ratingDiff / 400));
        return sum + expected;
      }, 0);
      const expectedPercentage = total > 0 ? ((expectedScore / total) * 100).toFixed(1) : 0;

      // Performance vs expected
      const performance = total > 0 ? (parseFloat(scorePercentage) - parseFloat(expectedPercentage)).toFixed(1) : 0;

      return {
        ...bracket,
        games: total,
        wins,
        draws,
        losses,
        score: score.toFixed(1),
        winRate: parseFloat(winRate),
        scorePercentage: parseFloat(scorePercentage),
        avgEloDiff: parseInt(avgEloDiff),
        expectedPercentage: parseFloat(expectedPercentage),
        performance: parseFloat(performance),
      };
    });

    return analysis;
  }, [games]);

  const chartData = useMemo(() => {
    return strengthAnalysis.map(bracket => ({
      bracket: bracket.label.split(' ')[0] + ' ' + bracket.label.match(/\([^)]+\)/)?.[0] || '',
      actual: bracket.scorePercentage,
      expected: bracket.expectedPercentage,
      games: bracket.games,
    }));
  }, [strengthAnalysis]);

  const strengthTrend = useMemo(() => {
    const ratedGames = games.filter(g => g.rated && g.opp_elo > 0 && g.elo > 0);

    return ratedGames.map((game, idx) => {
      // Use player's ELO at time of game, not current ELO
      const eloDiff = game.opp_elo - game.elo;
      const result = game.result === 'W' ? 1 : game.result === 'D' ? 0.5 : 0;

      return {
        game: idx + 1,
        eloDiff,
        result: result * 100,
        opponent: game.opp,
        oppElo: game.opp_elo,
        playerElo: game.elo,
      };
    });
  }, [games]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {strengthAnalysis.filter(b => b.games > 0).map((bracket, idx) => (
          <div key={idx} className="p-6 bg-white border-2 rounded-lg shadow-md" style={{ borderColor: bracket.color }}>
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">{bracket.label}</h3>
              <span className="px-2 py-1 text-xs font-bold text-white rounded" style={{ backgroundColor: bracket.color }}>
                {bracket.games} games
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Score</span>
                <span className="text-lg font-bold" style={{ color: bracket.color }}>
                  {bracket.scorePercentage}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Expected</span>
                <span className="text-gray-700">{bracket.expectedPercentage}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Performance</span>
                <span className={`font-semibold ${bracket.performance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {bracket.performance >= 0 ? '+' : ''}{bracket.performance}%
                </span>
              </div>
              <div className="pt-2 mt-2 border-t">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>W: {bracket.wins}</span>
                  <span>D: {bracket.draws}</span>
                  <span>L: {bracket.losses}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Performance vs Expected Chart - Enhanced */}
      <div className="relative overflow-hidden bg-white rounded-2xl shadow-xl border border-slate-200">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Performance vs Expected Score</h3>
              <p className="text-gray-600 text-sm">Analysis by opponent strength bracket</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={getChartHeight('large')}>
            <BarChart data={chartData} barGap={8}>
              <defs>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.8}/>
                </linearGradient>
                <linearGradient id="expectedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#64748b" stopOpacity={0.7}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
              <XAxis
                dataKey="bracket"
                angle={-15}
                textAnchor="end"
                height={90}
                tick={{ fontSize: 12, fontWeight: 600 }}
                stroke="#64748b"
              />
              <YAxis
                label={{ value: 'Score %', angle: -90, position: 'insideLeft', style: { fontSize: 14, fontWeight: 600 } }}
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                stroke="#64748b"
              />
              <Tooltip
                cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const performance = (data.actual - data.expected).toFixed(1);
                    const isPositive = parseFloat(performance) >= 0;
                    return (
                      <div className="p-4 bg-white border-2 border-blue-300 rounded-xl shadow-2xl">
                        <p className="font-bold text-lg text-gray-900 mb-3">{data.bracket}</p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-6">
                            <span className="text-sm text-gray-600">Actual Score:</span>
                            <span className="text-sm font-bold text-blue-600">{data.actual}%</span>
                          </div>
                          <div className="flex items-center justify-between gap-6">
                            <span className="text-sm text-gray-600">Expected:</span>
                            <span className="text-sm font-semibold text-gray-700">{data.expected}%</span>
                          </div>
                          <div className="pt-2 mt-2 border-t border-gray-200">
                            <div className="flex items-center justify-between gap-6">
                              <span className="text-sm font-semibold text-gray-700">Performance:</span>
                              <span className={`text-lg font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                {isPositive ? '+' : ''}{performance}%
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-gray-500 text-center">
                              {data.games} game{data.games !== 1 ? 's' : ''} played
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: 20 }}
                iconType="rect"
                iconSize={14}
              />
              <Bar
                dataKey="actual"
                fill="url(#actualGradient)"
                name="Actual Score %"
                radius={[8, 8, 0, 0]}
                maxBarSize={80}
              />
              <Bar
                dataKey="expected"
                fill="url(#expectedGradient)"
                name="Expected Score %"
                radius={[8, 8, 0, 0]}
                maxBarSize={80}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Breakdown Table */}
      <div className="p-6 bg-white rounded-lg shadow-md border border-slate-200">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Detailed Strength Analysis</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">Bracket</th>
                <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Games</th>
                <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">W-D-L</th>
                <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Score</th>
                <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Win Rate</th>
                <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Expected</th>
                <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Performance</th>
                <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Avg ELO Diff</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {strengthAnalysis.filter(b => b.games > 0).map((bracket, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center">
                      <div className="w-3 h-3 mr-2 rounded-full" style={{ backgroundColor: bracket.color }}></div>
                      <span className="font-medium text-gray-900">{bracket.label}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-700">{bracket.games}</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-700">
                    <span className="text-green-600">{bracket.wins}</span>-
                    <span className="text-yellow-600">{bracket.draws}</span>-
                    <span className="text-red-600">{bracket.losses}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-center text-gray-900">{bracket.score}</td>
                  <td className="px-6 py-4 text-sm text-center">
                    <span className={`font-semibold ${bracket.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                      {bracket.winRate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">{bracket.expectedPercentage}%</td>
                  <td className="px-6 py-4 text-sm text-center">
                    <span className={`font-bold ${bracket.performance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {bracket.performance >= 0 ? '+' : ''}{bracket.performance}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    <span className={`font-medium ${bracket.avgEloDiff >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {bracket.avgEloDiff >= 0 ? '+' : ''}{bracket.avgEloDiff}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results vs Opponent Rating Scatter */}
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h3 className="mb-4 text-lg font-semibold">Results by Opponent Rating Difference</h3>
        <ResponsiveContainer width="100%" height={getChartHeight('small')}>
          <LineChart data={strengthTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="game" label={{ value: 'Game Number', position: 'insideBottom', offset: -5 }} />
            <YAxis
              yAxisId="left"
              label={{ value: 'Result %', angle: -90, position: 'insideLeft' }}
              domain={[0, 100]}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{ value: 'ELO Difference', angle: 90, position: 'insideRight' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="p-3 bg-white border border-gray-300 rounded shadow">
                      <p className="font-semibold">Game {data.game}</p>
                      <p className="text-sm">Your ELO: {data.playerElo}</p>
                      <p className="text-sm">vs {data.opponent} ({data.oppElo})</p>
                      <p className="text-sm">ELO Diff: {data.eloDiff >= 0 ? '+' : ''}{data.eloDiff}</p>
                      <p className="text-sm">Result: {data.result}%</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="result" stroke="#10b981" strokeWidth={2} name="Result %" dot={{ r: 3 }} />
            <Line yAxisId="right" type="monotone" dataKey="eloDiff" stroke="#6366f1" strokeWidth={2} name="ELO Diff" dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="p-6 border-2 border-blue-200 rounded-lg shadow-md bg-gradient-to-r from-blue-50 to-indigo-50">
        <h3 className="flex items-center mb-4 text-lg font-semibold">
          <span className="mr-2 text-2xl">💡</span>
          Insights & Recommendations
        </h3>
        <div className="space-y-3">
          {strengthAnalysis.filter(b => b.games >= 5).map((bracket, idx) => {
            const isOverperforming = bracket.performance > 5;
            const isUnderperforming = bracket.performance < -5;

            if (isOverperforming) {
              return (
                <div key={idx} className="p-4 bg-green-100 border border-green-300 rounded-lg">
                  <p className="font-semibold text-green-900">✓ Strength: {bracket.label}</p>
                  <p className="text-sm text-green-800">
                    You're performing {bracket.performance}% above expectations in this bracket!
                    Your {bracket.scorePercentage}% score exceeds the expected {bracket.expectedPercentage}%.
                  </p>
                </div>
              );
            } else if (isUnderperforming) {
              return (
                <div key={idx} className="p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
                  <p className="font-semibold text-yellow-900">⚠ Area for Improvement: {bracket.label}</p>
                  <p className="text-sm text-yellow-800">
                    You're performing {Math.abs(bracket.performance)}% below expectations.
                    Focus on improving results against {bracket.label.toLowerCase()} opponents.
                  </p>
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
};

OpponentStrengthTab.propTypes = {
  games: PropTypes.arrayOf(PropTypes.shape({
    rated: PropTypes.bool,
    elo: PropTypes.number,
    opp_elo: PropTypes.number,
    result: PropTypes.string,
    opp: PropTypes.string,
  })).isRequired,
  currentElo: PropTypes.number.isRequired,
};

export default OpponentStrengthTab;
