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
  const latestTournament = monthlyStats?.[monthlyStats.length - 1];
  if (!formStats) return null;

  return (
    <div className="bg-surface rounded-lg border border-hairline overflow-hidden">
      <div className="px-6 py-4 bg-surface-2 border-b border-hairline">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-surface rounded-lg">
            <ChartBarIcon className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-fg">Recent Form</h3>
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

          {/* Most recent tournament. monthlyStats is ordered oldest-first and is
              per tournament, not per calendar month, so this reads the last
              entry: [0] is the first event ever played. */}
          {latestTournament && (
            <div className="p-5 bg-surface-2 rounded-lg border border-hairline">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-surface rounded-lg">
                  <CalendarIcon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h4 className="font-bold text-fg">Último torneo</h4>
                  <p className="text-xs text-fg-muted">{latestTournament.tournament}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-fg-muted">Games</span>
                  <span className="text-lg font-bold text-fg tabular-nums">
                    {latestTournament.games}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-fg-muted">Score</span>
                  <span className={`text-2xl font-bold tabular-nums ${latestTournament.percentage >= 50 ? 'text-win' : 'text-loss'}`}>
                    {latestTournament.percentage}%
                  </span>
                </div>
                <div className="pt-2 mt-2 border-t border-hairline">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="text-win font-bold text-lg tabular-nums">{latestTournament.wins}</div>
                      <div className="text-fg-subtle">Wins</div>
                    </div>
                    <div>
                      <div className="text-draw font-bold text-lg tabular-nums">{latestTournament.draws}</div>
                      <div className="text-fg-subtle">Draws</div>
                    </div>
                    <div>
                      <div className="text-loss font-bold text-lg tabular-nums">{latestTournament.losses}</div>
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
