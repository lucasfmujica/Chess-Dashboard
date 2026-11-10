import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TournamentStat } from '../../../../types/chess';
import { Card, CardHeader } from '../../../ui';

interface PerformanceChartProps {
  tournamentStats: TournamentStat[];
}

const AXIS_TICK = { fontSize: 12, fill: 'rgb(var(--fg-subtle))' };

const PerformanceChart = ({ tournamentStats }: PerformanceChartProps) => {
  const height = Math.max(240, tournamentStats.length * 36 + 40);
  return (
    <Card>
      <CardHeader title="Performance por torneo" subtitle="ELO de performance de cada evento" className="mb-4" />
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={tournamentStats} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="rgb(var(--border))" horizontal={false} />
          <XAxis type="number" domain={['dataMin - 100', 'dataMax + 50']} tick={AXIS_TICK} stroke="rgb(var(--border))" allowDecimals={false} />
          <YAxis type="category" dataKey="tournament" width={150} tick={AXIS_TICK} stroke="rgb(var(--border))" />
          <Tooltip
            cursor={{ fill: 'rgb(var(--accent) / 0.08)' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload as TournamentStat;
                return (
                  <div className="rounded border border-hairline bg-surface p-3 text-sm">
                    <p className="mb-2 font-serif text-base font-semibold text-fg">{data.tournament}</p>
                    <p className="font-mono tabular-nums text-fg">Performance {data.performanceRating}</p>
                    <p className="font-mono tabular-nums text-fg-muted">
                      {data.score} · +{data.wins} ={data.draws} −{data.losses}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="performanceRating" fill="rgb(var(--accent))" name="Performance" radius={[0, 2, 2, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default PerformanceChart;
