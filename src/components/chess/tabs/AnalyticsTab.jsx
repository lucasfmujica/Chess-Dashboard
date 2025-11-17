import React from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const AnalyticsTab = ({
  showPgnImport,
  setShowPgnImport,
  pgnText,
  setPgnText,
  handlePgnImport,
  timeOfDayStats,
  tournamentComparison,
  LichessSyncPanel,
  onLichessSync
}) => {
  return (
    <div className="space-y-6">
      {/* PGN Import Section */}
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">PGN Import</h3>
          <button
            onClick={() => setShowPgnImport(!showPgnImport)}
            className="px-4 py-2 text-sm font-medium text-white transition-colors bg-emerald-600 rounded-lg hover:bg-emerald-700"
          >
            {showPgnImport ? 'Close Import' : 'Import Games'}
          </button>
        </div>

        {showPgnImport && (
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-slate-700">
                Paste PGN text below:
              </label>
              <textarea
                value={pgnText}
                onChange={(e) => setPgnText(e.target.value)}
                placeholder={`[Event "Tournament Name"]\n[White "Player1"]\n[Black "Player2"]\n[Result "1-0"]\n[WhiteElo "1800"]\n[BlackElo "1750"]\n[ECO "B23"]\n\n1. e4 c5 2. Nc3 ...`}
                className="w-full h-64 px-3 py-2 font-mono text-sm border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePgnImport}
                className="px-4 py-2 text-sm font-medium text-white transition-colors bg-emerald-600 rounded-lg hover:bg-emerald-700"
              >
                Parse PGN
              </button>
              <button
                onClick={() => {
                  setPgnText('');
                  setShowPgnImport(false);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 transition-colors bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Note: This is a preview feature. Parsed games will be shown in the console for manual review.
            </p>
          </div>
        )}
      </div>

      {/* Lichess Sync Panel */}
      {LichessSyncPanel && (
        <LichessSyncPanel onSyncComplete={onLichessSync} />
      )}

      {/* Time of Day Performance */}
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Time of Day Performance</h3>
        <p className="mb-4 text-sm text-slate-600">Analyze when you perform best during the day</p>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-left text-slate-600 uppercase">Time Slot</th>
                <th className="px-6 py-3 text-xs font-medium text-center text-slate-600 uppercase">Games</th>
                <th className="px-6 py-3 text-xs font-medium text-center text-slate-600 uppercase">W-D-L</th>
                <th className="px-6 py-3 text-xs font-medium text-center text-slate-600 uppercase">Score %</th>
                <th className="px-6 py-3 text-xs font-medium text-center text-slate-600 uppercase">Win Rate</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {timeOfDayStats.map((slot, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{slot.time}</td>
                  <td className="px-6 py-4 text-sm text-center text-slate-700">{slot.total}</td>
                  <td className="px-6 py-4 text-sm text-center">
                    <span className="text-emerald-600">{slot.wins}</span>-
                    <span className="text-amber-600">{slot.draws}</span>-
                    <span className="text-rose-600">{slot.losses}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-center text-slate-900">{slot.score}%</td>
                  <td className="px-6 py-4 text-sm text-center">
                    <span className={`font-semibold ${parseFloat(slot.winRate) >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {slot.winRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Visual Chart */}
        <div className="mt-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timeOfDayStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Legend />
              <Bar dataKey="wins" fill="#10b981" name="Wins" />
              <Bar dataKey="draws" fill="#f59e0b" name="Draws" />
              <Bar dataKey="losses" fill="#ef4444" name="Losses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tournament Comparison */}
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Tournament Comparison</h3>
        <p className="mb-4 text-sm text-slate-600">Compare your performance across all rated tournaments</p>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-left text-slate-600 uppercase">Tournament</th>
                <th className="px-4 py-3 text-xs font-medium text-center text-slate-600 uppercase">Games</th>
                <th className="px-4 py-3 text-xs font-medium text-center text-slate-600 uppercase">Score %</th>
                <th className="px-4 py-3 text-xs font-medium text-center text-slate-600 uppercase">Your ELO</th>
                <th className="px-4 py-3 text-xs font-medium text-center text-slate-600 uppercase">Avg Opp</th>
                <th className="px-4 py-3 text-xs font-medium text-center text-slate-600 uppercase">Performance</th>
                <th className="px-4 py-3 text-xs font-medium text-center text-slate-600 uppercase">ELO Δ</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {tournamentComparison.map((t, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{t.name}</td>
                  <td className="px-4 py-3 text-sm text-center text-slate-700">{t.games}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className={`font-semibold ${t.score >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.score}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-slate-700">{t.playerElo}</td>
                  <td className="px-4 py-3 text-sm text-center text-slate-700">{t.avgOppElo}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className={`font-semibold ${t.performance > t.playerElo ? 'text-emerald-600' :
                      t.performance < t.playerElo ? 'text-rose-600' : 'text-slate-700'
                      }`}>
                      {t.performance || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className={`font-semibold ${t.eloChange > 0 ? 'text-emerald-600' :
                      t.eloChange < 0 ? 'text-rose-600' : 'text-slate-700'
                      }`}>
                      {t.eloChange > 0 ? '+' : ''}{t.eloChange}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tournament Performance Trend Chart */}
        <div className="mt-6">
          <h4 className="mb-3 text-sm font-semibold text-slate-700">Performance Rating Trend</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={tournamentComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                tick={{ fontSize: 12 }}
                angle={-15}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#64748b" domain={[1600, 2100]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="playerElo"
                stroke="#3b82f6"
                name="Your ELO"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="avgOppElo"
                stroke="#8b5cf6"
                name="Avg Opponent"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="performance"
                stroke="#10b981"
                name="Performance"
                strokeWidth={2}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTab;
