import React, { useState } from 'react';
import { trainingActivities } from '../../../constants/trainingActivities';
import { getWeekDates, getWeekStats } from '../../../utils/chessHelpers';

const motivationalQuotes = [
  { text: "The pawns are the soul of chess.", author: "Philidor" },
  { text: "Chess is the struggle against error.", author: "Tarrasch" },
  { text: "Help your pieces so they can help you.", author: "Morphy" },
  { text: "When you see a good move, look for a better one.", author: "Lasker" },
  { text: "Chess is 99% tactics.", author: "Teichmann" },
  { text: "Every chess master was once a beginner.", author: "Irving Chernev" },
  { text: "The blunders are all there on the board, waiting to be made.", author: "Savielly Tartakower" },
  { text: "You have to have the fighting spirit. You have to force moves and take chances.", author: "Bobby Fischer" },
  { text: "The hardest game to win is a won game.", author: "Emanuel Lasker" },
  { text: "Even a poor plan is better than no plan at all.", author: "Mikhail Chigorin" },
  { text: "I don't believe in psychology. I believe in good moves.", author: "Bobby Fischer" },
  { text: "Strategy requires thought, tactics require observation.", author: "Max Euwe" },
  { text: "The pin is mightier than the sword.", author: "Fred Reinfeld" },
  { text: "A bad plan is better than none at all.", author: "Frank Marshall" },
  { text: "Alekhine is a poet who creates a work of art out of something that would hardly inspire another man to send home a picture post card.", author: "Max Euwe" },
  { text: "I have come to the conclusion that I cannot improve on Alekhine's play. I may as well give up chess.", author: "Max Euwe" },
  { text: "Life is too short for chess.", author: "Lord Byron" },
  { text: "Chess is mental torture.", author: "Garry Kasparov" },
  { text: "Chess is the art of analysis.", author: "Mikhail Botvinnik" },
  { text: "No one ever won a game by resigning.", author: "Savielly Tartakower" }
];

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
  const [completedActivities, setCompletedActivities] = useState({});
  const [showMotivation, setShowMotivation] = useState(true);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  const currentQuote = motivationalQuotes[currentQuoteIndex];

  const nextQuote = () => {
    setCurrentQuoteIndex((prev) => (prev + 1) % motivationalQuotes.length);
  };

  const prevQuote = () => {
    setCurrentQuoteIndex((prev) => (prev - 1 + motivationalQuotes.length) % motivationalQuotes.length);
  };

  const weekStats = getWeekStats(weeklyPlans, currentWeek);
  const weekDates = getWeekDates(currentWeek);

  // Calculate completion percentage
  const totalActivities = Object.values(getCurrentWeekPlan()).flat().length;
  const completedCount = Object.values(completedActivities).filter(Boolean).length;
  const completionPercent = totalActivities > 0 ? Math.round((completedCount / totalActivities) * 100) : 0;

  const toggleActivityCompletion = (activityKey) => {
    setCompletedActivities(prev => ({
      ...prev,
      [activityKey]: !prev[activityKey]
    }));
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header with Quote */}
      {showMotivation && (
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-2xl p-8">
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white">Training Plan</h2>
                    <p className="text-indigo-100 text-sm mt-1">Plan, Track, Improve</p>
                  </div>
                </div>
                <blockquote className="border-l-4 border-white/40 pl-4 py-2">
                  <p className="text-white text-lg italic font-medium">"{currentQuote.text}"</p>
                  <cite className="text-indigo-100 text-sm">— {currentQuote.author}</cite>
                  <div className="flex items-center gap-3 mt-4">
                    <button
                      onClick={prevQuote}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                      title="Previous quote"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-white/60 text-xs font-medium">
                      {currentQuoteIndex + 1} / {motivationalQuotes.length}
                    </span>
                    <button
                      onClick={nextQuote}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                      title="Next quote"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </blockquote>
              </div>
              <button
                onClick={() => setShowMotivation(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -ml-32 -mb-32"></div>
        </div>
      )}

      {/* Week Navigator & Stats */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
        {/* Week Navigator */}
        <div className="p-6 bg-gradient-to-r from-slate-50 to-indigo-50 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={() => {
                const prev = new Date(currentWeek);
                prev.setDate(prev.getDate() - 7);
                setCurrentWeek(prev.toISOString().split('T')[0]);
              }}
              className="px-5 py-2.5 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200 font-medium text-slate-700"
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous Week
              </span>
            </button>

            <div className="text-center">
              <h3 className="text-2xl font-bold text-slate-900">
                {weekDates[0]?.displayDate || ''} - {weekDates[6]?.displayDate || ''}, {new Date(currentWeek).getFullYear()}
              </h3>
              <p className="mt-1 text-sm text-slate-600 flex items-center gap-1.5 justify-center">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                </svg>
                Train 6 days, Rest 1 day
              </p>
            </div>

            <button
              onClick={() => {
                const next = new Date(currentWeek);
                next.setDate(next.getDate() + 7);
                setCurrentWeek(next.toISOString().split('T')[0]);
              }}
              className="px-5 py-2.5 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200 font-medium text-slate-700"
            >
              <span className="flex items-center gap-2">
                Next Week
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          </div>
        </div>

        {/* Week Stats Grid */}
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200/60">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-blue-500 rounded-lg">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-slate-600 uppercase">Total Time</p>
              </div>
              <p className="text-3xl font-bold text-blue-600">{weekStats.totalPlannedMinutes}</p>
              <p className="text-xs text-slate-500 mt-1">minutes</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200/60">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-emerald-500 rounded-lg">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-slate-600 uppercase">Days Planned</p>
              </div>
              <p className="text-3xl font-bold text-emerald-600">{weekStats.daysPlanned}</p>
              <p className="text-xs text-slate-500 mt-1">of 7 days</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200/60">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-purple-500 rounded-lg">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-slate-600 uppercase">Avg/Day</p>
              </div>
              <p className="text-3xl font-bold text-purple-600">{weekStats.avgMinutesPerDay}</p>
              <p className="text-xs text-slate-500 mt-1">minutes</p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200/60">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-amber-500 rounded-lg">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-slate-600 uppercase">Rest Days</p>
              </div>
              <p className="text-3xl font-bold text-amber-600">{weekStats.restDays}</p>
              <p className="text-xs text-slate-500 mt-1">recovery</p>
            </div>

            <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-200/60">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-rose-500 rounded-lg">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-slate-600 uppercase">Completed</p>
              </div>
              <p className="text-3xl font-bold text-rose-600">{completionPercent}%</p>
              <p className="text-xs text-slate-500 mt-1">{completedCount}/{totalActivities} tasks</p>
            </div>
          </div>

          {/* Progress Bar */}
          {totalActivities > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">Weekly Progress</span>
                <span className="text-sm font-bold text-indigo-600">{completionPercent}%</span>
              </div>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${completionPercent}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Weekly Planner Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {weekDates.map(({ day, date, displayDate }) => {
          const dayPlan = getCurrentWeekPlan()[date] || [];
          const note = dailyNotes[date] || '';
          const isToday = date === new Date().toISOString().split('T')[0];
          const dayTotalMinutes = dayPlan.reduce((sum, act) => sum + (act.minutes || 0), 0);

          return (
            <div
              key={date}
              className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border-2 transition-all duration-300 hover:shadow-xl ${
                isToday ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200/60'
              }`}
            >
              {/* Day Header */}
              <div className={`p-4 ${isToday ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gradient-to-r from-slate-100 to-slate-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className={`font-bold ${isToday ? 'text-white' : 'text-slate-900'}`}>{day}</h4>
                    <p className={`text-sm ${isToday ? 'text-indigo-100' : 'text-slate-600'}`}>{displayDate}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {dayTotalMinutes > 0 && (
                      <span className={`px-2 py-1 text-xs font-bold rounded-lg ${
                        isToday ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {dayTotalMinutes}m
                      </span>
                    )}
                    {isToday && (
                      <span className="px-3 py-1 text-xs font-bold text-white bg-white/30 rounded-full backdrop-blur-sm">
                        TODAY
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Activities */}
              <div className="p-4 space-y-2.5 min-h-[240px]">
                {dayPlan.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 bg-slate-100 rounded-full mb-3">
                      <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-500">No activities yet</p>
                    <p className="text-xs text-slate-400 mt-1">Click below to add</p>
                  </div>
                ) : (
                  dayPlan.map((activity, idx) => {
                    const activityDef = trainingActivities.find(a => a.id === activity.id);
                    const activityKey = `${date}-${idx}`;
                    const isCompleted = completedActivities[activityKey];

                    return (
                      <div
                        key={idx}
                        className={`group relative p-3 rounded-xl border-2 transition-all duration-200 ${
                          isCompleted
                            ? 'bg-emerald-50 border-emerald-300 opacity-75'
                            : `bg-${activityDef?.color}-50 border-${activityDef?.color}-200 hover:border-${activityDef?.color}-300 hover:shadow-md`
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleActivityCompletion(activityKey)}
                            className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                              isCompleted
                                ? 'bg-emerald-500 border-emerald-500'
                                : 'bg-white border-slate-300 hover:border-indigo-500'
                            }`}
                          >
                            {isCompleted && (
                              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${isCompleted ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                              {activityDef?.label}
                            </p>
                            {activity.minutes > 0 && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-xs text-slate-600 font-medium">{activity.minutes} min</p>
                              </div>
                            )}
                            {activity.details && (
                              <p className="mt-1 text-xs text-slate-500 line-clamp-2">{activity.details}</p>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              const newPlan = dayPlan.filter((_, i) => i !== idx);
                              updateDayPlan(date, newPlan);
                            }}
                            className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-all p-1 hover:bg-rose-50 rounded-lg"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t bg-slate-50/80 backdrop-blur-sm space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingDay(editingDay === date ? null : date)}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    {editingDay === date ? '✕ Close' : '+ Add Activity'}
                  </button>
                  {dayPlan.length > 0 && (
                    <button
                      onClick={() => exportToGoogleCalendar(date, dayPlan, note)}
                      className="px-4 py-2.5 text-indigo-600 bg-white border-2 border-indigo-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-200 font-semibold"
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
                  <div className="space-y-1.5 max-h-48 overflow-y-auto p-2 bg-white rounded-xl border border-slate-200">
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
                        className="w-full px-3 py-2 text-sm text-left font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center justify-between group"
                      >
                        <span>{activity.label}</span>
                        {activity.defaultMinutes > 0 && (
                          <span className="text-xs text-slate-500 group-hover:text-indigo-500">
                            {activity.defaultMinutes}m
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Daily Note */}
                <div>
                  <textarea
                    value={note}
                    onChange={(e) => updateDailyNote(date, e.target.value)}
                    placeholder="Daily notes & reflections..."
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder-slate-400"
                    rows="2"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Templates */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Quick Templates</h3>
            <p className="text-sm text-slate-600">Apply proven training methods instantly</p>
          </div>
        </div>

        <div className="mb-6">
          <label className="block mb-2 text-sm font-bold text-slate-700">
            Weekly Study Hours
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="20"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(Number(e.target.value))}
              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="px-4 py-2 bg-indigo-100 rounded-xl border border-indigo-200">
              <span className="text-2xl font-bold text-indigo-600">{weeklyHours}</span>
              <span className="text-sm text-indigo-700 ml-1">hrs</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">≈ {Math.round(weeklyHours * 60 / 6)} minutes per day (6 training days)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              const dates = getWeekDates(currentWeek);
              const totalMinutes = weeklyHours * 60;
              const dailyMinutes = Math.round(totalMinutes / 6);
              const newPlan = {};
              dates.forEach(({ date }, idx) => {
                if (idx === 6) {
                  newPlan[date] = [{ id: 'rest', minutes: 0, details: 'Recovery and mental reset' }];
                } else {
                  const cycle = idx % 3;
                  if (cycle === 0) {
                    newPlan[date] = [{ id: 'tactics', minutes: dailyMinutes, details: 'Focus on tactical patterns' }];
                  } else if (cycle === 1) {
                    const playTime = Math.round(dailyMinutes * 0.5);
                    const analysisTime = dailyMinutes - playTime;
                    newPlan[date] = [
                      { id: 'games', minutes: playTime, details: 'Play with full focus' },
                      { id: 'analysis', minutes: analysisTime, details: 'Deep analysis' }
                    ];
                  } else {
                    newPlan[date] = [{ id: 'endgame', minutes: dailyMinutes, details: 'Endgame fundamentals' }];
                  }
                }
              });
              setWeeklyPlans(prev => ({ ...prev, [currentWeek]: newPlan }));
            }}
            className="group p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300"
          >
            <div className="text-4xl mb-3">⚡</div>
            <p className="font-bold text-blue-900 text-lg mb-2">GM Noah's Method</p>
            <p className="text-sm text-slate-600">Rotating focus: Tactics → Games → Endgames</p>
          </button>

          <button
            onClick={() => {
              const dates = getWeekDates(currentWeek);
              const totalMinutes = weeklyHours * 60;
              const dailyMinutes = Math.round(totalMinutes / 6);
              const tacticsTime = Math.round(dailyMinutes / 3);
              const gamesTime = Math.round(dailyMinutes / 2);
              const endgameTime = dailyMinutes - tacticsTime - gamesTime;
              const newPlan = {};
              dates.forEach(({ date }, idx) => {
                if (idx === 6) {
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
            className="group p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-200 hover:border-emerald-400 hover:shadow-lg transition-all duration-300"
          >
            <div className="text-4xl mb-3">🎯</div>
            <p className="font-bold text-emerald-900 text-lg mb-2">Balanced Daily</p>
            <p className="text-sm text-slate-600">All elements every day for consistency</p>
          </button>

          <button
            onClick={() => {
              const dates = getWeekDates(currentWeek);
              const totalMinutes = weeklyHours * 60;
              const tacticsDaily = Math.round(totalMinutes / 3 / 3);
              const playAnalyzeDaily = Math.round(totalMinutes / 3 / 2);
              const endgameDaily = Math.round(totalMinutes / 3);
              const newPlan = {};
              dates.forEach(({ date }, idx) => {
                if (idx === 6) {
                  newPlan[date] = [{ id: 'rest', minutes: 0, details: '' }];
                } else if (idx <= 2) {
                  newPlan[date] = [{ id: 'tactics', minutes: tacticsDaily, details: 'Deep tactical training' }];
                } else if (idx === 3 || idx === 4) {
                  const playTime = Math.round(playAnalyzeDaily * 0.67);
                  const analysisTime = playAnalyzeDaily - playTime;
                  newPlan[date] = [
                    { id: 'games', minutes: playTime, details: 'Multiple games' },
                    { id: 'analysis', minutes: analysisTime, details: 'Deep review' }
                  ];
                } else {
                  newPlan[date] = [{ id: 'endgame', minutes: endgameDaily, details: 'Intensive endgame study' }];
                }
              });
              setWeeklyPlans(prev => ({ ...prev, [currentWeek]: newPlan }));
            }}
            className="group p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200 hover:border-purple-400 hover:shadow-lg transition-all duration-300"
          >
            <div className="text-4xl mb-3">📚</div>
            <p className="font-bold text-purple-900 text-lg mb-2">Block Focus</p>
            <p className="text-sm text-slate-600">Multi-day deep dives on each topic</p>
          </button>
        </div>

        <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-600">
            <span className="font-semibold">Pro Tip:</span> Following the 1/3 rule - Tactics, Play+Analyze, Endgames/Openings
          </p>
          <button
            onClick={() => {
              if (window.confirm('Clear this week\'s entire plan?')) {
                setWeeklyPlans(prev => {
                  const newPlans = { ...prev };
                  delete newPlans[currentWeek];
                  return newPlans;
                });
                setCompletedActivities({});
              }
            }}
            className="px-4 py-2 text-sm font-semibold text-rose-700 bg-rose-50 border-2 border-rose-200 rounded-xl hover:bg-rose-100 transition-colors"
          >
            Clear Week
          </button>
        </div>
      </div>

      {/* Week Summary */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Weekly Reflections</h3>
            <p className="text-sm text-slate-600">Track your progress and learnings</p>
          </div>
        </div>
        <textarea
          value={dailyNotes[`${currentWeek}-summary`] || ''}
          onChange={(e) => updateDailyNote(`${currentWeek}-summary`, e.target.value)}
          placeholder="How did this week go? What worked well? What needs improvement for next week? Any key insights from your games or studies?"
          className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder-slate-400 transition-all"
          rows="6"
        />
      </div>

      {/* Monthly Training Stats */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Monthly Training Overview</h3>
            <p className="text-sm text-slate-600">Aggregate stats across all your training</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(() => {
            // Calculate monthly stats from all weekly plans
            const monthlyData = {};

            Object.entries(weeklyPlans).forEach(([weekKey, weekPlan]) => {
              const weekDate = new Date(weekKey);
              const monthKey = `${weekDate.getFullYear()}-${String(weekDate.getMonth() + 1).padStart(2, '0')}`;

              if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                  totalMinutes: 0,
                  weeksPlanned: 0,
                  totalActivities: 0,
                  monthName: weekDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                };
              }

              const weekStats = getWeekStats({ [weekKey]: weekPlan }, weekKey);
              monthlyData[monthKey].totalMinutes += weekStats.totalPlannedMinutes;
              monthlyData[monthKey].weeksPlanned += 1;
              monthlyData[monthKey].totalActivities += Object.values(weekPlan).flat().length;
            });

            const sortedMonths = Object.entries(monthlyData)
              .sort(([a], [b]) => b.localeCompare(a))
              .slice(0, 3);

            if (sortedMonths.length === 0) {
              return (
                <div className="col-span-3 text-center py-12">
                  <div className="p-4 bg-slate-100 rounded-full inline-block mb-3">
                    <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-600 font-medium">No training data yet</p>
                  <p className="text-sm text-slate-400 mt-1">Start planning your weeks to see monthly stats</p>
                </div>
              );
            }

            return sortedMonths.map(([monthKey, data]) => (
              <div key={monthKey} className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-5 border border-cyan-200">
                <h4 className="font-bold text-slate-900 mb-4">{data.monthName}</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Total Training</span>
                    <span className="text-lg font-bold text-cyan-600">{data.totalMinutes}m</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Weeks Planned</span>
                    <span className="text-lg font-bold text-blue-600">{data.weeksPlanned}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Activities</span>
                    <span className="text-lg font-bold text-indigo-600">{data.totalActivities}</span>
                  </div>
                  <div className="pt-3 border-t border-cyan-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Avg per week</span>
                      <span className="text-sm font-semibold text-slate-700">
                        {Math.round(data.totalMinutes / data.weeksPlanned)}m
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Reflection History */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Reflection History</h3>
            <p className="text-sm text-slate-600">Review your past weekly insights</p>
          </div>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {(() => {
            const reflections = Object.entries(dailyNotes)
              .filter(([key, value]) => key.includes('-summary') && value.trim())
              .sort(([a], [b]) => b.localeCompare(a))
              .slice(0, 10);

            if (reflections.length === 0) {
              return (
                <div className="text-center py-12">
                  <div className="p-4 bg-slate-100 rounded-full inline-block mb-3">
                    <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-600 font-medium">No reflections yet</p>
                  <p className="text-sm text-slate-400 mt-1">Write your first weekly reflection above</p>
                </div>
              );
            }

            return reflections.map(([weekKey, reflection]) => {
              const weekStartDate = weekKey.replace('-summary', '');
              const reflectionWeekDates = getWeekDates(weekStartDate);
              const weekLabel = `${reflectionWeekDates[0]?.displayDate} - ${reflectionWeekDates[6]?.displayDate}, ${new Date(weekStartDate).getFullYear()}`;

              return (
                <div key={weekKey} className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-violet-500 rounded-lg">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h4 className="font-bold text-slate-900">Week of {weekLabel}</h4>
                    </div>
                    {weekKey.replace('-summary', '') === currentWeek && (
                      <span className="px-2 py-1 text-xs font-bold bg-violet-500 text-white rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {reflection}
                  </p>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
};

export default TrainingTab;
