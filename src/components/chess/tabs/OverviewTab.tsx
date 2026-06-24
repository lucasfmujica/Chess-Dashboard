import type { ComponentType } from 'react';
import { CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import GeoMap from '../../charts/GeoMap';
import { useGames } from '../../../context/GamesContext';
import { useGeographyStats } from '../../../hooks/useGeographyStats';
import StatCard from '../StatCard';
import { getChartHeight } from '../../../utils/chartUtils';
import type { Game, GameStats, PlayerInfo, TournamentStat } from '../../../types/chess';

/** Per-opening aggregate row attached to colored game stats. */
interface ColorOpeningStat {
  eco: string;
  name: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  score: string;
  winRate: string;
}

type ColorStats = GameStats & { openings: ColorOpeningStat[] };

/** A notable (best/worst) result row. */
interface ResultEntry {
  opponent: string;
  elo: number;
  oppElo: number;
  diff: number;
  eco: string;
  opening: string;
  color: string;
  tournament: string;
}

interface OverviewTabProps {
  playerInfo: PlayerInfo;
  overallStats: GameStats;
  whiteStats: ColorStats;
  blackStats: ColorStats;
  ratedGames: Game[];
  eloHistory: unknown[];
  tournamentStats: TournamentStat[];
  bestResults: ResultEntry[];
  worstResults: ResultEntry[];
  Trophy: ComponentType<{ className?: string }>;
  Swords: ComponentType<{ className?: string }>;
  Target: ComponentType<{ className?: string }>;
  TrendingUp: ComponentType<{ className?: string }>;
}

const OverviewTab = ({
  playerInfo,
  overallStats,
  whiteStats,
  blackStats,
  ratedGames,
  tournamentStats,
  bestResults,
  worstResults,
  Trophy,
  Swords,
  Target,
  TrendingUp
}: OverviewTabProps) => {
  const { tournamentLocations } = useGames();
  const geo = useGeographyStats(ratedGames, tournamentLocations);

  // Generate ELO progress timeline from tournament stats (use starting ELO for each tournament)
  const eloTimeline = tournamentStats && tournamentStats.length > 0 ?
    tournamentStats.map((t) => ({
      tournament: t.name.length > 15 ? t.name.substring(0, 15) + '...' : t.name,
      elo: t.eloBefore || playerInfo.current_elo,
      performanceRating: t.performanceRating
    })) : [];

  // Extract numeric score from whiteStats and blackStats
  const whiteScore = whiteStats.score || '0/0';
  const blackScore = blackStats.score || '0/0';
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Current ELO"
          value={playerInfo.current_elo}
          subtitle={`${playerInfo.elo_change_last_tournament > 0 ? '+' : ''}${playerInfo.elo_change_last_tournament} last tournament`}
          icon={Trophy}
          trend={playerInfo.elo_change_last_tournament > 0 ? 'up' : 'down'}
        />
        <StatCard
          title="Total Games"
          value={overallStats.total}
          subtitle={`Win rate: ${overallStats.winRate}%`}
          icon={Swords}
        />
        <StatCard
          title="Performance Rating"
          value={overallStats.performanceRating}
          subtitle={`Score: ${overallStats.actualScore}/${overallStats.total}`}
          icon={Target}
          trend={overallStats.performanceRating > playerInfo.current_elo ? 'up' : 'down'}
        />
        <StatCard
          title="Expected vs Actual"
          value={overallStats.actualScore}
          subtitle={`Expected: ${overallStats.expectedScore}`}
          icon={TrendingUp}
          trend={parseFloat(overallStats.actualScore) > parseFloat(overallStats.expectedScore) ? 'up' : 'down'}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Results Distribution */}
        <div className="bg-surface rounded-lg border border-hairline p-6 card-hover">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-fg">Results Distribution</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-fg-muted">Wins</span>
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span className="text-fg-muted">Draws</span>
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
                <span className="text-fg-muted">Losses</span>
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={getChartHeight('small')}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Wins', value: overallStats.wins },
                  { name: 'Draws', value: overallStats.draws },
                  { name: 'Losses', value: overallStats.losses }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => `${name}: ${value} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell fill="#10b981" />
                <Cell fill="#f59e0b" />
                <Cell fill="#ef4444" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Performance by Color */}
        <div className="bg-surface rounded-lg border border-hairline p-6 card-hover">
          <h3 className="text-xl font-bold text-fg mb-6">Performance by Color</h3>
          <div className="space-y-6">
            {/* White Pieces */}
            <div className="p-4 bg-surface-2 rounded-lg border border-hairline">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-surface rounded-lg">
                    <span className="text-2xl">⚪</span>
                  </div>
                  <span className="text-sm font-bold text-fg-muted uppercase tracking-wide">White Pieces</span>
                </div>
                <span className="text-lg font-bold text-fg tabular-nums">{whiteScore}</span>
              </div>
              <div className="w-full h-3 bg-surface-2 rounded-full overflow-hidden">
                <div
                  className="h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-1000"
                  style={{ width: `${whiteStats.winRate}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs font-semibold text-fg-muted tabular-nums">
                  {whiteStats.wins}W • {whiteStats.draws}D • {whiteStats.losses}L
                </p>
                <p className="text-sm font-bold text-blue-600 tabular-nums">{whiteStats.winRate}% win rate</p>
              </div>
            </div>

            {/* Black Pieces */}
            <div className="p-4 bg-surface-2 rounded-lg border border-hairline">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-surface rounded-lg">
                    <span className="text-2xl">⚫</span>
                  </div>
                  <span className="text-sm font-bold text-fg-muted uppercase tracking-wide">Black Pieces</span>
                </div>
                <span className="text-lg font-bold text-fg tabular-nums">{blackScore}</span>
              </div>
              <div className="w-full h-3 bg-surface-2 rounded-full overflow-hidden">
                <div
                  className="h-3 bg-gradient-to-r from-slate-600 to-slate-800 rounded-full transition-all duration-1000"
                  style={{ width: `${blackStats.winRate}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs font-semibold text-fg-muted tabular-nums">
                  {blackStats.wins}W • {blackStats.draws}D • {blackStats.losses}L
                </p>
                <p className="text-sm font-bold text-fg-muted tabular-nums">{blackStats.winRate}% win rate</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ELO Progress and Map */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-surface rounded-lg border border-hairline p-6 card-hover">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-surface-2 rounded-lg">
              <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-fg">ELO Progress Timeline</h3>
          </div>
          {eloTimeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={getChartHeight('mini')}>
              <LineChart data={eloTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="tournament" angle={-15} textAnchor="end" height={70} stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis domain={['auto', 'auto']} stroke="#64748b" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                <Legend />
                <Line type="monotone" dataKey="elo" stroke="#3b82f6" strokeWidth={3} name="ELO Rating" dot={{ r: 5, fill: '#3b82f6' }} activeDot={{ r: 7 }} />
                <Line type="monotone" dataKey="performanceRating" stroke="#10b981" strokeWidth={2} name="Performance" dot={{ r: 4, fill: '#10b981' }} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-fg-muted">
              <p>No tournament data available</p>
            </div>
          )}
        </div>

        <div className="bg-surface rounded-lg border border-hairline p-6 card-hover">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-surface-2 rounded-lg">
              <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-fg">Tournament Locations</h3>
          </div>
          <GeoMap markers={geo.byCity} />
        </div>
      </div>

      {/* Best and Worst Results */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Best Results */}
        <div className="p-6 bg-surface rounded-lg border border-hairline">
          <h3 className="mb-4 text-lg font-semibold text-emerald-700">🏆 Top 3 Wins</h3>
          <p className="mb-4 text-sm text-fg-muted">Biggest upsets - victories against higher-rated opponents</p>
          <div className="space-y-3">
            {bestResults && bestResults.length > 0 ? (
              bestResults.map((result, idx) => (
                <div key={idx} className="p-4 border border-emerald-200 rounded-lg bg-emerald-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-900">{result.opponent}</span>
                    <span className="px-2 py-1 text-xs font-bold text-emerald-700 bg-emerald-200 rounded tabular-nums">
                      +{result.diff} ELO
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">
                    <div className="flex justify-between tabular-nums">
                      <span>Your ELO: {result.elo}</span>
                      <span>Opp ELO: {result.oppElo}</span>
                    </div>
                    <div className="mt-1">
                      <span className="font-medium">{result.color === 'W' ? '⚪' : '⚫'} {result.opening}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {result.tournament}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-fg-muted">No wins recorded yet</p>
            )}
          </div>
        </div>

        {/* Worst Results */}
        <div className="p-6 bg-surface rounded-lg border border-hairline">
          <h3 className="mb-4 text-lg font-semibold text-rose-700">⚠️ Top 3 Losses to Study</h3>
          <p className="mb-4 text-sm text-fg-muted">Losses against lower-rated opponents - learning opportunities</p>
          <div className="space-y-3">
            {worstResults && worstResults.length > 0 ? (
              worstResults.map((result, idx) => (
                <div key={idx} className="p-4 border border-rose-200 rounded-lg bg-rose-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-900">{result.opponent}</span>
                    <span className="px-2 py-1 text-xs font-bold text-rose-700 bg-rose-200 rounded tabular-nums">
                      {result.diff > 0 ? `+${result.diff}` : result.diff} ELO
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">
                    <div className="flex justify-between tabular-nums">
                      <span>Your ELO: {result.elo}</span>
                      <span>Opp ELO: {result.oppElo}</span>
                    </div>
                    <div className="mt-1">
                      <span className="font-medium">{result.color === 'W' ? '⚪' : '⚫'} {result.opening}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {result.tournament}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-fg-muted">No losses recorded yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Additional Stats Summary */}
      <div className="p-6 bg-surface rounded-lg border border-hairline">
        <h3 className="mb-4 text-lg font-semibold text-fg">Quick Stats Summary</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="p-4 text-center bg-surface-2 rounded-lg">
            <div className="text-2xl font-bold text-fg tabular-nums">{overallStats.wins}</div>
            <div className="text-sm text-fg-muted">Total Wins</div>
          </div>
          <div className="p-4 text-center bg-surface-2 rounded-lg">
            <div className="text-2xl font-bold text-fg tabular-nums">{overallStats.draws}</div>
            <div className="text-sm text-fg-muted">Total Draws</div>
          </div>
          <div className="p-4 text-center bg-surface-2 rounded-lg">
            <div className="text-2xl font-bold text-fg tabular-nums">{overallStats.losses}</div>
            <div className="text-sm text-fg-muted">Total Losses</div>
          </div>
          <div className="p-4 text-center bg-surface-2 rounded-lg">
            <div className="text-2xl font-bold text-fg tabular-nums">
              {((parseFloat(overallStats.actualScore) / overallStats.total) * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-fg-muted">Score Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
