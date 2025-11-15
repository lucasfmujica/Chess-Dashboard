import React from 'react';
import { getWeekDates } from '../../../utils/chessHelpers';
import DayCell from './DayCell';

const WeeklyPlanner = ({
  currentWeek,
  weeklyPlans,
  dailyNotes,
  editingDay,
  setEditingDay,
  updateDayPlan
}) => {
  const getCurrentWeekPlan = () => {
    return weeklyPlans[currentWeek] || {};
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {getWeekDates(currentWeek).map(({ day, date, displayDate }) => {
        const dayPlan = getCurrentWeekPlan()[date] || [];
        const note = dailyNotes[date] || '';
        const isToday = date === new Date(2025, 10, 15).toISOString().split('T')[0];

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
