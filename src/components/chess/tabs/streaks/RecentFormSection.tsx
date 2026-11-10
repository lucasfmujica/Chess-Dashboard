import { Card, CardHeader } from '../../../ui';
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
    <Card>
      <CardHeader title="Forma reciente" subtitle="Cómo te fue en las últimas partidas" />
      <div className="mt-4 grid grid-cols-1 divide-y divide-hairline rounded border border-hairline md:grid-cols-3 md:divide-x md:divide-y-0">
        <FormCard
          title="Últimas 5"
          badge="5"
          stats={{
            subtitle: 'La forma de ahora',
            wins: formStats.last5.wins,
            draws: formStats.last5.draws,
            losses: formStats.last5.losses,
            percentage: formStats.last5.percentage,
            results: formStats.last5.results
          }}
        />

        <FormCard
          title="Últimas 10"
          badge="10"
          stats={{
            subtitle: 'Una ventana más larga',
            wins: formStats.last10.wins,
            draws: formStats.last10.draws,
            losses: formStats.last10.losses,
            percentage: formStats.last10.percentage,
            results: formStats.last10.results
          }}
        />

        {/* Most recent tournament. monthlyStats is ordered oldest-first and is
            per tournament, not per calendar month, so this reads the last
            entry: [0] is the first event ever played. */}
        {latestTournament && (
          <div className="p-4">
            <p className="text-label">Último torneo</p>
            <p className="mt-0.5 truncate font-serif text-sm text-fg">{latestTournament.tournament}</p>
            <div className="mt-3 flex items-baseline justify-between gap-3">
              <span className="font-mono text-sm tabular-nums text-fg-muted">
                + {latestTournament.wins} · = {latestTournament.draws} · − {latestTournament.losses}
              </span>
              <span className={`font-mono text-2xl tabular-nums ${latestTournament.percentage >= 50 ? 'text-win' : 'text-loss'}`}>
                {latestTournament.percentage}%
              </span>
            </div>
            <p className="mt-3 border-t border-hairline pt-3 text-xs text-fg-muted">
              <span className="font-mono tabular-nums text-fg">{latestTournament.games}</span> partidas
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default RecentFormSection;
