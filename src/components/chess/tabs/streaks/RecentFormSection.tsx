import { ChartBarIcon, CalendarIcon } from '@heroicons/react/24/outline';
import FormCard from './FormCard';
import type { GameResult, MonthlyStat } from '../../../../types/chess';

interface FormPeriodStats {
  wins: number;
  draws: number;
  losses: number;
  percentage: string | number;
  results: GameResult[];
}

interface FormStats {
  last5: FormPeriodStats;
  last10: FormPeriodStats;
}

interface RecentFormSectionProps {
  formStats?: FormStats | null;
  monthlyStats?: MonthlyStat[];
}

const RecentFormSection = ({ formStats, monthlyStats }: RecentFormSectionProps) => {
  if (!formStats) return null;

  return (
    <div className="bg-surface rounded-lg border border-hairline overflow-hidden">
      <div className="px-6 py-4 bg-surface-2 border-b border-hairline">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-surface rounded-lg">
            <ChartBarIcon className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-fg">Recent Form</h3>
            <p className="text-fg-muted text-sm">Your performance in recent games</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Last 5 Games */}
          <FormCard
            title="Last 5 Games"
            badge="L5"
            stats={{
              subtitle: "Most recent form",
              wins: formStats.last5.wins,
              draws: formStats.last5.draws,
              losses: formStats.last5.losses,
              percentage: formStats.last5.percentage,
              results: formStats.last5.results
            }}
            borderColor="border-hairline"
            bgColor="bg-surface-2"
            badgeColor="bg-surface"
          />

          {/* Last 10 Games */}
          <FormCard
            title="Last 10 Games"
            badge="L10"
            stats={{
              subtitle: "Extended form",
              wins: formStats.last10.wins,
              draws: formStats.last10.draws,
              losses: formStats.last10.losses,
              percentage: formStats.last10.percentage,
              results: formStats.last10.results
            }}
            borderColor="border-hairline"
            bgColor="bg-surface-2"
            badgeColor="bg-surface"
          />

          {/* Current Month */}
          {monthlyStats && monthlyStats.length > 0 && (
            <div className="p-5 bg-surface-2 rounded-lg border border-hairline">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-surface rounded-lg">
                  <CalendarIcon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h4 className="font-bold text-fg">This Month</h4>
                  <p className="text-xs text-fg-muted">{monthlyStats[0].month}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-fg-muted">Games</span>
                  <span className="text-lg font-bold text-fg tabular-nums">
                    {monthlyStats[0].games}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-fg-muted">Score</span>
                  <span className={`text-2xl font-bold tabular-nums ${monthlyStats[0].percentage >= 50 ? 'text-win' : 'text-loss'}`}>
                    {monthlyStats[0].percentage}%
                  </span>
                </div>
                <div className="pt-2 mt-2 border-t border-hairline">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="text-win font-bold text-lg tabular-nums">{monthlyStats[0].wins}</div>
                      <div className="text-fg-subtle">Wins</div>
                    </div>
                    <div>
                      <div className="text-draw font-bold text-lg tabular-nums">{monthlyStats[0].draws}</div>
                      <div className="text-fg-subtle">Draws</div>
                    </div>
                    <div>
                      <div className="text-loss font-bold text-lg tabular-nums">{monthlyStats[0].losses}</div>
                      <div className="text-fg-subtle">Losses</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecentFormSection;
