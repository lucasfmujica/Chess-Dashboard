interface CalendarDay {
  date: string;
  games: number;
  level: number;
}

interface ActivityCalendarProps {
  calendar: CalendarDay[];
}

const LEVEL_CLASS = [
  'bg-surface-2',
  'bg-accent/25',
  'bg-accent/50',
  'bg-accent/75',
  'bg-accent',
];

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

const ActivityCalendar = ({ calendar }: ActivityCalendarProps) => {
  // Chunk the day-major series into weeks (columns), GitHub-style.
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < calendar.length; i += 7) {
    weeks.push(calendar.slice(i, i + 7));
  }

  const totalGames = calendar.reduce((sum, d) => sum + d.games, 0);
  const activeDays = calendar.filter(d => d.games > 0).length;

  return (
    <div className="bg-surface rounded-lg border border-hairline p-6">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-fg">Activity Calendar</h3>
          <p className="text-sm text-fg-muted">Your playing activity over the last 12 weeks</p>
        </div>
        <p className="text-sm text-fg-muted tabular-nums">
          {totalGames} games · {activeDays} active days
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {/* Day-of-week labels */}
        <div className="flex flex-col gap-1 pr-1">
          {DAY_LABELS.map((label, i) => (
            <div key={i} className="h-3.5 text-[10px] leading-[14px] text-fg-subtle">{label}</div>
          ))}
        </div>

        {/* Week columns */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => (
              <div
                key={di}
                className={`w-3.5 h-3.5 rounded-[3px] ${LEVEL_CLASS[day.level] ?? 'bg-surface-2'} hover:ring-1 hover:ring-accent transition-shadow`}
                title={`${day.date}: ${day.games} game${day.games !== 1 ? 's' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-end gap-1.5">
        <span className="text-xs text-fg-muted">Less</span>
        {LEVEL_CLASS.map((cls, i) => (
          <div key={i} className={`w-3.5 h-3.5 rounded-[3px] ${cls}`} />
        ))}
        <span className="text-xs text-fg-muted">More</span>
      </div>
    </div>
  );
};

export default ActivityCalendar;
