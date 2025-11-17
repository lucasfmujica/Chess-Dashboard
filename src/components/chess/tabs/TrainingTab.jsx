import React from 'react';
import { trainingActivities } from '../../../constants/trainingActivities';
import { getWeekDates, getWeekStats } from '../../../utils/chessHelpers';

const TrainingTab = ({
  currentWeek,
  setCurrentWeek,
  weeklyPlans,
  setWeeklyPlans,
  dailyNotes,
  updateDailyNote,
  editingDay,
  setEditingDay,
  weeklyHours,
  setWeeklyHours,
  getCurrentWeekPlan,
  updateDayPlan,
  exportToGoogleCalendar
}) => {
  return (
    <div className="space-y-6">
      {/* Week Navigator */}
      <div className="p-6 border border-indigo-200 rounded-lg shadow-md bg-gradient-to-r from-indigo-50 to-blue-50">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              const prev = new Date(currentWeek);
              prev.setDate(prev.getDate() - 7);
              setCurrentWeek(prev.toISOString().split('T')[0]);
            }}
            className="px-4 py-2 transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← Previous Week
          </button>
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900">Week of {new Date(currentWeek).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</h3>
            <p className="mt-1 text-sm text-gray-600">As GM Noah Studer advises: Plan 6 days, rest 1 day</p>
          </div>
          <button
            onClick={() => {
              const next = new Date(currentWeek);
              next.setDate(next.getDate() + 7);
              setCurrentWeek(next.toISOString().split('T')[0]);
            }}
            className="px-4 py-2 transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Next Week →
          </button>
        </div>

        {/* Week Stats */}
        <div className="grid grid-cols-2 gap-4 mt-4 md:grid-cols-4">
          {(() => {
            const stats = getWeekStats(weeklyPlans, currentWeek);
            return (
              <>
                <div className="p-3 text-center bg-white rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{stats.totalPlannedMinutes}</p>
                  <p className="text-xs text-gray-600">Total Minutes</p>
                </div>
                <div className="p-3 text-center bg-white rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{stats.daysPlanned}</p>
                  <p className="text-xs text-gray-600">Days Planned</p>
                </div>
                <div className="p-3 text-center bg-white rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{stats.avgMinutesPerDay}</p>
                  <p className="text-xs text-gray-600">Avg Min/Day</p>
                </div>
                <div className="p-3 text-center bg-white rounded-lg">
                  <p className="text-2xl font-bold text-gray-600">{stats.restDays}</p>
                  <p className="text-xs text-gray-600">Rest Days</p>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Weekly Planner Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {getWeekDates(currentWeek).map(({ day, date, displayDate }) => {
          const dayPlan = getCurrentWeekPlan()[date] || [];
          const note = dailyNotes[date] || '';
          const isToday = date === new Date().toISOString().split('T')[0];

          return (
            <div
              key={date}
              className={`bg-white rounded-lg shadow-md overflow-hidden border-2 ${isToday ? 'border-blue-500' : 'border-gray-200'
                }`}
            >
              {/* Day Header */}
              <div className={`p-4 ${isToday ? 'bg-blue-50' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900">{day}</h4>
                    <p className="text-sm text-gray-600">{displayDate}</p>
                  </div>
                  {isToday && (
                    <span className="px-2 py-1 text-xs font-semibold text-white bg-blue-600 rounded">
                      Today
                    </span>
                  )}
                </div>
              </div>

              {/* Activities */}
              <div className="p-4 space-y-2 min-h-[200px]">
                {dayPlan.length === 0 ? (
                  <div className="py-8 text-center text-gray-400">
                    <p className="text-sm">No activities planned</p>
                  </div>
                ) : (
                  dayPlan.map((activity, idx) => {
                    const activityDef = trainingActivities.find(a => a.id === activity.id);
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border-2 border-${activityDef?.color}-200 bg-${activityDef?.color}-50`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{activityDef?.label}</p>
                            {activity.minutes > 0 && (
                              <p className="mt-1 text-xs text-gray-600">{activity.minutes} minutes</p>
                            )}
                            {activity.details && (
                              <p className="mt-1 text-xs text-gray-500">{activity.details}</p>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              const newPlan = dayPlan.filter((_, i) => i !== idx);
                              updateDayPlan(date, newPlan);
                            }}
                            className="ml-2 text-gray-400 hover:text-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Activity Button */}
              <div className="p-4 border-t bg-gray-50">
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingDay(editingDay === date ? null : date)}
                    className="flex-1 px-3 py-2 text-sm font-medium text-white transition-colors bg-indigo-600 rounded-lg hover:bg-indigo-700"
                  >
                    {editingDay === date ? 'Close' : '+ Add Activity'}
                  </button>
                  {dayPlan.length > 0 && (
                    <button
                      onClick={() => exportToGoogleCalendar(date, dayPlan, note)}
                      className="px-3 py-2 text-sm font-medium text-indigo-600 transition-colors bg-white border border-indigo-300 rounded-lg hover:bg-indigo-50"
                      title="Add to Google Calendar"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V9h14v10zm0-12H5V5h14v2zM7 11h5v5H7z" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Activity Picker */}
                {editingDay === date && (
                  <div className="mt-3 space-y-2 overflow-y-auto max-h-64">
                    {trainingActivities.map(activity => (
                      <button
                        key={activity.id}
                        onClick={() => {
                          const newActivity = {
                            id: activity.id,
                            minutes: activity.defaultMinutes,
                            details: ''
                          };
                          updateDayPlan(date, [...dayPlan, newActivity]);
                          setEditingDay(null);
                        }}
                        className="w-full px-3 py-2 text-sm text-left transition-colors bg-white border border-gray-200 rounded hover:border-indigo-300 hover:bg-indigo-50"
                      >
                        {activity.label}
                        {activity.defaultMinutes > 0 && (
                          <span className="ml-2 text-xs text-gray-500">({activity.defaultMinutes} min)</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Daily Note */}
                <div className="mt-3">
                  <textarea
                    value={note}
                    onChange={(e) => updateDailyNote(date, e.target.value)}
                    placeholder="Daily notes..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows="2"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Templates */}
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h3 className="mb-4 text-lg font-semibold">Quick Templates</h3>
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Weekly Study Hours
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={weeklyHours}
            onChange={(e) => setWeeklyHours(Number(e.target.value))}
            className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-600">hours/week ({Math.round(weeklyHours * 60 / 6)} min/day)</span>
        </div>
        <p className="mb-4 text-sm text-gray-600">Following GM Noah's advice: 1/3 Tactics, 1/3 Play+Analyze, 1/3 Endgames/Openings/Strategy (this week: Endgames)</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <button
            onClick={() => {
              const dates = getWeekDates(currentWeek);
              const totalMinutes = weeklyHours * 60;
              const dailyMinutes = Math.round(totalMinutes / 6); // 6 active days
              const newPlan = {};
              dates.forEach(({ date }, idx) => {
                if (idx === 6) { // Sunday - rest day
                  newPlan[date] = [{ id: 'rest', minutes: 0, details: '' }];
                } else {
                  // 1/3 Tactics, 1/3 Play+Analyze, 1/3 Endgames (this week's focus)
                  const cycle = idx % 3;
                  if (cycle === 0) {
                    newPlan[date] = [{ id: 'tactics', minutes: dailyMinutes, details: 'Tactical puzzles and pattern recognition' }];
                  } else if (cycle === 1) {
                    const playTime = Math.round(dailyMinutes * 0.5);
                    const analysisTime = dailyMinutes - playTime;
                    newPlan[date] = [
                      { id: 'games', minutes: playTime, details: 'Play rated games with focus, no distractions' },
                      { id: 'analysis', minutes: analysisTime, details: 'Deep analysis of games played' }
                    ];
                  } else {
                    newPlan[date] = [{ id: 'endgame', minutes: dailyMinutes, details: 'Endgame study and practice' }];
                  }
                }
              });
              setWeeklyPlans(prev => ({ ...prev, [currentWeek]: newPlan }));
            }}
            className="p-4 transition-colors border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50"
          >
            <p className="font-semibold text-blue-900">⚡ Noah's Method</p>
            <p className="mt-1 text-xs text-gray-600">1/3 Tactics, 1/3 Play+Analyze, 1/3 Endgames</p>
          </button>

          <button
            onClick={() => {
              const dates = getWeekDates(currentWeek);
              const totalMinutes = weeklyHours * 60;
              const dailyMinutes = Math.round(totalMinutes / 6); // 6 active days
              const tacticsTime = Math.round(dailyMinutes / 3);
              const gamesTime = Math.round(dailyMinutes / 2);
              const endgameTime = dailyMinutes - tacticsTime - gamesTime;
              const newPlan = {};
              dates.forEach(({ date }, idx) => {
                if (idx === 6) { // Sunday
                  newPlan[date] = [{ id: 'rest', minutes: 0, details: '' }];
                } else {
                  newPlan[date] = [
                    { id: 'tactics', minutes: tacticsTime, details: '' },
                    { id: 'games', minutes: gamesTime, details: '' },
                    { id: 'endgame', minutes: endgameTime, details: '' }
                  ];
                }
              });
              setWeeklyPlans(prev => ({ ...prev, [currentWeek]: newPlan }));
            }}
            className="p-4 transition-colors border-2 border-green-200 rounded-lg hover:border-green-400 hover:bg-green-50"
          >
            <p className="font-semibold text-green-900">🎯 Balanced Daily</p>
            <p className="mt-1 text-xs text-gray-600">All three elements every day</p>
          </button>

          <button
            onClick={() => {
              const dates = getWeekDates(currentWeek);
              const totalMinutes = weeklyHours * 60;
              const tacticsDaily = Math.round(totalMinutes / 3 / 3); // 1/3 of total, spread over 3 days
              const playAnalyzeDaily = Math.round(totalMinutes / 3 / 2); // 1/3 of total, spread over 2 days
              const endgameDaily = Math.round(totalMinutes / 3); // 1/3 of total on 1 day
              const newPlan = {};
              dates.forEach(({ date }, idx) => {
                if (idx === 6) { // Sunday
                  newPlan[date] = [{ id: 'rest', minutes: 0, details: '' }];
                } else if (idx <= 2) {
                  // First 3 days: Tactics focus
                  newPlan[date] = [{ id: 'tactics', minutes: tacticsDaily, details: 'Intensive tactical training' }];
                } else if (idx === 3 || idx === 4) {
                  // Next 2 days: Play and analyze
                  const playTime = Math.round(playAnalyzeDaily * 0.67);
                  const analysisTime = playAnalyzeDaily - playTime;
                  newPlan[date] = [
                    { id: 'games', minutes: playTime, details: 'Multiple rated games' },
                    { id: 'analysis', minutes: analysisTime, details: 'Deep game review' }
                  ];
                } else {
                  // Saturday: Endgames
                  newPlan[date] = [{ id: 'endgame', minutes: endgameDaily, details: 'Deep endgame study' }];
                }
              });
              setWeeklyPlans(prev => ({ ...prev, [currentWeek]: newPlan }));
            }}
            className="p-4 transition-colors border-2 border-purple-200 rounded-lg hover:border-purple-400 hover:bg-purple-50"
          >
            <p className="font-semibold text-purple-900">📚 Block Focus</p>
            <p className="mt-1 text-xs text-gray-600">Multi-day blocks: Tactics → Play → Endgames</p>
          </button>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={() => {
              if (window.confirm('Clear this week\'s plan?')) {
                setWeeklyPlans(prev => {
                  const newPlans = { ...prev };
                  delete newPlans[currentWeek];
                  return newPlans;
                });
              }
            }}
            className="px-4 py-2 text-sm font-medium text-red-700 transition-colors bg-red-100 rounded-lg hover:bg-red-200"
          >
            Clear Week
          </button>
        </div>
      </div>

      {/* Notes Section */}
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h3 className="mb-4 text-lg font-semibold">📝 Week Summary & Reflections</h3>
        <textarea
          value={dailyNotes[`${currentWeek}-summary`] || ''}
          onChange={(e) => updateDailyNote(`${currentWeek}-summary`, e.target.value)}
          placeholder="How did this week go? What worked well? What needs improvement for next week?"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          rows="6"
        />
      </div>
    </div>
  );
};

export default TrainingTab;
