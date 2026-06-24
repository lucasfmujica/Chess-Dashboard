import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getChartHeight } from '../../../utils/chartUtils';
import type { Game } from '../../../types/chess';

/** Per-bracket aggregate computed from rated games. */
interface BracketAnalysis {
  label: string;
  minDiff: number;
  maxDiff: number;
  color: string;
  games: number;
  bracketGames: Game[];
  wins: number;
  draws: number;
  losses: number;
  score: string;
  winRate: number;
  scorePercentage: number;
  avgEloDiff: number;
  expectedPercentage: number;
  performance: number;
}

interface SortConfig {
  key: 'date' | 'opp_elo' | 'eloDiff' | 'result';
  direction: 'asc' | 'desc';
}

interface OpponentStrengthTabProps {
  games: Game[];
  currentElo: number;
}

const OpponentStrengthTab = ({ games }: OpponentStrengthTabProps) => {
  const [selectedBracket, setSelectedBracket] = useState<BracketAnalysis | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });
  const strengthAnalysis = useMemo<BracketAnalysis[]>(() => {
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
      const performance = total > 0 ? (parseFloat(String(scorePercentage)) - parseFloat(String(expectedPercentage))).toFixed(1) : 0;

      return {
        ...bracket,
        games: total,
        bracketGames, // Include actual games for detail view
        wins,
        draws,
        losses,
        score: score.toFixed(1),
        winRate: parseFloat(String(winRate)),
        scorePercentage: parseFloat(String(scorePercentage)),
        avgEloDiff: parseInt(String(avgEloDiff)),
        expectedPercentage: parseFloat(String(expectedPercentage)),
        performance: parseFloat(String(performance)),
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
          <div
            key={idx}
            className={`p-6 bg-white border-2 rounded-lg shadow-md cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
              selectedBracket?.label === bracket.label ? 'ring-2 ring-offset-2' : ''
            }`}
            style={{
              borderColor: bracket.color,
              ...(selectedBracket?.label === bracket.label && { ringColor: bracket.color })
            }}
            onClick={() => setSelectedBracket(selectedBracket?.label === bracket.label ? null : bracket)}
          >
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
              <div className="mt-2 text-xs text-center text-gray-400">
                {selectedBracket?.label === bracket.label ? 'Click to close' : 'Click to view games'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Games Detail Panel */}
      {selectedBracket && (
        <div className="p-6 bg-white border-2 rounded-lg shadow-lg" style={{ borderColor: selectedBracket.color }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedBracket.color }}></div>
              <h3 className="text-lg font-semibold text-gray-900">
                Games vs {selectedBracket.label}
              </h3>
              <span className="px-2 py-1 text-xs font-semibold text-white rounded" style={{ backgroundColor: selectedBracket.color }}>
                {selectedBracket.games} games
              </span>
            </div>
            <button
              onClick={() => setSelectedBracket(null)}
              className="p-2 text-gray-400 transition-colors hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Sort Controls */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm text-gray-600">Sort by:</span>
            {[
              { key: 'date', label: 'Date' },
              { key: 'opp_elo', label: 'Opponent ELO' },
              { key: 'eloDiff', label: 'ELO Diff' },
              { key: 'result', label: 'Result' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => {
                  if (sortConfig.key === key) {
                    setSortConfig({ key: key as SortConfig['key'], direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' });
                  } else {
                    setSortConfig({ key: key as SortConfig['key'], direction: 'desc' });
                  }
                }}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  sortConfig.key === key
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
                {sortConfig.key === key && (
                  <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
            ))}
          </div>

          {/* Games Table */}
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-xs font-medium text-left text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-xs font-medium text-left text-gray-500 uppercase">Opponent</th>
                  <th className="px-4 py-2 text-xs font-medium text-center text-gray-500 uppercase">Your ELO</th>
                  <th className="px-4 py-2 text-xs font-medium text-center text-gray-500 uppercase">Opp ELO</th>
                  <th className="px-4 py-2 text-xs font-medium text-center text-gray-500 uppercase">Diff</th>
                  <th className="px-4 py-2 text-xs font-medium text-center text-gray-500 uppercase">Color</th>
                  <th className="px-4 py-2 text-xs font-medium text-center text-gray-500 uppercase">Result</th>
                  <th className="px-4 py-2 text-xs font-medium text-left text-gray-500 uppercase">Opening</th>
                  <th className="px-4 py-2 text-xs font-medium text-left text-gray-500 uppercase">Tournament</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[...selectedBracket.bracketGames]
                  .sort((a, b) => {
                    let aVal: number, bVal: number;
                    switch (sortConfig.key) {
                      case 'date':
                        aVal = new Date(a.date || 0).getTime();
                        bVal = new Date(b.date || 0).getTime();
                        break;
                      case 'opp_elo':
                        aVal = a.opp_elo;
                        bVal = b.opp_elo;
                        break;
                      case 'eloDiff':
                        aVal = a.opp_elo - a.elo;
                        bVal = b.opp_elo - b.elo;
                        break;
                      case 'result':
                        const resultOrder: Record<string, number> = { W: 3, D: 2, L: 1 };
                        aVal = resultOrder[a.result] || 0;
                        bVal = resultOrder[b.result] || 0;
                        break;
                      default:
                        aVal = 0;
                        bVal = 0;
                    }
                    return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
                  })
                  .map((game, idx) => {
                    const eloDiff = game.opp_elo - game.elo;
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {game.date ? new Date(game.date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{game.opp}</td>
                        <td className="px-4 py-2 text-sm text-center text-gray-600">{game.elo}</td>
                        <td className="px-4 py-2 text-sm text-center text-gray-600">{game.opp_elo}</td>
                        <td className="px-4 py-2 text-sm text-center">
                          <span className={`font-medium ${eloDiff >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            {eloDiff >= 0 ? '+' : ''}{eloDiff}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            game.color === 'W' ? 'bg-white border border-gray-300 text-gray-700' : 'bg-gray-800 text-white'
                          }`}>
                            {game.color === 'W' ? 'White' : 'Black'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            game.result === 'W' ? 'bg-green-100 text-green-800' :
                            game.result === 'D' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {game.result === 'W' ? 'Win' : game.result === 'D' ? 'Draw' : 'Loss'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">{game.eco || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 truncate max-w-[200px]" title={game.tournament}>
                          {game.tournament || '-'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Summary Footer */}
          <div className="flex justify-between items-center mt-4 pt-4 border-t text-sm text-gray-600">
            <div>
              Score: <span className="font-semibold">{selectedBracket.score}/{selectedBracket.games}</span> ({selectedBracket.scorePercentage}%)
            </div>
            <div className="flex gap-4">
              <span className="text-green-600">W: {selectedBracket.wins}</span>
              <span className="text-yellow-600">D: {selectedBracket.draws}</span>
              <span className="text-red-600">L: {selectedBracket.losses}</span>
            </div>
          </div>
        </div>
      )}

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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Detailed Strength Analysis</h3>
          <span className="text-xs text-gray-400">Click any row to view games</span>
        </div>
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
                <tr
                  key={idx}
                  className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedBracket?.label === bracket.label ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedBracket(selectedBracket?.label === bracket.label ? null : bracket)}
                >
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center">
                      <div className="w-3 h-3 mr-2 rounded-full" style={{ backgroundColor: bracket.color }}></div>
                      <span className="font-medium text-gray-900">{bracket.label}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-700">
                    <span className="underline decoration-dotted decoration-gray-400">{bracket.games}</span>
                  </td>
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

export default OpponentStrengthTab;
