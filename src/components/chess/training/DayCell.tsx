import { trainingActivities } from '../../../constants/trainingActivities';
import type { DayPlan } from '../../../types/training';

interface DayCellProps {
  day: string;
  /** YYYY-MM-DD */
  date: string;
  displayDate: string;
  dayPlan: DayPlan;
  note?: string;
  isToday: boolean;
  updateDayPlan: (date: string, plan: DayPlan) => void;
  editingDay: string | null;
  setEditingDay: (date: string | null) => void;
}

const DayCell = ({ day, date, displayDate, dayPlan, isToday, updateDayPlan, editingDay, setEditingDay }: DayCellProps) => {
  return (
    <div
      className={`bg-surface rounded-lg overflow-hidden border ${isToday ? 'border-accent ring-1 ring-accent' : 'border-hairline'}`}
    >
      {/* Day Header */}
      <div className={`p-4 ${isToday ? 'bg-surface-2' : 'bg-surface-2'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-fg">{day}</h4>
            <p className="text-sm text-fg-muted">{displayDate}</p>
          </div>
          {isToday && (
            <span className="px-2 py-1 text-xs font-semibold text-accent-fg bg-accent rounded">
              Today
            </span>
          )}
        </div>
      </div>

      {/* Activities */}
      <div className="p-4 space-y-2 min-h-[200px]">
        {dayPlan.length === 0 ? (
          <div className="py-8 text-center text-fg-subtle">
            <p className="text-sm">No activities planned</p>
          </div>
        ) : (
          dayPlan.map((activity, idx) => {
            const activityDef = trainingActivities.find(a => a.id === activity.id);
            return (
              <div
                key={idx}
                className={`p-3 rounded-lg border border-${activityDef?.color}-200 bg-${activityDef?.color}-50`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-fg">{activityDef?.label}</p>
                    {activity.minutes != null && activity.minutes > 0 && (
                      <p className="mt-1 text-xs text-fg-muted">{activity.minutes} minutes</p>
                    )}
                    {activity.details && (
                      <p className="mt-1 text-xs text-fg-muted">{activity.details}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      const newPlan = dayPlan.filter((_, i) => i !== idx);
                      updateDayPlan(date, newPlan);
                    }}
                    className="ml-2 text-fg-subtle hover:text-loss"
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
      <div className="p-4 border-t border-hairline bg-surface-2">
        <button
          onClick={() => setEditingDay(editingDay === date ? null : date)}
          className="w-full px-3 py-2 text-sm font-medium text-app transition-opacity bg-fg rounded-lg hover:opacity-90"
        >
          {editingDay === date ? 'Close' : '+ Add Activity'}
        </button>

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
                className="w-full px-3 py-2 text-sm text-left transition-colors bg-surface border border-hairline rounded hover:bg-surface-2 hover:text-accent"
              >
                {activity.label}
                {activity.defaultMinutes > 0 && (
                  <span className="ml-2 text-xs text-fg-muted">({activity.defaultMinutes}min)</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DayCell;
