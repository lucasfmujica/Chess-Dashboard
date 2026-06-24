interface CalendarDay {
  date: string;
  games: number;
  level: number;
}

interface ActivityCalendarProps {
  calendar: CalendarDay[];
}

const ActivityCalendar = ({ calendar }: ActivityCalendarProps) => {
  const levelColors = [
    'bg-gray-100',
    'bg-emerald-200',
    'bg-emerald-400',
    'bg-emerald-600',
    'bg-emerald-800'
  ];

  return (
    <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline">
      <div className="p-8">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-fg mb-2">Activity Calendar</h3>
          <p className="text-fg-muted">Your playing activity over the last 12 weeks</p>
        </div>

        {/* Calendar Grid */}
        <div className="space-y-2">
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-xs text-fg-muted text-center font-medium">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendar.map((day, idx) => (
              <div
                key={idx}
                className={`w-full aspect-square ${levelColors[day.level]} rounded-sm hover:ring-2 hover:ring-emerald-500 transition-all cursor-pointer group relative`}
                title={`${day.date}: ${day.games} game${day.games !== 1 ? 's' : ''}`}
              >
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  {day.date}: {day.games} game{day.games !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 justify-end mt-4">
            <span className="text-sm text-fg-muted">Less</span>
            <div className="w-4 h-4 bg-gray-100 rounded-sm"></div>
            <div className="w-4 h-4 bg-emerald-200 rounded-sm"></div>
            <div className="w-4 h-4 bg-emerald-400 rounded-sm"></div>
            <div className="w-4 h-4 bg-emerald-600 rounded-sm"></div>
            <div className="w-4 h-4 bg-emerald-800 rounded-sm"></div>
            <span className="text-sm text-fg-muted">More</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityCalendar;
