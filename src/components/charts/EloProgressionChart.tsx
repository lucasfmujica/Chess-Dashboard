import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

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
    <div className="p-6 bg-surface rounded-lg border border-hairline">
      <h3 className="mb-4 text-lg font-semibold text-fg">ELO Progression</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={eloHistory}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="game" label={{ value: 'Game Number', position: 'insideBottom', offset: -5 }} />
          <YAxis
            domain={[
              (min: number) => Math.floor((min - 30) / 50) * 50,
              (max: number) => Math.ceil((max + 30) / 50) * 50,
            ]}
            allowDataOverflow={false}
            label={{ value: 'ELO', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="p-3 bg-surface border border-hairline rounded shadow">
                    <p className="font-semibold text-fg">Game {data.game}</p>
                    <p className="text-sm text-fg-muted">{data.tournament}</p>
                    <p className="text-sm text-fg">vs {data.opponent}</p>
                    <p className="text-sm text-fg-subtle">{data.opening}</p>
                    <p className="font-medium text-fg">ELO: {data.elo}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="elo" stroke="rgb(var(--accent))" strokeWidth={2} name="ELO" dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EloProgressionChart;
