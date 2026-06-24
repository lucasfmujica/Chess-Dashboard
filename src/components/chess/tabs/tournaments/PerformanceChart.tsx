import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TournamentStat } from '../../../../types/chess';

interface PerformanceChartProps {
  tournamentStats: TournamentStat[];
}

const PerformanceChart = ({ tournamentStats }: PerformanceChartProps) => {
  return (
    <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline">
      <div className="p-8">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-fg mb-2">Performance Rating Comparison</h3>
          <p className="text-fg-muted">Visual comparison of performance ratings across tournaments</p>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={tournamentStats} layout="vertical">
            <defs>
              <linearGradient id="performanceBarGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.8}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" domain={[1600, 2100]} stroke="#6b7280" />
            <YAxis type="category" dataKey="tournament" width={150} stroke="#6b7280" />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as TournamentStat;
                  return (
                    <div className="p-4 bg-surface border border-hairline rounded-lg">
                      <p className="font-bold text-fg text-lg mb-3">{data.tournament}</p>
                      <div className="space-y-2">
                        <div className="flex justify-between gap-6">
                          <span className="text-sm text-fg-muted">Performance:</span>
                          <span className="text-sm font-bold text-accent tabular-nums">{data.performanceRating}</span>
                        </div>
                        <div className="flex justify-between gap-6">
                          <span className="text-sm text-fg-muted">Score:</span>
                          <span className="text-sm font-semibold text-fg tabular-nums">{data.score}</span>
                        </div>
                        <div className="flex justify-between gap-6">
                          <span className="text-sm text-fg-muted">Record:</span>
                          <span className="text-sm font-semibold text-fg tabular-nums">
                            {data.wins}-{data.draws}-{data.losses}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="performanceRating"
              fill="url(#performanceBarGradient)"
              name="Performance Rating"
              radius={[0, 8, 8, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PerformanceChart;
