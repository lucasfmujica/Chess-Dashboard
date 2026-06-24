import { ChartBarIcon } from '@heroicons/react/24/outline';

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
    <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline">
      <div className="p-8">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-fg mb-2">Weekly Game Frequency</h3>
          <p className="text-fg-muted">Track your playing consistency over the last 12 weeks</p>
        </div>

        {/* Bar Chart */}
        <div className="space-y-3">
          {weeklyActivity.map((week, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-24 text-sm font-medium text-fg">{week.week}</div>
              <div className="flex-1 h-10 bg-surface-2 rounded-lg overflow-hidden">
                <div
                  className="h-full bg-accent flex items-center justify-end px-3 transition-all duration-500"
                  style={{ width: `${Math.min((week.games / 10) * 100, 100)}%` }}
                >
                  {week.games > 0 && (
                    <span className="text-accent-fg text-sm font-bold tabular-nums">{week.games}</span>
                  )}
                </div>
              </div>
              <div className="w-16 text-sm text-fg-muted text-right tabular-nums">
                {week.games} {week.games === 1 ? 'game' : 'games'}
              </div>
            </div>
          ))}
        </div>

        {/* Average Line */}
        <div className="mt-6 p-4 bg-surface-2 rounded-lg border border-hairline">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5 text-accent" />
              <span className="text-sm font-semibold text-fg">Average per Week</span>
            </div>
            <span className="text-2xl font-bold text-fg tabular-nums">{avgGamesPerWeek} games</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyActivityChart;
