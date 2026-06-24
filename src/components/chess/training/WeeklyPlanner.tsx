import { getWeekDates, getTodayStr } from '../../../utils/chessHelpers';
import DayCell from './DayCell';
import type { WeeklyPlans, DayPlan } from '../../../types/training';

interface WeeklyPlannerProps {
  /** The week's Monday (YYYY-MM-DD). */
  currentWeek: string;
  weeklyPlans: WeeklyPlans;
  dailyNotes: Record<string, string>;
  editingDay: string | null;
  setEditingDay: (date: string | null) => void;
  updateDayPlan: (date: string, plan: DayPlan) => void;
}

const WeeklyPlanner = ({
  currentWeek,
  weeklyPlans,
  dailyNotes,
  editingDay,
  setEditingDay,
  updateDayPlan
}: WeeklyPlannerProps) => {
  const getCurrentWeekPlan = () => {
    return weeklyPlans[currentWeek] || {};
  };

  const todayStr = getTodayStr();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {getWeekDates(currentWeek).map(({ day, date, displayDate }) => {
        const dayPlan = getCurrentWeekPlan()[date] || [];
        const note = dailyNotes[date] || '';
        const isToday = date === todayStr;

        return (
          <DayCell
            key={date}
            day={day}
            date={date}
            displayDate={displayDate}
            dayPlan={dayPlan}
            note={note}
            isToday={isToday}
            updateDayPlan={updateDayPlan}
            editingDay={editingDay}
            setEditingDay={setEditingDay}
          />
        );
      })}
    </div>
  );
};

export default WeeklyPlanner;
