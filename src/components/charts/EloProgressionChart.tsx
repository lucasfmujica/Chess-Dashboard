import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardHeader } from '../ui';

interface EloHistoryEntry {
  game: number;
  eloBefore: number;
  elo: number;
  eloChange: number;
  tournament: string;
  opponent: string;
  eco: string;
  opening: string;
  expected: number;
  actual: number;
  diff: number;
  kFactor: number;
}

interface EloProgressionChartProps {
  eloHistory: EloHistoryEntry[];
}

const EloProgressionChart = ({ eloHistory }: EloProgressionChartProps) => {
  return (
    <Card>
      <CardHeader title="Progreso de ELO" subtitle={`${eloHistory.length} partidas válidas`} className="mb-4" />
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={eloHistory} margin={{ top: 8, right: 16, left: -4, bottom: 0 }}>
          <CartesianGrid stroke="rgb(var(--border))" vertical={false} />
          <XAxis
            dataKey="game"
            stroke="rgb(var(--fg-muted))"
            tick={{ fontSize: 12, fill: 'rgb(var(--fg-muted))' }}
            axisLine={{ stroke: 'rgb(var(--border))' }}
            tickLine={false}
          />
          <YAxis
            domain={[
              (min: number) => Math.floor((min - 30) / 50) * 50,
              (max: number) => Math.ceil((max + 30) / 50) * 50,
            ]}
            allowDataOverflow={false}
            stroke="rgb(var(--fg-muted))"
            tick={{ fontSize: 12, fill: 'rgb(var(--fg-muted))' }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            cursor={{ stroke: 'rgb(var(--border-strong))', strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="rounded border border-hairline bg-surface p-3 text-sm">
                    <p className="font-medium text-fg">Partida {data.game}</p>
                    <p className="text-fg-muted">{data.tournament}</p>
                    <p className="text-fg">contra {data.opponent}</p>
                    {data.opening && <p className="font-serif text-fg-subtle">{data.opening}</p>}
                    <p className="mt-1 font-mono tabular-nums text-fg">ELO {data.elo}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="elo"
            stroke="rgb(var(--cat-1))"
            strokeWidth={2}
            name="ELO"
            dot={{ r: 2.5, strokeWidth: 0, fill: 'rgb(var(--cat-1))' }}
            activeDot={{ r: 5, fill: 'rgb(var(--cat-1))', stroke: 'rgb(var(--surface))', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default EloProgressionChart;
