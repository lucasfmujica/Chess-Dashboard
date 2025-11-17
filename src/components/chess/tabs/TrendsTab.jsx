import React from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const TrendsTab = ({ formStats, streaks, monthlyStats }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="p-6 bg-white rounded-lg shadow-md">
          <h3 className="mb-3 text-lg font-semibold">Current Form</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Last 5 Games</p>
              <p className="text-2xl font-bold text-blue-600">{formStats.last5.score}</p>
              <p className="text-sm text-gray-500">{formStats.last5.percentage}%</p>
              <div className="flex gap-1 mt-2">
                {formStats.last5.details.map((result, idx) => (
                  <div
                    key={idx}
                    className={`w-8 h-8 rounded flex items-center justify-center text-white font-bold text-xs ${result === 'W' ? 'bg-green-600' : result === 'D' ? 'bg-yellow-500' : 'bg-red-600'
                      }`}
                  >
                    {result}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Last 10 Games</p>
              <p className="text-2xl font-bold text-blue-600">{formStats.last10.score}</p>
              <p className="text-sm text-gray-500">{formStats.last10.percentage}%</p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow-md">
          <h3 className="mb-3 text-lg font-semibold">Current Streak</h3>
          <div className="text-center">
            <div className={`text-5xl font-bold mb-2 ${streaks.current.type === 'win' ? 'text-green-600' :
              streaks.current.type === 'loss' ? 'text-red-600' : 'text-blue-600'
              }`}>
              {streaks.current.count}
            </div>
            <p className="text-gray-600 capitalize">
              {streaks.current.type === 'win' ? 'Win Streak' :
                streaks.current.type === 'loss' ? 'Loss Streak' : 'Unbeaten Streak'}
            </p>
          </div>
          <div className="pt-4 mt-4 space-y-2 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Longest Win Streak</span>
              <span className="font-semibold">{streaks.longestWin} games</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Longest Unbeaten</span>
              <span className="font-semibold">{streaks.longestUnbeaten} games</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow-md">
          <h3 className="mb-3 text-lg font-semibold">Performance Trend</h3>
          <div className="space-y-2">
            {monthlyStats.slice(-3).map((stat, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="text-sm font-medium text-gray-900">{stat.tournament.split(' ')[0]}</p>
                  <p className="text-xs text-gray-500">{stat.games} games</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-blue-600">{stat.performanceRating}</p>
                  <p className="text-xs text-gray-500">{stat.winRate}% wins</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 bg-white rounded-lg shadow-md">
        <h3 className="mb-4 text-lg font-semibold">Tournament-by-Tournament Performance</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={monthlyStats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="tournament" angle={-45} textAnchor="end" height={100} />
            <YAxis yAxisId="left" domain={[25, 75]} label={{ value: 'Win Rate %', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" domain={[1500, 2500]} label={{ value: 'Performance', angle: 90, position: 'insideRight' }} />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="winRate" stroke="#10b981" strokeWidth={2} name="Win Rate %" />
            <Line yAxisId="right" type="monotone" dataKey="performanceRating" stroke="#3b82f6" strokeWidth={2} name="Performance" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="p-6 bg-white rounded-lg shadow-md">
        <h3 className="mb-4 text-lg font-semibold">ELO Progression Over Tournaments</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyStats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="tournament" angle={-45} textAnchor="end" height={100} />
            <YAxis domain={[1600, 1950]} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="elo" stroke="#8b5cf6" strokeWidth={3} name="ELO" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TrendsTab;
