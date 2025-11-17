import React from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const OpponentsTab = ({
  selectedBracket,
  setSelectedBracket,
  opponentBracketStats,
  bracketGames,
  ecoNames
}) => {
  return (
    <div className="space-y-6">
      {selectedBracket && (
        <div className="p-6 bg-white rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              Games vs {selectedBracket === 'lower' ? 'Lower Rated' : selectedBracket === 'similar' ? 'Similar Rated' : 'Higher Rated'} Opponents
            </h3>
            <button
              onClick={() => setSelectedBracket(null)}
              className="px-4 py-2 text-sm font-medium transition-colors bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Back to Overview
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Game</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Opponent</th>
                  <th className="px-4 py-3 text-xs font-medium text-center text-gray-500 uppercase">ELO</th>
                  <th className="px-4 py-3 text-xs font-medium text-center text-gray-500 uppercase">Diff</th>
                  <th className="px-4 py-3 text-xs font-medium text-center text-gray-500 uppercase">Color</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Opening</th>
                  <th className="px-4 py-3 text-xs font-medium text-center text-gray-500 uppercase">Result</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Tournament</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bracketGames.map((game, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">#{game.gameNumber}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{game.opp}</td>
                    <td className="px-4 py-3 text-sm text-center text-gray-700">{game.opp_elo}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`font-medium ${game.ratingDiff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {game.ratingDiff > 0 ? '+' : ''}{game.ratingDiff}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${game.color === 'W' ? 'bg-gray-100 text-gray-800' : 'bg-gray-800 text-white'
                        }`}>
                        {game.color === 'W' ? 'White' : 'Black'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{game.opening}</div>
                      <div className="text-xs text-gray-400">{game.eco}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${game.result === 'W' ? 'bg-green-600 text-white' :
                        game.result === 'D' ? 'bg-yellow-500 text-white' : 'bg-red-600 text-white'
                        }`}>
                        {game.result === 'W' ? 'Win' : game.result === 'D' ? 'Draw' : 'Loss'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{game.tournament}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!selectedBracket && (
        <>
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="mb-4 text-lg font-semibold">Performance by Opponent Rating</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">Bracket</th>
                    <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Games</th>
                    <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Score</th>
                    <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">W-D-L</th>
                    <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Win Rate</th>
                    <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {opponentBracketStats.map((bracket, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{bracket.bracket}</td>
                      <td className="px-6 py-4 text-sm text-center text-gray-700">{bracket.total}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-center text-gray-900">{bracket.score}</td>
                      <td className="px-6 py-4 text-sm text-center text-gray-700">
                        <span className="text-green-600">{bracket.wins}</span>-
                        <span className="text-yellow-600">{bracket.draws}</span>-
                        <span className="text-red-600">{bracket.losses}</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-center text-blue-600">{bracket.winRate}%</td>
                      <td className="px-6 py-4 text-sm text-center">
                        <button
                          onClick={() => setSelectedBracket(idx === 0 ? 'lower' : idx === 1 ? 'similar' : 'higher')}
                          className="px-3 py-1 text-xs font-medium text-white transition-colors bg-blue-600 rounded hover:bg-blue-700"
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

          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="mb-4 text-lg font-semibold">Results by Opponent Bracket</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={opponentBracketStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bracket" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="wins" stackId="a" fill="#10b981" name="Wins" />
                <Bar dataKey="draws" stackId="a" fill="#f59e0b" name="Draws" />
                <Bar dataKey="losses" stackId="a" fill="#ef4444" name="Losses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

export default OpponentsTab;
