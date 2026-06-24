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
      className={`bg-surface rounded-lg overflow-hidden border transition-colors ${
        isToday ? 'border-accent ring-1 ring-accent' : 'border-hairline'
      }`}
    >
      {/* Day Header */}
      <div className={`p-4 ${isToday ? 'bg-surface-2' : 'bg-surface-2'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-fg">{day}</h4>
            <p className="text-sm text-fg-muted">{displayDate}</p>
          </div>
          <div className="flex items-center gap-2">
            {dayTotalMinutes > 0 && (
              <span className={`px-2 py-1 text-xs font-bold rounded-lg ${
                isToday ? 'bg-accent text-accent-fg' : 'bg-surface text-fg'
              }`}>
                {dayTotalMinutes}m
              </span>
            )}
            {isToday && (
              <span className="px-3 py-1 text-xs font-bold text-accent-fg bg-accent rounded-full">
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
            <div className="p-4 bg-surface-2 rounded-full mb-3">
              <svg className="w-8 h-8 text-fg-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-sm font-medium text-fg-muted">No activities yet</p>
            <p className="text-xs text-fg-subtle mt-1">Click below to add</p>
          </div>
        ) : (
          dayPlan.map((activity, idx) => {
            const activityDef = trainingActivities.find(a => a.id === activity.id);
            const activityKey = `${date}-${idx}`;
            const isCompleted = completedActivities[activityKey];

            return (
              <div
                key={idx}
                className={`group relative p-3 rounded-lg border transition-colors ${
                  isCompleted
                    ? 'bg-surface-2 border-hairline opacity-75'
                    : `bg-${activityDef?.color}-50 border-${activityDef?.color}-200 hover:border-${activityDef?.color}-300`
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => onToggleActivityCompletion(activityKey)}
                    className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-accent border-accent'
                        : 'bg-surface border-hairline hover:border-accent'
                    }`}
                  >
                    {isCompleted && (
                      <svg className="w-3.5 h-3.5 text-accent-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isCompleted ? 'line-through text-fg-muted' : 'text-fg'}`}>
                      {activityDef?.label}
                    </p>
                    {activity.minutes != null && activity.minutes > 0 && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <svg className="w-3.5 h-3.5 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs text-fg-muted font-medium">{activity.minutes} min</p>
                      </div>
                    )}
                    {activity.details && (
                      <p className="mt-1 text-xs text-fg-muted line-clamp-2">{activity.details}</p>
                    )}
                  </div>

                  <button
                    onClick={() => onRemoveActivity(idx)}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-fg-subtle hover:text-loss transition-all p-1 hover:bg-surface-2 rounded-lg"
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
      <div className="p-4 border-t border-hairline bg-surface-2 space-y-3">
        <div className="flex gap-2">
          <button
            onClick={() => onSetEditingDay(editingDay === date ? null : date)}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-app bg-fg rounded-lg hover:opacity-90 transition-opacity"
          >
            {editingDay === date ? '✕ Close' : '+ Add Activity'}
          </button>
          {dayPlan.length > 0 && (
            <button
              onClick={() => onExportToCalendar(date, dayPlan, note)}
              className="px-4 py-2.5 text-fg bg-surface border border-hairline rounded-lg hover:bg-surface-2 transition-colors font-semibold"
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
          <div className="space-y-1.5 max-h-48 overflow-y-auto p-2 bg-surface rounded-lg border border-hairline">
            {trainingActivities.map(activity => (
              <button
                key={activity.id}
                onClick={() => onAddActivity(activity)}
                className="w-full px-3 py-2 text-sm text-left font-medium text-fg bg-surface-2 rounded-lg hover:bg-surface-2 hover:text-accent transition-colors flex items-center justify-between group"
              >
                <span>{activity.label}</span>
                {activity.defaultMinutes > 0 && (
                  <span className="text-xs text-fg-muted group-hover:text-accent">
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
            className="w-full px-3 py-2 text-sm bg-surface border border-hairline text-fg rounded-lg resize-none focus:border-accent focus:ring-1 focus:ring-accent placeholder-fg-subtle"
            rows={2}
          />
        </div>
      </div>
    </div>
  );
};

export default DayCard;
