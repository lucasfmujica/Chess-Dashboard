import { Card, CardHeader } from '../../../ui';

interface WeekActivity {
  week: string;
  games: number;
  active: boolean;
}

interface WeeklyActivityChartProps {
  weeklyActivity: WeekActivity[];
  avgGamesPerWeek: string;
}

const WeeklyActivityChart = ({ weeklyActivity, avgGamesPerWeek }: WeeklyActivityChartProps) => {
  return (
    <Card>
      <CardHeader
        title="Partidas por semana"
        subtitle="Últimas 12 semanas"
        actions={
          <span className="text-sm text-fg-muted">
            Promedio <span className="font-mono tabular-nums text-fg">{avgGamesPerWeek}</span> por semana
          </span>
        }
        className="mb-5"
      />

      <ul className="space-y-2">
        {weeklyActivity.map((week, idx) => (
          <li key={idx} className="grid grid-cols-[80px_1fr_72px] items-center gap-3">
            <span className="truncate font-mono text-xs tabular-nums text-fg-muted">{week.week}</span>
            <span className="h-5 overflow-hidden rounded-sm bg-surface-2">
              <span
                className="block h-full bg-accent"
                style={{ width: `${Math.min((week.games / 10) * 100, 100)}%` }}
              />
            </span>
            <span className="text-right text-sm text-fg-muted">
              <span className="font-mono tabular-nums text-fg">{week.games}</span> {week.games === 1 ? 'partida' : 'partidas'}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
};

export default WeeklyActivityChart;
