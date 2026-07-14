import { useMemo } from 'react';
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { TrophyIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, ChartBarIcon, FireIcon, BoltIcon } from '@heroicons/react/24/outline';
import { getChartHeight } from '../../../utils/chartUtils';

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

interface RatingTabProps {
  eloHistory: EloHistoryEntry[];
}

const RatingTab = ({ eloHistory }: RatingTabProps) => {
  // Calculate statistics
  const stats = useMemo(() => {
    if (!eloHistory || eloHistory.length === 0) {
      return {
        currentElo: 0,
        highestElo: 0,
        lowestElo: 0,
        totalChange: 0,
        biggestGain: 0,
        biggestLoss: 0,
        averagePerformance: 0,
        averageEloChange: 0,
        positiveGames: 0,
        negativeGames: 0
      };
    }

    const eloValues = eloHistory.map(h => h.elo);
    const currentElo = eloHistory[eloHistory.length - 1].elo;
    const highestElo = Math.max(...eloValues);
    const lowestElo = Math.min(...eloValues);
    const totalChange = currentElo - eloHistory[0].eloBefore;

    // Calculate biggest gain and loss
    let biggestGain = 0;
    let biggestLoss = 0;
    let positiveGames = 0;
    let negativeGames = 0;
    let totalEloChange = 0;

    for (let i = 0; i < eloHistory.length; i++) {
      const change = eloHistory[i].eloChange;
      totalEloChange += change;
      if (change > biggestGain) biggestGain = change;
      if (change < biggestLoss) biggestLoss = change;
      if (change > 0) positiveGames++;
      if (change < 0) negativeGames++;
    }

    // Calculate average performance differential
    const totalDiff = eloHistory.reduce((sum, game) => sum + game.diff, 0);
    const averagePerformance = totalDiff / eloHistory.length;
    const averageEloChange = totalEloChange / eloHistory.length;

    return {
      currentElo,
      highestElo,
      lowestElo,
      totalChange,
      biggestGain,
      biggestLoss,
      averagePerformance,
      averageEloChange,
      positiveGames,
      negativeGames
    };
  }, [eloHistory]);

  // Calculate ELO change distribution
  const eloChangeDistribution = useMemo(() => {
    if (!eloHistory || eloHistory.length === 0) return [];

    const ranges: Record<string, number> = {
      '-20+': 0,
      '-10 to -19': 0,
      '-1 to -9': 0,
      '0': 0,
      '+1 to +9': 0,
      '+10 to +19': 0,
      '+20 to +29': 0,
      '+30+': 0
    };

    eloHistory.forEach(game => {
      const change = game.eloChange;
      if (change <= -20) ranges['-20+']++;
      else if (change >= -19 && change <= -10) ranges['-10 to -19']++;
      else if (change >= -9 && change <= -1) ranges['-1 to -9']++;
      else if (change === 0) ranges['0']++;
      else if (change >= 1 && change <= 9) ranges['+1 to +9']++;
      else if (change >= 10 && change <= 19) ranges['+10 to +19']++;
      else if (change >= 20 && change <= 29) ranges['+20 to +29']++;
      else if (change >= 30) ranges['+30+']++;
    });

    return Object.entries(ranges).map(([range, count]) => ({
      range,
      count,
      fill: range.startsWith('+') ? 'rgb(var(--win))' : range.startsWith('-') ? 'rgb(var(--loss))' : 'rgb(var(--fg-subtle))'
    }));
  }, [eloHistory]);

  // Tournament performance summary
  const tournamentPerformance = useMemo(() => {
    if (!eloHistory || eloHistory.length === 0) return [];

    interface TournamentSummary {
      name: string;
      totalChange: number;
      games: number;
      startElo: number;
      endElo: number;
    }

    const tournaments: Record<string, TournamentSummary> = {};
    eloHistory.forEach(game => {
      if (!tournaments[game.tournament]) {
        tournaments[game.tournament] = {
          name: game.tournament,
          totalChange: 0,
          games: 0,
          startElo: game.eloBefore,
          endElo: game.elo
        };
      }
      tournaments[game.tournament].totalChange += game.eloChange;
      tournaments[game.tournament].games++;
      tournaments[game.tournament].endElo = game.elo;
    });

    return Object.values(tournaments).map(t => ({
      ...t,
      avgChange: (t.totalChange / t.games).toFixed(1)
    }));
  }, [eloHistory]);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-surface border border-hairline rounded-lg">
        <div className="relative px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-surface-2 rounded-xl">
              <ChartBarIcon className="w-8 h-8 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-fg">ELO Progress</h2>
              <p className="text-fg-muted">Track your rating journey and performance</p>
            </div>
          </div>

          {/* Current ELO Display */}
          <div className="mt-6">
            <p className="text-fg-muted text-sm font-medium mb-2">Current Rating</p>
            <div className="flex items-baseline gap-3">
              <span className="text-6xl font-bold text-fg tabular-nums">{stats.currentElo}</span>
              <span className={`text-2xl font-semibold tabular-nums ${stats.totalChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {stats.totalChange >= 0 ? '+' : ''}{stats.totalChange}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {/* Highest Rating */}
        <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline transition-all duration-300">
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-surface-2 rounded-lg">
                <TrophyIcon className="w-5 h-5 text-draw" />
              </div>
            </div>
            <p className="text-xs font-medium text-fg-muted mb-1 uppercase tracking-wide">Peak Rating</p>
            <p className="text-2xl font-bold text-fg tabular-nums">{stats.highestElo}</p>
          </div>
        </div>

        {/* Biggest Gain */}
        <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline transition-all duration-300">
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-surface-2 rounded-lg">
                <ArrowTrendingUpIcon className="w-5 h-5 text-win" />
              </div>
            </div>
            <p className="text-xs font-medium text-fg-muted mb-1 uppercase tracking-wide">Best Game</p>
            <p className="text-2xl font-bold text-win tabular-nums">+{stats.biggestGain}</p>
          </div>
        </div>

        {/* Biggest Loss */}
        <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline transition-all duration-300">
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-surface-2 rounded-lg">
                <ArrowTrendingDownIcon className="w-5 h-5 text-loss" />
              </div>
            </div>
            <p className="text-xs font-medium text-fg-muted mb-1 uppercase tracking-wide">Worst Game</p>
            <p className="text-2xl font-bold text-loss tabular-nums">{stats.biggestLoss}</p>
          </div>
        </div>

        {/* Average ELO Change */}
        <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline transition-all duration-300">
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-surface-2 rounded-lg">
                <BoltIcon className="w-5 h-5 text-accent" />
              </div>
            </div>
            <p className="text-xs font-medium text-fg-muted mb-1 uppercase tracking-wide">Avg Change</p>
            <p className={`text-2xl font-bold tabular-nums ${stats.averageEloChange >= 0 ? 'text-win' : 'text-loss'}`}>
              {stats.averageEloChange >= 0 ? '+' : ''}{stats.averageEloChange.toFixed(1)}
            </p>
          </div>
        </div>

        {/* Positive Games */}
        <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline transition-all duration-300">
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-surface-2 rounded-lg">
                <FireIcon className="w-5 h-5 text-win" />
              </div>
            </div>
            <p className="text-xs font-medium text-fg-muted mb-1 uppercase tracking-wide">Rating Gains</p>
            <p className="text-2xl font-bold text-win tabular-nums">{stats.positiveGames}</p>
          </div>
        </div>

        {/* Negative Games */}
        <div className="relative overflow-hidden bg-surface rounded-lg border border-hairline transition-all duration-300">
          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-surface-2 rounded-lg">
                <ChartBarIcon className="w-5 h-5 text-loss" />
              </div>
            </div>
            <p className="text-xs font-medium text-fg-muted mb-1 uppercase tracking-wide">Rating Drops</p>
            <p className="text-2xl font-bold text-loss tabular-nums">{stats.negativeGames}</p>
          </div>
        </div>
      </div>

      {/* ELO Progression Chart */}
      <div className="relative overflow-hidden bg-surface border border-hairline rounded-lg">
        <div className="p-8">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-fg mb-2">
              Rating Progression
            </h3>
            <p className="text-fg-muted">Complete journey from 1651 to {stats.currentElo} • {eloHistory.length} rated games</p>
          </div>
          <ResponsiveContainer width="100%" height={getChartHeight('large')}>
            <ComposedChart data={eloHistory}>
              <defs>
                <linearGradient id="eloAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgb(var(--accent))" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="rgb(var(--accent))" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" strokeOpacity={0.5} />
              <XAxis
                dataKey="game"
                label={{ value: 'Game Number', position: 'insideBottom', offset: -8, style: { fontSize: 14, fontWeight: 600 } }}
                stroke="rgb(var(--fg-subtle))"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                domain={[1400, 1950]}
                label={{ value: 'ELO Rating', angle: -90, position: 'insideLeft', style: { fontSize: 14, fontWeight: 600 } }}
                stroke="rgb(var(--fg-subtle))"
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const changeColor = data.eloChange > 0 ? 'text-win' : data.eloChange < 0 ? 'text-loss' : 'text-fg-muted';
                    const changeBg = data.eloChange > 0 ? 'bg-win/10' : data.eloChange < 0 ? 'bg-loss/10' : 'bg-surface-2';
                    return (
                      <div className="p-5 bg-surface border border-hairline rounded-lg shadow-lg">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xl font-bold text-fg">Game {data.game}</p>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${changeBg} ${changeColor}`}>
                            {data.eloChange > 0 ? '+' : ''}{data.eloChange}
                          </span>
                        </div>
                        <p className="text-sm text-accent font-semibold mb-1">{data.tournament}</p>
                        <p className="text-sm text-fg-muted font-medium mb-1">vs {data.opponent}</p>
                        <p className="text-xs text-fg-subtle mb-3">{data.opening}</p>
                        <div className="pt-3 border-t-2 border-hairline space-y-2">
                          <div className="flex justify-between gap-8">
                            <span className="text-sm text-fg-muted font-medium">Before:</span>
                            <span className="text-sm font-bold text-fg">{data.eloBefore}</span>
                          </div>
                          <div className="flex justify-between gap-8">
                            <span className="text-sm text-fg-muted font-medium">After:</span>
                            <span className="text-sm font-bold text-accent">{data.elo}</span>
                          </div>
                          <div className="flex justify-between gap-8">
                            <span className="text-sm text-fg-muted font-medium">K-factor:</span>
                            <span className="text-sm font-semibold text-accent">{data.kFactor}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Area
                type="monotone"
                dataKey="elo"
                fill="url(#eloAreaGradient)"
                stroke="none"
              />
              <Line
                type="monotone"
                dataKey="elo"
                stroke="rgb(var(--accent))"
                strokeWidth={3}
                name="ELO Rating"
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  const dotColor = payload.eloChange > 0 ? 'rgb(var(--win))' : payload.eloChange < 0 ? 'rgb(var(--loss))' : 'rgb(var(--fg-subtle))';
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill={dotColor}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  );
                }}
                activeDot={{ r: 8, fill: 'rgb(var(--accent))', stroke: '#fff', strokeWidth: 3 }}
              />
              <ReferenceLine y={stats.highestElo} stroke="rgb(var(--draw))" strokeDasharray="5 5" label={{ value: `Peak: ${stats.highestElo}`, position: 'right', fill: 'rgb(var(--draw))', fontSize: 12, fontWeight: 'bold' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="relative overflow-hidden bg-surface border border-hairline rounded-lg">
        <div className="p-8">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-fg mb-2">Expected vs Actual Performance</h3>
            <p className="text-fg-muted">Compare your actual results with statistical expectations</p>
          </div>
          <ResponsiveContainer width="100%" height={getChartHeight('medium')}>
            <BarChart data={eloHistory}>
              <defs>
                <linearGradient id="expectedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgb(var(--fg-subtle))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="rgb(var(--fg-subtle))" stopOpacity={0.3}/>
                </linearGradient>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgb(var(--accent))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="rgb(var(--accent))" stopOpacity={0.3}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
              <XAxis
                dataKey="game"
                label={{ value: 'Game Number', position: 'insideBottom', offset: -5 }}
                stroke="rgb(var(--fg-subtle))"
              />
              <YAxis
                domain={[0, 1]}
                label={{ value: 'Score', angle: -90, position: 'insideLeft' }}
                stroke="rgb(var(--fg-subtle))"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const diffColor = data.diff > 0 ? 'text-win' : 'text-loss';
                    return (
                      <div className="p-4 bg-surface border border-hairline rounded-lg shadow-lg">
                        <p className="font-bold text-fg text-lg mb-2">Game {data.game}</p>
                        <p className="text-sm text-fg-muted mb-3">{data.opening}</p>
                        <div className="space-y-1 mb-2">
                          <div className="flex justify-between gap-4">
                            <span className="text-sm text-fg-muted">Expected:</span>
                            <span className="text-sm font-semibold text-fg-muted">{data.expected.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-sm text-fg-muted">Actual:</span>
                            <span className="text-sm font-semibold text-accent">{data.actual.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-hairline">
                          <div className="flex justify-between gap-4">
                            <span className="text-sm text-fg-muted">Difference:</span>
                            <span className={`text-sm font-bold ${diffColor}`}>
                              {data.diff > 0 ? '+' : ''}{data.diff.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar dataKey="expected" fill="url(#expectedGradient)" name="Expected Score" radius={[8, 8, 0, 0]} />
              <Bar dataKey="actual" fill="url(#actualGradient)" name="Actual Score" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two column layout for new charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ELO Change Distribution */}
        <div className="relative overflow-hidden bg-surface border border-hairline rounded-lg">
          <div className="p-8">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-fg mb-2">Rating Change Distribution</h3>
              <p className="text-fg-muted">How your rating changes are distributed across games</p>
            </div>
            <ResponsiveContainer width="100%" height={getChartHeight('regular')}>
              <BarChart data={eloChangeDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                <XAxis
                  dataKey="range"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 11 }}
                  stroke="rgb(var(--fg-subtle))"
                />
                <YAxis
                  label={{ value: 'Games', angle: -90, position: 'insideLeft' }}
                  stroke="rgb(var(--fg-subtle))"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-4 bg-surface border border-hairline rounded-lg shadow-lg">
                          <p className="font-bold text-fg text-lg mb-2">{data.range}</p>
                          <p className="text-sm text-fg-muted">Games: <span className="font-bold text-accent">{data.count}</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {eloChangeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tournament Performance Comparison */}
        <div className="relative overflow-hidden bg-surface border border-hairline rounded-lg">
          <div className="p-8">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-fg mb-2">Tournament Performance</h3>
              <p className="text-fg-muted">Rating change by tournament</p>
            </div>
            <ResponsiveContainer width="100%" height={getChartHeight('regular')}>
              <BarChart data={tournamentPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                <XAxis
                  type="number"
                  label={{ value: 'Total ELO Change', position: 'insideBottom', offset: -5 }}
                  stroke="rgb(var(--fg-subtle))"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  tick={{ fontSize: 10 }}
                  stroke="rgb(var(--fg-subtle))"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-4 bg-surface border border-hairline rounded-lg shadow-lg">
                          <p className="font-bold text-fg text-base mb-2">{data.name}</p>
                          <div className="space-y-1">
                            <p className="text-sm text-fg-muted">Games: <span className="font-semibold text-fg">{data.games}</span></p>
                            <p className="text-sm text-fg-muted">Total Change: <span className={`font-bold ${data.totalChange >= 0 ? 'text-win' : 'text-loss'}`}>{data.totalChange >= 0 ? '+' : ''}{data.totalChange}</span></p>
                            <p className="text-sm text-fg-muted">Avg/Game: <span className="font-semibold text-accent">{data.avgChange}</span></p>
                            <div className="pt-2 border-t border-hairline mt-2">
                              <p className="text-xs text-fg-subtle">Start: {data.startElo} → End: {data.endElo}</p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="totalChange" radius={[0, 8, 8, 0]}>
                  {tournamentPerformance.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.totalChange >= 0 ? 'rgb(var(--win))' : 'rgb(var(--loss))'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RatingTab;
