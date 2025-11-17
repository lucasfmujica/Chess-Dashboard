import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const OpeningsTab = ({ allOpeningsStats }) => {
  return (
    <div className="space-y-6">
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h3 className="mb-4 text-lg font-semibold">Most Played Openings</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={allOpeningsStats.slice(0, 10)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={180} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="p-3 bg-white border border-gray-300 rounded shadow">
                      <p className="font-semibold">{data.name}</p>
                      <p className="text-xs text-gray-500">{data.eco}</p>
                      <p className="text-sm">Games: {data.games}</p>
                      <p className="text-sm">Score: {data.score}</p>
                      <p className="text-sm">White: {data.asWhite} | Black: {data.asBlack}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="games" fill="#3b82f6" name="Games Played" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="p-6 bg-white rounded-lg shadow-md">
        <h3 className="mb-4 text-lg font-semibold">Win Rate by Opening (ECO Code)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-left text-gray-500 uppercase">Opening</th>
                <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Games</th>
                <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">W-D-L</th>
                <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Score</th>
                <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">Win Rate</th>
                <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">As White</th>
                <th className="px-6 py-3 text-xs font-medium text-center text-gray-500 uppercase">As Black</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allOpeningsStats.map((opening, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">
                    <div className="font-medium text-gray-900">{opening.name}</div>
                    <div className="text-xs text-gray-500">{opening.eco}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-700">{opening.games}</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-700">
                    <span className="text-green-600">{opening.wins}</span>-
                    <span className="text-yellow-600">{opening.draws}</span>-
                    <span className="text-red-600">{opening.losses}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-center text-gray-900">{opening.score}</td>
                  <td className="px-6 py-4 text-sm text-center">
                    <span className={`font-semibold ${opening.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                      {opening.winRate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-700">{opening.asWhite}</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-700">{opening.asBlack}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-6 bg-white rounded-lg shadow-md">
        <h3 className="mb-4 text-lg font-semibold">Opening Success Rate Comparison</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={allOpeningsStats.filter(o => o.games >= 2)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} />
            <YAxis type="category" dataKey="name" width={180} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="p-3 bg-white border border-gray-300 rounded shadow">
                      <p className="font-semibold">{data.name}</p>
                      <p className="text-xs text-gray-500">{data.eco}</p>
                      <p className="text-sm">Win Rate: {data.winRate}%</p>
                      <p className="text-sm">Games: {data.games}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="winRate" fill="#10b981" name="Win Rate %" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default OpeningsTab;
