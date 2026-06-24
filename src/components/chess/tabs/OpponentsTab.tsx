import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { UsersIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import type { GameResult, PlayerColor } from '../../../types/chess';

/** Rating bracket the user can drill into. */
type OpponentBracket = 'lower' | 'similar' | 'higher';

/** Per-bracket aggregate of performance vs opponent strength. */
interface OpponentBracketStat {
  bracket: string;
  total: number;
  wins: number;
  draws: number;
  losses: number;
  score: string | number;
  winRate: string | number;
}

/** A single game row shown in the drill-down table. */
interface BracketGame {
  gameNumber: number;
  opp: string;
  opp_elo: number;
  ratingDiff: number;
  color: PlayerColor;
  opening: string;
  eco: string;
  result: GameResult;
  tournament: string;
}

interface OpponentsTabProps {
  selectedBracket: OpponentBracket | null;
  setSelectedBracket: (bracket: OpponentBracket | null) => void;
  opponentBracketStats: OpponentBracketStat[];
  bracketGames: BracketGame[];
  ecoNames?: Record<string, string>;
}

const OpponentsTab = ({
  selectedBracket,
  setSelectedBracket,
  opponentBracketStats,
  bracketGames,
}: OpponentsTabProps) => {
  // Calculate overall statistics
  const stats = useMemo(() => {
    if (!opponentBracketStats || opponentBracketStats.length === 0) {
      return {
        totalGames: 0,
        totalWins: 0,
        totalDraws: 0,
        totalLosses: 0,
        overallWinRate: 0 as string | number
      };
    }

    const totalGames = opponentBracketStats.reduce((sum, b) => sum + b.total, 0);
    const totalWins = opponentBracketStats.reduce((sum, b) => sum + b.wins, 0);
    const totalDraws = opponentBracketStats.reduce((sum, b) => sum + b.draws, 0);
    const totalLosses = opponentBracketStats.reduce((sum, b) => sum + b.losses, 0);
    const overallWinRate = ((totalWins / totalGames) * 100).toFixed(1);

    return {
      totalGames,
      totalWins,
      totalDraws,
      totalLosses,
      overallWinRate
    };
  }, [opponentBracketStats]);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-cyan-600 via-teal-600 to-emerald-700 rounded-2xl shadow-xl">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative px-8 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
              <UsersIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">
                {selectedBracket
                  ? `vs ${selectedBracket === 'lower' ? 'Lower Rated' : selectedBracket === 'similar' ? 'Similar Rated' : 'Higher Rated'} Opponents`
                  : 'Opponent Analysis'}
              </h2>
              <p className="text-cyan-100">
                {selectedBracket
                  ? 'Detailed game history for this rating bracket'
                  : 'Performance breakdown by opponent strength'}
              </p>
            </div>
          </div>

          {!selectedBracket && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-cyan-100 text-sm font-medium mb-1">Total Games</p>
                <p className="text-3xl font-bold text-white">{stats.totalGames}</p>
              </div>
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-cyan-100 text-sm font-medium mb-1">Wins</p>
                <p className="text-3xl font-bold text-white">{stats.totalWins}</p>
              </div>
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-cyan-100 text-sm font-medium mb-1">Draws</p>
                <p className="text-3xl font-bold text-white">{stats.totalDraws}</p>
              </div>
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-cyan-100 text-sm font-medium mb-1">Win Rate</p>
                <p className="text-3xl font-bold text-white">{stats.overallWinRate}%</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Games View */}
      {selectedBracket && (
        <div className="relative overflow-hidden bg-white rounded-xl shadow-lg">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500"></div>
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Game History</h3>
                <p className="text-gray-600">All games against {selectedBracket === 'lower' ? 'lower' : selectedBracket === 'similar' ? 'similar' : 'higher'} rated opponents</p>
              </div>
              <button
                onClick={() => setSelectedBracket(null)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors duration-200"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back to Overview
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="px-4 py-4 text-xs font-bold text-left text-gray-700 uppercase tracking-wider">Game</th>
                    <th className="px-4 py-4 text-xs font-bold text-left text-gray-700 uppercase tracking-wider">Opponent</th>
                    <th className="px-4 py-4 text-xs font-bold text-center text-gray-700 uppercase tracking-wider">ELO</th>
                    <th className="px-4 py-4 text-xs font-bold text-center text-gray-700 uppercase tracking-wider">Diff</th>
                    <th className="px-4 py-4 text-xs font-bold text-center text-gray-700 uppercase tracking-wider">Color</th>
                    <th className="px-4 py-4 text-xs font-bold text-left text-gray-700 uppercase tracking-wider">Opening</th>
                    <th className="px-4 py-4 text-xs font-bold text-center text-gray-700 uppercase tracking-wider">Result</th>
                    <th className="px-4 py-4 text-xs font-bold text-left text-gray-700 uppercase tracking-wider">Tournament</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bracketGames.map((game, idx) => (
                    <tr key={idx} className="hover:bg-gradient-to-r hover:from-slate-50 hover:to-transparent transition-colors duration-150">
                      <td className="px-4 py-4 text-sm">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          #{game.gameNumber}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-gray-900">{game.opp}</td>
                      <td className="px-4 py-4 text-sm text-center">
                        <span className="font-semibold text-gray-700">{game.opp_elo}</span>
                      </td>
                      <td className="px-4 py-4 text-sm text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-bold text-xs ${
                          game.ratingDiff > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {game.ratingDiff > 0 ? '+' : ''}{game.ratingDiff}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-center">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold ${
                          game.color === 'W' ? 'bg-slate-100 text-slate-800 border border-slate-300' : 'bg-slate-800 text-white'
                        }`}>
                          {game.color === 'W' ? 'White' : 'Black'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <div className="font-medium text-gray-900">{game.opening}</div>
                        <div className="text-xs text-gray-500 font-mono">{game.eco}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-center">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold ${
                          game.result === 'W' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white' :
                          game.result === 'D' ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white' :
                          'bg-gradient-to-br from-rose-500 to-rose-600 text-white'
                        }`}>
                          {game.result === 'W' ? 'Win' : game.result === 'D' ? 'Draw' : 'Loss'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{game.tournament}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Overview */}
      {!selectedBracket && (
        <>
          {/* Performance by Rating Table */}
          <div className="relative overflow-hidden bg-white rounded-xl shadow-lg">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500"></div>
            <div className="p-8">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Performance by Rating Bracket</h3>
                <p className="text-gray-600">How you perform against different strength opponents</p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="px-6 py-4 text-xs font-bold text-left text-gray-700 uppercase tracking-wider">Opponent Strength</th>
                      <th className="px-6 py-4 text-xs font-bold text-center text-gray-700 uppercase tracking-wider">Games</th>
                      <th className="px-6 py-4 text-xs font-bold text-center text-gray-700 uppercase tracking-wider">Score</th>
                      <th className="px-6 py-4 text-xs font-bold text-center text-gray-700 uppercase tracking-wider">Record</th>
                      <th className="px-6 py-4 text-xs font-bold text-center text-gray-700 uppercase tracking-wider">Win Rate</th>
                      <th className="px-6 py-4 text-xs font-bold text-center text-gray-700 uppercase tracking-wider">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {opponentBracketStats.map((bracket, idx) => (
                      <tr key={idx} className="hover:bg-gradient-to-r hover:from-slate-50 hover:to-transparent transition-colors duration-150">
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-2 rounded-lg font-bold ${
                            idx === 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            idx === 1 ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {bracket.bracket}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-center">
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {bracket.total}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-center text-gray-900">{bracket.score}</td>
                        <td className="px-6 py-4 text-sm text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="inline-flex items-center px-2.5 py-1 rounded bg-emerald-100 text-emerald-700 font-bold text-xs">{bracket.wins}</span>
                            <span className="text-gray-400 font-medium">-</span>
                            <span className="inline-flex items-center px-2.5 py-1 rounded bg-amber-100 text-amber-700 font-bold text-xs">{bracket.draws}</span>
                            <span className="text-gray-400 font-medium">-</span>
                            <span className="inline-flex items-center px-2.5 py-1 rounded bg-rose-100 text-rose-700 font-bold text-xs">{bracket.losses}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-center">
                          <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold">
                            {bracket.winRate}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-center">
                          <button
                            onClick={() => setSelectedBracket(idx === 0 ? 'lower' : idx === 1 ? 'similar' : 'higher')}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-teal-600 to-cyan-600 rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-all duration-200 shadow-md hover:shadow-lg"
                          >
                            View Games
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Results Chart */}
          <div className="relative overflow-hidden bg-white rounded-xl shadow-lg">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500"></div>
            <div className="p-8">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Results Distribution</h3>
                <p className="text-gray-600">Visual breakdown of wins, draws, and losses by opponent bracket</p>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={opponentBracketStats}>
                  <defs>
                    <linearGradient id="winsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.6}/>
                    </linearGradient>
                    <linearGradient id="drawsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.6}/>
                    </linearGradient>
                    <linearGradient id="lossesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.6}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="bracket" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="p-4 bg-white border-0 rounded-xl shadow-xl">
                            <p className="font-bold text-gray-900 text-lg mb-3">{data.bracket}</p>
                            <div className="space-y-2">
                              <div className="flex justify-between gap-6">
                                <span className="text-sm text-gray-600">Wins:</span>
                                <span className="text-sm font-bold text-emerald-600">{data.wins}</span>
                              </div>
                              <div className="flex justify-between gap-6">
                                <span className="text-sm text-gray-600">Draws:</span>
                                <span className="text-sm font-bold text-amber-600">{data.draws}</span>
                              </div>
                              <div className="flex justify-between gap-6">
                                <span className="text-sm text-gray-600">Losses:</span>
                                <span className="text-sm font-bold text-rose-600">{data.losses}</span>
                              </div>
                              <div className="pt-2 border-t border-gray-200">
                                <div className="flex justify-between gap-6">
                                  <span className="text-sm text-gray-600">Win Rate:</span>
                                  <span className="text-sm font-bold text-blue-600">{data.winRate}%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="wins" stackId="a" fill="url(#winsGradient)" name="Wins" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="draws" stackId="a" fill="url(#drawsGradient)" name="Draws" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="losses" stackId="a" fill="url(#lossesGradient)" name="Losses" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OpponentsTab;
