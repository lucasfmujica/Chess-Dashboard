import { Area, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrophyIcon, SparklesIcon, ChartBarIcon } from '@heroicons/react/24/outline';

/** A single entry from useTrendsAndAnalytics.tournamentComparison. */
interface TournamentComparisonEntry {
  name: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  score: number;
  avgOppElo: number;
  playerElo: number;
  eloChange: number;
  performance: number | null;
}

interface TournamentComparisonProps {
  tournamentComparison: TournamentComparisonEntry[];
}

const TournamentComparison = ({ tournamentComparison }: TournamentComparisonProps) => {
  return (
    <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-surface-2 rounded-lg">
            <TrophyIcon className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-fg">🏆 Tournament Comparison</h3>
            <p className="text-sm text-fg-muted">Compare your performance across all rated tournaments</p>
          </div>
        </div>

        {/* Tournament Stats Summary */}
        <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2">
          <div className="p-4 bg-surface-2 rounded-lg border border-hairline">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-fg-muted">Total Tournaments</span>
              <TrophyIcon className="w-5 h-5 text-accent" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-fg">{tournamentComparison.length}</span>
              <span className="text-sm text-fg-muted">events</span>
            </div>
          </div>

          <div className="p-4 bg-surface-2 rounded-lg border border-hairline">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-fg-muted">Best Performance</span>
              <SparklesIcon className="w-5 h-5 text-accent" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-fg">
                {Math.max(...tournamentComparison.map(t => t.performance || 0))}
              </span>
              <span className="text-sm text-fg-muted">rating</span>
            </div>
          </div>
        </div>

        {/* Enhanced Table */}
        <div className="overflow-hidden border border-hairline rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-hairline">
              <thead className="bg-surface-2">
                <tr>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-left text-fg uppercase tracking-wider">Tournament</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-center text-fg uppercase tracking-wider">Games</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-center text-fg uppercase tracking-wider">Score %</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-center text-fg uppercase tracking-wider">Your ELO</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-center text-fg uppercase tracking-wider">Avg Opp</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-center text-fg uppercase tracking-wider">Performance</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-center text-fg uppercase tracking-wider">ELO Δ</th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-hairline">
                {tournamentComparison.map((t, idx) => (
                  <tr key={idx} className="transition-colors hover:bg-surface-2">
                    <td className="px-4 py-3 text-sm font-semibold text-fg">{t.name}</td>
                    <td className="px-4 py-3 text-sm text-center text-fg-muted">{t.games}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`px-2.5 py-1 font-bold rounded-lg ${
                        t.score >= 50 ? 'text-win bg-surface-2' : 'text-loss bg-surface-2'
                      }`}>
                        {t.score}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className="px-2.5 py-1 font-semibold text-fg bg-surface-2 rounded-lg">
                        {t.playerElo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className="px-2.5 py-1 font-semibold text-fg bg-surface-2 rounded-lg">
                        {t.avgOppElo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`px-2.5 py-1 font-bold rounded-lg ${
                        (t.performance ?? 0) > t.playerElo ? 'text-win bg-surface-2' :
                        (t.performance ?? 0) < t.playerElo ? 'text-loss bg-surface-2' : 'text-fg bg-surface-2'
                      }`}>
                        {t.performance || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`px-2.5 py-1 font-bold rounded-lg ${
                        t.eloChange > 0 ? 'text-win bg-surface-2' :
                        t.eloChange < 0 ? 'text-loss bg-surface-2' : 'text-fg bg-surface-2'
                      }`}>
                        {t.eloChange > 0 ? '+' : ''}{t.eloChange}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Enhanced Tournament Performance Trend Chart */}
        <div className="mt-6 p-4 bg-surface-2 rounded-lg border border-hairline">
          <h4 className="mb-4 text-sm font-semibold text-fg flex items-center gap-2">
            <ChartBarIcon className="w-4 h-4" />
            Performance Rating Trend
          </h4>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={tournamentComparison}>
              <defs>
                <linearGradient id="gradientPlayerElo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgb(var(--cat-2))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="rgb(var(--cat-2))" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="gradientOppElo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgb(var(--cat-4))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="rgb(var(--cat-4))" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="gradientPerformance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgb(var(--cat-1))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="rgb(var(--cat-1))" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
              <XAxis
                dataKey="name"
                stroke="rgb(var(--fg-muted))"
                tick={{ fontSize: 11 }}
                angle={-15}
                textAnchor="end"
                height={80}
                style={{ fontWeight: 600 }}
              />
              <YAxis stroke="rgb(var(--fg-muted))" domain={[1600, 2100]} style={{ fontSize: '12px', fontWeight: 600 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgb(var(--surface))',
                  border: '1px solid rgb(var(--border))',
                  borderRadius: '8px',
                  color: 'rgb(var(--fg))',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 600 }} />
              <Area
                type="monotone"
                dataKey="playerElo"
                stroke="rgb(var(--cat-2))"
                fill="url(#gradientPlayerElo)"
                name="Your ELO"
                strokeWidth={3}
              />
              <Line
                type="monotone"
                dataKey="avgOppElo"
                stroke="rgb(var(--cat-4))"
                name="Avg Opponent"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: 'rgb(var(--cat-4))', r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="performance"
                stroke="rgb(var(--cat-1))"
                name="Performance"
                strokeWidth={3}
                connectNulls
                dot={{ fill: 'rgb(var(--cat-1))', r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default TournamentComparison;
