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
      className={`bg-white rounded-lg shadow-md overflow-hidden border-2 ${isToday ? 'border-blue-500' : 'border-gray-200'}`}
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
                    {activity.minutes != null && activity.minutes > 0 && (
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
        <button
          onClick={() => setEditingDay(editingDay === date ? null : date)}
          className="w-full px-3 py-2 text-sm font-medium text-white transition-colors bg-indigo-600 rounded-lg hover:bg-indigo-700"
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
                className="w-full px-3 py-2 text-sm text-left transition-colors bg-white border border-gray-200 rounded hover:border-indigo-300 hover:bg-indigo-50"
              >
                {activity.label}
                {activity.defaultMinutes > 0 && (
                  <span className="ml-2 text-xs text-gray-500">({activity.defaultMinutes}min)</span>
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
