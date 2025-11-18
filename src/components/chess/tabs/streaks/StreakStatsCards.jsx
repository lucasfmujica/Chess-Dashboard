import React from 'react';
import PropTypes from 'prop-types';
import { TrophyIcon, CheckCircleIcon, CalendarIcon } from '@heroicons/react/24/outline';

const StreakStatsCards = ({ streaksData }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Longest Win Streak */}
      <div className="relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-50 rounded-xl">
              <TrophyIcon className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Longest Win Streak</h3>
          </div>
          <div className="text-center py-4">
            <p className="text-5xl font-bold text-emerald-600 mb-2">{streaksData.longestWinStreak}</p>
            <p className="text-gray-600">consecutive wins</p>
          </div>
        </div>
      </div>

      {/* Longest Unbeaten Streak */}
      <div className="relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <CheckCircleIcon className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Longest Unbeaten</h3>
          </div>
          <div className="text-center py-4">
            <p className="text-5xl font-bold text-blue-600 mb-2">{streaksData.longestUnbeatenStreak}</p>
            <p className="text-gray-600">games without loss</p>
          </div>
        </div>
      </div>

      {/* Monthly Activity */}
      <div className="relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-50 rounded-xl">
              <CalendarIcon className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Monthly Activity</h3>
          </div>
          <div className="text-center py-4">
            <p className="text-5xl font-bold text-purple-600 mb-2">{streaksData.gamesThisMonth}</p>
            <p className="text-gray-600">games in latest tournament</p>
          </div>
        </div>
      </div>
    </div>
  );
};

StreakStatsCards.propTypes = {
  streaksData: PropTypes.shape({
    longestWinStreak: PropTypes.number.isRequired,
    longestUnbeatenStreak: PropTypes.number.isRequired,
    gamesThisMonth: PropTypes.number.isRequired,
  }).isRequired,
};

export default StreakStatsCards;
