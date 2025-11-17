import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const TournamentsTab = ({ tournamentStats }) => {
  return (
    <div className="space-y-6">
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h3 className="mb-4 text-lg font-semibold">Tournament Performance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">Tournament</th>
                <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Games</th>
                <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Score</th>
                <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">W-D-L</th>
                <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Avg Opp</th>
                <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Performance</th>
                <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">White Perf</th>
                <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Black Perf</th>
                <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">ELO</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tournamentStats.map((t, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{t.tournament}</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-700">{t.total}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-center text-gray-900">{t.score}</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-700">
                    <span className="text-green-600">{t.wins}</span>-
                    <span className="text-yellow-600">{t.draws}</span>-
                    <span className="text-red-600">{t.losses}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-700">{t.avgOppElo}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-center text-blue-600">{t.performanceRating}</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-700">{t.whitePerformance}</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-700">{t.blackPerformance}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-center">
                    <span className={t.eloChange > 0 ? 'text-green-600' : t.eloChange < 0 ? 'text-red-600' : 'text-gray-600'}>
                      {t.eloChange > 0 ? '+' : ''}{t.eloChange}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-6 bg-white rounded-lg shadow-md">
        <h3 className="mb-4 text-lg font-semibold">Performance Rating by Tournament</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={tournamentStats} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[1600, 2100]} />
            <YAxis type="category" dataKey="tournament" width={150} />
            <Tooltip />
            <Bar dataKey="performanceRating" fill="#3b82f6" name="Performance Rating" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TournamentsTab;
