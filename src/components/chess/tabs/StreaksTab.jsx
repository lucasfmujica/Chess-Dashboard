import React, { useMemo } from 'react';
import { FireIcon, CalendarIcon, ChartBarIcon, ClockIcon, TrophyIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const StreaksTab = ({ games }) => {
  // Calculate streaks and consistency data
  const streaksData = useMemo(() => {
    if (!games || games.length === 0) {
      return {
        currentWinStreak: 0,
        longestWinStreak: 0,
        currentUnbeatenStreak: 0,
        longestUnbeatenStreak: 0,
        currentLossStreak: 0,
        gamesThisWeek: 0,
        gamesThisMonth: 0,
        avgGamesPerWeek: 0,
        consistency: 0,
        calendar: [],
        weeklyActivity: []
      };
    }

    // Calculate win streaks
    let currentWinStreak = 0;
    let longestWinStreak = 0;
    let tempWinStreak = 0;

    let currentUnbeatenStreak = 0;
    let longestUnbeatenStreak = 0;
    let tempUnbeatenStreak = 0;

    let currentLossStreak = 0;

    // Sort games by date (most recent first)
    const sortedGames = [...games].sort((a, b) => {
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      return dateB - dateA;
    });

    // Calculate current streaks
    for (let i = 0; i < sortedGames.length; i++) {
      const game = sortedGames[i];

      // Win streak
      if (game.result === 'W') {
        if (i === 0 || sortedGames[i - 1].result === 'W') {
          currentWinStreak++;
        } else if (currentWinStreak === 0) {
          break;
        }
      } else {
        if (currentWinStreak > 0) break;
      }

      // Unbeaten streak (W or D)
      if (game.result === 'W' || game.result === 'D') {
        if (i === 0 || sortedGames[i - 1].result === 'W' || sortedGames[i - 1].result === 'D') {
          currentUnbeatenStreak++;
        } else if (currentUnbeatenStreak === 0) {
          break;
        }
      } else {
        if (currentUnbeatenStreak > 0) break;
      }

      // Loss streak
      if (game.result === 'L') {
        if (i === 0 || sortedGames[i - 1].result === 'L') {
          currentLossStreak++;
        } else if (currentLossStreak === 0) {
          break;
        }
      } else {
        if (currentLossStreak > 0) break;
      }
    }

    // Calculate longest streaks
    for (let i = 0; i < games.length; i++) {
      if (games[i].result === 'W') {
        tempWinStreak++;
        longestWinStreak = Math.max(longestWinStreak, tempWinStreak);
      } else {
        tempWinStreak = 0;
      }

      if (games[i].result === 'W' || games[i].result === 'D') {
        tempUnbeatenStreak++;
        longestUnbeatenStreak = Math.max(longestUnbeatenStreak, tempUnbeatenStreak);
      } else {
        tempUnbeatenStreak = 0;
      }
    }

    // Calculate games this week/month
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const gamesThisWeek = games.filter(g => {
      const gameDate = new Date(g.date || 0);
      return gameDate >= oneWeekAgo;
    }).length;

    const gamesThisMonth = games.filter(g => {
      const gameDate = new Date(g.date || 0);
      return gameDate >= oneMonthAgo;
    }).length;

    // Calculate weekly activity for the last 12 weeks
    const weeklyActivity = [];
    for (let i = 0; i < 12; i++) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);

      const gamesInWeek = games.filter(g => {
        const gameDate = new Date(g.date || 0);
        return gameDate >= weekStart && gameDate < weekEnd;
      }).length;

      weeklyActivity.unshift({
        week: `Week ${12 - i}`,
        games: gamesInWeek,
        active: gamesInWeek > 0
      });
    }

    const avgGamesPerWeek = weeklyActivity.reduce((sum, w) => sum + w.games, 0) / 12;

    // Calculate consistency score (0-100)
    const activeWeeks = weeklyActivity.filter(w => w.active).length;
    const consistency = Math.round((activeWeeks / 12) * 100);

    // Generate calendar data for last 90 days
    const calendar = [];
    for (let i = 89; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];

      const gamesOnDay = games.filter(g => {
        const gameDate = new Date(g.date || 0);
        return gameDate.toISOString().split('T')[0] === dateStr;
      }).length;

      calendar.push({
        date: dateStr,
        games: gamesOnDay,
        level: gamesOnDay === 0 ? 0 : gamesOnDay === 1 ? 1 : gamesOnDay <= 3 ? 2 : gamesOnDay <= 5 ? 3 : 4
      });
    }

    return {
      currentWinStreak,
      longestWinStreak,
      currentUnbeatenStreak,
      longestUnbeatenStreak,
      currentLossStreak,
      gamesThisWeek,
      gamesThisMonth,
      avgGamesPerWeek: avgGamesPerWeek.toFixed(1),
      consistency,
      calendar,
      weeklyActivity
    };
  }, [games]);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-red-600 to-pink-700 rounded-2xl shadow-xl">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative px-8 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
              <FireIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Streaks & Consistency</h2>
              <p className="text-orange-100">Track your momentum and playing habits</p>
            </div>
          </div>

          {/* Current Streak Display */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-orange-100 text-sm font-medium mb-1">Current Win Streak</p>
              <p className="text-4xl font-bold text-white">{streaksData.currentWinStreak}</p>
              <p className="text-sm text-orange-200 mt-1">
                {streaksData.currentWinStreak > 0 ? '🔥 On fire!' : 'Start winning!'}
              </p>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-orange-100 text-sm font-medium mb-1">Unbeaten Streak</p>
              <p className="text-4xl font-bold text-white">{streaksData.currentUnbeatenStreak}</p>
              <p className="text-sm text-orange-200 mt-1">
                {streaksData.currentUnbeatenStreak > 0 ? '💪 Strong!' : 'Keep pushing!'}
              </p>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-orange-100 text-sm font-medium mb-1">Games This Week</p>
              <p className="text-4xl font-bold text-white">{streaksData.gamesThisWeek}</p>
              <p className="text-sm text-orange-200 mt-1">Last 7 days</p>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-orange-100 text-sm font-medium mb-1">Consistency</p>
              <p className="text-4xl font-bold text-white">{streaksData.consistency}%</p>
              <p className="text-sm text-orange-200 mt-1">12-week avg</p>
            </div>
          </div>
        </div>
      </div>

      {/* Streak Stats Cards */}
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
              <p className="text-gray-600">games in 30 days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Calendar */}
      <div className="relative overflow-hidden bg-white rounded-xl shadow-lg">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500"></div>
        <div className="p-8">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Activity Calendar</h3>
            <p className="text-gray-600">Your playing activity over the last 90 days</p>
          </div>

          {/* Calendar Grid */}
          <div className="space-y-2">
            <div className="grid grid-cols-13 gap-1">
              {streaksData.calendar.map((day, idx) => {
                const levelColors = [
                  'bg-gray-100',
                  'bg-emerald-200',
                  'bg-emerald-400',
                  'bg-emerald-600',
                  'bg-emerald-800'
                ];

                return (
                  <div
                    key={idx}
                    className={`w-full aspect-square ${levelColors[day.level]} rounded-sm hover:ring-2 hover:ring-emerald-500 transition-all cursor-pointer group relative`}
                    title={`${day.date}: ${day.games} game${day.games !== 1 ? 's' : ''}`}
                  >
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      {day.date}: {day.games} game{day.games !== 1 ? 's' : ''}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 justify-end mt-4">
              <span className="text-sm text-gray-600">Less</span>
              <div className="w-4 h-4 bg-gray-100 rounded-sm"></div>
              <div className="w-4 h-4 bg-emerald-200 rounded-sm"></div>
              <div className="w-4 h-4 bg-emerald-400 rounded-sm"></div>
              <div className="w-4 h-4 bg-emerald-600 rounded-sm"></div>
              <div className="w-4 h-4 bg-emerald-800 rounded-sm"></div>
              <span className="text-sm text-gray-600">More</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Activity Chart */}
      <div className="relative overflow-hidden bg-white rounded-xl shadow-lg">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        <div className="p-8">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Weekly Game Frequency</h3>
            <p className="text-gray-600">Track your playing consistency over the last 12 weeks</p>
          </div>

          {/* Bar Chart */}
          <div className="space-y-3">
            {streaksData.weeklyActivity.map((week, idx) => (
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
              <span className="text-2xl font-bold text-indigo-600">{streaksData.avgGamesPerWeek} games</span>
            </div>
          </div>
        </div>
      </div>

      {/* Consistency Insights */}
      <div className="relative overflow-hidden bg-white rounded-xl shadow-lg">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500"></div>
        <div className="p-8">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Consistency Insights</h3>
            <p className="text-gray-600">Keep your practice regular for best improvement</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <ClockIcon className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-900">Play Frequency</span>
              </div>
              <p className="text-gray-700 text-sm">
                {streaksData.consistency >= 75 ? 'Excellent! Very consistent player' :
                 streaksData.consistency >= 50 ? 'Good! Playing regularly' :
                 streaksData.consistency >= 25 ? 'Fair. Try to play more often' :
                 'Low activity. Increase frequency for improvement'}
              </p>
            </div>

            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <FireIcon className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">Current Momentum</span>
              </div>
              <p className="text-gray-700 text-sm">
                {streaksData.currentWinStreak >= 3 ? '🔥 Hot streak! Keep it going!' :
                 streaksData.currentUnbeatenStreak >= 5 ? '💪 Solid performance!' :
                 streaksData.currentLossStreak >= 3 ? '⚠️ Rough patch - stay focused!' :
                 'Steady as she goes'}
              </p>
            </div>

            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <TrophyIcon className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-semibold text-purple-900">Goal Suggestion</span>
              </div>
              <p className="text-gray-700 text-sm">
                {streaksData.gamesThisWeek < 5 ? 'Try to play 5+ games this week' :
                 streaksData.currentWinStreak === 0 ? 'Focus on winning your next game' :
                 `Extend your win streak to ${streaksData.currentWinStreak + 1}!`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreaksTab;
