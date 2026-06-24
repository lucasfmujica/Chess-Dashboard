import type { WeekDate, WeekStats } from '../../../../types/training';

interface WeekNavigatorProps {
  currentWeek: string;
  weekDates: WeekDate[];
  weekStats: WeekStats;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  completionPercent: number;
  completedCount: number;
  totalActivities: number;
}

const WeekNavigator = ({
  currentWeek,
  weekDates,
  weekStats,
  onPrevWeek,
  onNextWeek,
  completionPercent,
  completedCount,
  totalActivities,
}: WeekNavigatorProps) => {
  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 dark:border-slate-700/60 overflow-hidden">
      {/* Week Navigator */}
      <div className="p-6 bg-gradient-to-r from-slate-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={onPrevWeek}
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
            onClick={onNextWeek}
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
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 rounded-xl p-4 border border-blue-200/60 dark:border-slate-700/60">
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

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-900 rounded-xl p-4 border border-emerald-200/60 dark:border-slate-700/60">
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

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-900 rounded-xl p-4 border border-purple-200/60 dark:border-slate-700/60">
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

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-900 rounded-xl p-4 border border-amber-200/60 dark:border-slate-700/60">
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

          <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-slate-800 dark:to-slate-900 rounded-xl p-4 border border-rose-200/60 dark:border-slate-700/60">
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
  );
};

export default WeekNavigator;
