/**
 * Returns the current date. Centralized so date-dependent features use a single
 * source of truth (and so it can be mocked in tests).
 * @returns {Date}
 */
export const getToday = () => new Date();

/**
 * Format a Date as a local YYYY-MM-DD string (no UTC shift).
 * @param {Date} date
 * @returns {string}
 */
export const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Today's date as a local YYYY-MM-DD string.
 * @returns {string}
 */
export const getTodayStr = () => formatLocalDate(getToday());

export const getWeekDates = (startDate) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dates = [];
  const [year, month, day] = startDate.split('-').map(Number);
  const start = new Date(year, month - 1, day); // month is 0-indexed

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dateYear = date.getFullYear();
    const dateMonth = String(date.getMonth() + 1).padStart(2, '0');
    const dateDay = String(date.getDate()).padStart(2, '0');
    dates.push({
      day: days[i],
      date: `${dateYear}-${dateMonth}-${dateDay}`,
      displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    });
  }
  return dates;
};

export const getCurrentWeekStart = () => {
  const today = getToday();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
  const startOfWeek = new Date(today);
  // Find Monday of current week (1 = Monday)
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days, else go back (dayOfWeek - 1) days
  startOfWeek.setDate(today.getDate() - daysFromMonday);
  return formatLocalDate(startOfWeek);
};

export const getWeekStats = (weeklyPlans, weekStart) => {
  const plan = weeklyPlans[weekStart] || {};
  const dates = getWeekDates(weekStart);

  let totalPlannedMinutes = 0;
  let daysPlanned = 0;
  let restDays = 0;
  const activityCounts = {};

  dates.forEach(({ date }) => {
    const dayPlan = plan[date] || [];
    if (dayPlan.length > 0) {
      daysPlanned++;
      dayPlan.forEach(activity => {
        if (activity.id === 'rest') {
          restDays++;
        } else {
          totalPlannedMinutes += activity.minutes || 0;
          activityCounts[activity.id] = (activityCounts[activity.id] || 0) + 1;
        }
      });
    }
  });

  // Active days = days with a non-rest plan. Guard against dividing by zero when
  // every planned day is a rest day (daysPlanned === restDays).
  const activeDays = daysPlanned - restDays;

  return {
    totalPlannedMinutes,
    daysPlanned,
    restDays,
    activityCounts,
    avgMinutesPerDay: activeDays > 0 ? Math.round(totalPlannedMinutes / activeDays) : 0
  };
};
