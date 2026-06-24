import { trainingActivities } from '../../../../constants/trainingActivities';
import type { TrainingActivityTemplate } from '../../../../constants/trainingActivities';
import type { DayPlan } from '../../../../types/training';

interface DayCardProps {
  day: string;
  date: string;
  displayDate: string;
  isToday: boolean;
  dayPlan: DayPlan;
  note: string;
  editingDay: string | null;
  completedActivities: Record<string, boolean>;
  onToggleActivityCompletion: (activityKey: string) => void;
  onRemoveActivity: (idx: number) => void;
  onSetEditingDay: (date: string | null) => void;
  onAddActivity: (activity: TrainingActivityTemplate) => void;
  onExportToCalendar: (date: string, dayPlan: DayPlan, note: string) => void;
  onUpdateNote: (date: string, value: string) => void;
}

const DayCard = ({
  day,
  date,
  displayDate,
  isToday,
  dayPlan,
  note,
  editingDay,
  completedActivities,
  onToggleActivityCompletion,
  onRemoveActivity,
  onSetEditingDay,
  onAddActivity,
  onExportToCalendar,
  onUpdateNote,
}: DayCardProps) => {
  const dayTotalMinutes = dayPlan.reduce((sum, act) => sum + (act.minutes || 0), 0);

  return (
    <div
      className={`bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border-2 transition-all duration-300 hover:shadow-xl ${
        isToday ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200/60 dark:border-slate-700/60'
      }`}
    >
      {/* Day Header */}
      <div className={`p-4 ${isToday ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900'}`}>
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
                    onClick={() => onToggleActivityCompletion(activityKey)}
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
                    {activity.minutes != null && activity.minutes > 0 && (
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
                    onClick={() => onRemoveActivity(idx)}
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
      <div className="p-4 border-t bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm space-y-3">
        <div className="flex gap-2">
          <button
            onClick={() => onSetEditingDay(editingDay === date ? null : date)}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {editingDay === date ? '✕ Close' : '+ Add Activity'}
          </button>
          {dayPlan.length > 0 && (
            <button
              onClick={() => onExportToCalendar(date, dayPlan, note)}
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
                onClick={() => onAddActivity(activity)}
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
            onChange={(e) => onUpdateNote(date, e.target.value)}
            placeholder="Daily notes & reflections..."
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder-slate-400 dark:text-slate-100 dark:placeholder-slate-500"
            rows={2}
          />
        </div>
      </div>
    </div>
  );
};

export default DayCard;
