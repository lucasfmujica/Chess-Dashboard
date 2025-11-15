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
  const today = new Date(2025, 10, 15); // Saturday Nov 15, 2025 (month is 0-indexed)
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
  const startOfWeek = new Date(today);
  // Find Monday of current week (1 = Monday)
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days, else go back (dayOfWeek - 1) days
  startOfWeek.setDate(today.getDate() - daysFromMonday);
  const year = startOfWeek.getFullYear();
  const month = String(startOfWeek.getMonth() + 1).padStart(2, '0');
  const day = String(startOfWeek.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

  return {
    totalPlannedMinutes,
    daysPlanned,
    restDays,
    activityCounts,
    avgMinutesPerDay: daysPlanned > 0 ? Math.round(totalPlannedMinutes / (daysPlanned - restDays)) : 0
  };
};
