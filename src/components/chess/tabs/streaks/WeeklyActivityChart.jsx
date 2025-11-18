import React from 'react';
import PropTypes from 'prop-types';
import { ChartBarIcon } from '@heroicons/react/24/outline';

const WeeklyActivityChart = ({ weeklyActivity, avgGamesPerWeek }) => {
  return (
    <div className="relative overflow-hidden bg-white rounded-xl shadow-lg">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
      <div className="p-8">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Weekly Game Frequency</h3>
          <p className="text-gray-600">Track your playing consistency over the last 12 weeks</p>
        </div>

        {/* Bar Chart */}
        <div className="space-y-3">
          {weeklyActivity.map((week, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-24 text-sm font-medium text-gray-700">{week.week}</div>
              <div className="flex-1 h-10 bg-gray-100 rounded-lg overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-end px-3 transition-all duration-500"
                  style={{ width: `${Math.min((week.games / 10) * 100, 100)}%` }}
                >
                  {week.games > 0 && (
                    <span className="text-white text-sm font-bold">{week.games}</span>
                  )}
                </div>
              </div>
              <div className="w-16 text-sm text-gray-600 text-right">
                {week.games} {week.games === 1 ? 'game' : 'games'}
              </div>
            </div>
          ))}
        </div>

        {/* Average Line */}
        <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-900">Average per Week</span>
            </div>
            <span className="text-2xl font-bold text-indigo-600">{avgGamesPerWeek} games</span>
          </div>
        </div>
      </div>
    </div>
  );
};

WeeklyActivityChart.propTypes = {
  weeklyActivity: PropTypes.arrayOf(PropTypes.shape({
    week: PropTypes.string.isRequired,
    games: PropTypes.number.isRequired,
    active: PropTypes.bool.isRequired,
  })).isRequired,
  avgGamesPerWeek: PropTypes.string.isRequired,
};

export default WeeklyActivityChart;
