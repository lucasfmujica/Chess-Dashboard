import { Card, CardHeader } from '../../../ui';

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

const DAY_LABELS = ['', 'Lun', '', 'Mié', '', 'Vie', ''];

const ActivityCalendar = ({ calendar }: ActivityCalendarProps) => {
  // Chunk the day-major series into weeks (columns), GitHub-style.
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < calendar.length; i += 7) {
    weeks.push(calendar.slice(i, i + 7));
  }

  const totalGames = calendar.reduce((sum, d) => sum + d.games, 0);
  const activeDays = calendar.filter(d => d.games > 0).length;

  return (
    <Card>
      <CardHeader
        title="Días de juego"
        subtitle={
          <span className="tabular-nums">
            Últimas 12 semanas · {totalGames} partidas · {activeDays} días con partidas
          </span>
        }
        className="mb-5"
      />

      <div className="flex gap-1 overflow-x-auto pb-1">
        {/* Day-of-week labels */}
        <div className="flex flex-col gap-1 pr-1">
          {DAY_LABELS.map((label, i) => (
            <div key={i} className="h-3.5 font-mono text-[10px] leading-[14px] text-fg-subtle">{label}</div>
          ))}
        </div>

        {/* Week columns */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => (
              <div
                key={di}
                className={`h-3.5 w-3.5 rounded-[1px] ${LEVEL_CLASS[day.level] ?? 'bg-surface-2'}`}
                title={`${day.date}: ${day.games} partida${day.games !== 1 ? 's' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-end gap-1.5">
        <span className="text-xs text-fg-muted">Menos</span>
        {LEVEL_CLASS.map((cls, i) => (
          <div key={i} className={`h-3.5 w-3.5 rounded-[1px] ${cls}`} />
        ))}
        <span className="text-xs text-fg-muted">Más</span>
      </div>
    </Card>
  );
};

export default ActivityCalendar;
