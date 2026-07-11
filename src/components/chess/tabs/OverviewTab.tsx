import { useState } from 'react';
import type { ComponentType } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';
import ResultsDonut from '../../charts/ResultsDonut';
import { useCountUp } from '../../../hooks/useCountUp';
import { useGameForm } from '../../../hooks/useGameForm';
import { useModal } from '../../modals/ModalContext';
import StatCard, { Sparkline } from '../StatCard';
import ManualGameEntry from './analytics/ManualGameEntry';
import PgnImport from './analytics/PgnImport';
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
  Swords: ComponentType<{ className?: string }>;
  Target: ComponentType<{ className?: string }>;
  TrendingUp: ComponentType<{ className?: string }>;
  games: Game[];
  addManualGame: (game: Game) => Promise<void>;
  showPgnImport: boolean;
  setShowPgnImport: React.Dispatch<React.SetStateAction<boolean>>;
  pgnText: string;
  setPgnText: React.Dispatch<React.SetStateAction<string>>;
  handlePgnImport: () => void;
  LichessSyncPanel: ComponentType<Record<string, unknown>>;
  onLichessSync: (games: Game[]) => void;
  onRemoveLichessGames: () => void;
  lichessGamesCount: number;
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
  Swords,
  Target,
  TrendingUp,
  games,
  addManualGame,
  showPgnImport,
  setShowPgnImport,
  pgnText,
  setPgnText,
  handlePgnImport,
  LichessSyncPanel,
  onLichessSync,
  onRemoveLichessGames,
  lichessGamesCount
}: OverviewTabProps) => {
  const animatedElo = useCountUp(playerInfo.current_elo);
  const modal = useModal();
  const [showAddGames, setShowAddGames] = useState(false);
  const {
    showManualEntry,
    setShowManualEntry,
    gameForm,
    uniqueTournaments,
    handleInputChange,
    handleAddGame,
    resetForm,
  } = useGameForm(games, addManualGame, modal);

  const handleAddGameWithMessage = async () => {
    if (await handleAddGame()) {
      await modal.alert('Game added successfully!');
    }
  };

  // Generate ELO progress timeline from tournament stats (use starting ELO for each tournament)
  const eloTimeline = tournamentStats && tournamentStats.length > 0 ?
    tournamentStats.map((t) => ({
      tournament: t.name.length > 15 ? t.name.substring(0, 15) + '...' : t.name,
      elo: t.eloBefore || playerInfo.current_elo,
      performanceRating: t.performanceRating
    })) : [];

  const eloSpark = ratedGames.map(g => g.elo).filter(e => e > 0);
  const eloUp = playerInfo.elo_change_last_tournament > 0;

  // Extract numeric score from whiteStats and blackStats
  const whiteScore = whiteStats.score || '0/0';
  const blackScore = blackStats.score || '0/0';
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero: current ELO */}
      <div className="rounded-lg border border-hairline bg-surface p-8">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Current ELO</p>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-6xl font-bold tracking-tight tabular-nums text-fg">{animatedElo}</span>
              <span className={`inline-flex items-center gap-1 text-sm font-semibold ${eloUp ? 'text-win' : 'text-loss'}`}>
                {eloUp ? <ArrowTrendingUpIcon className="w-4 h-4" /> : <ArrowTrendingDownIcon className="w-4 h-4" />}
                {eloUp ? '+' : ''}{playerInfo.elo_change_last_tournament} last tournament
              </span>
            </div>
          </div>
          {eloSpark.length > 1 && (
            <div className="w-full sm:w-56">
              <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle mb-1">Last {eloSpark.length} rated games</p>
              <Sparkline data={eloSpark} />
            </div>
          )}
        </div>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <div className="stagger-item">
          <StatCard
            title="Total Games"
            value={overallStats.total}
            subtitle={`Win rate: ${overallStats.winRate}%`}
            icon={Swords}
          />
        </div>
        <div className="stagger-item">
          <StatCard
            title="Performance Rating"
            value={overallStats.performanceRating}
            subtitle={`Score: ${overallStats.actualScore}/${overallStats.total}`}
            icon={Target}
            trend={overallStats.performanceRating > playerInfo.current_elo ? 'up' : 'down'}
          />
        </div>
        <div className="stagger-item">
          <StatCard
            title="Expected vs Actual"
            value={overallStats.actualScore}
            subtitle={`Expected: ${overallStats.expectedScore}`}
            icon={TrendingUp}
            trend={parseFloat(overallStats.actualScore) > parseFloat(overallStats.expectedScore) ? 'up' : 'down'}
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Results Distribution */}
        <div className="bg-surface rounded-lg border border-hairline p-6 card-hover">
          <h3 className="mb-4 text-base font-semibold text-fg">Results Distribution</h3>
          <ResultsDonut wins={overallStats.wins} draws={overallStats.draws} losses={overallStats.losses} />
        </div>

        {/* Performance by Color */}
        <div className="bg-surface rounded-lg border border-hairline p-6 card-hover">
          <h3 className="text-base font-semibold text-fg mb-6">Performance by Color</h3>
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
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums">{whiteStats.winRate}% win rate</p>
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

      {/* ELO Progress */}
      <div className="bg-surface rounded-lg border border-hairline p-6 card-hover">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-surface-2 rounded-lg">
            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-fg">ELO Progress Timeline</h3>
        </div>
        {eloTimeline.length > 0 ? (
          <ResponsiveContainer width="100%" height={getChartHeight('mini')}>
            <LineChart data={eloTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
              <XAxis dataKey="tournament" angle={-15} textAnchor="end" height={70} stroke="rgb(var(--fg-subtle))" tick={{ fontSize: 11 }} />
              <YAxis domain={['auto', 'auto']} stroke="rgb(var(--fg-subtle))" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgb(var(--surface))',
                  borderRadius: '12px',
                  border: '1px solid rgb(var(--border))',
                  color: 'rgb(var(--fg))',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="elo" stroke="rgb(var(--accent))" strokeWidth={3} name="ELO Rating" dot={{ r: 5, fill: 'rgb(var(--accent))' }} activeDot={{ r: 7 }} />
              <Line type="monotone" dataKey="performanceRating" stroke="rgb(var(--win))" strokeWidth={2} name="Performance" dot={{ r: 4, fill: 'rgb(var(--win))' }} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-fg-muted">
            <p>No tournament data available</p>
          </div>
        )}
      </div>

      {/* Best and Worst Results */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Best Results */}
        <div className="p-6 bg-surface rounded-lg border border-hairline stagger-item">
          <h3 className="mb-4 text-lg font-semibold text-win">🏆 Top 3 Wins</h3>
          <p className="mb-4 text-sm text-fg-muted">Biggest upsets - victories against higher-rated opponents</p>
          <div className="space-y-3">
            {bestResults && bestResults.length > 0 ? (
              bestResults.map((result, idx) => (
                <div key={idx} className="p-4 border border-win/20 rounded-lg bg-win/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-fg">{result.opponent}</span>
                    <span className="px-2 py-1 text-xs font-bold text-win bg-win/20 rounded tabular-nums">
                      +{result.diff} ELO
                    </span>
                  </div>
                  <div className="text-sm text-fg-muted">
                    <div className="flex justify-between tabular-nums">
                      <span>Your ELO: {result.elo}</span>
                      <span>Opp ELO: {result.oppElo}</span>
                    </div>
                    <div className="mt-1">
                      <span className="font-medium">{result.color === 'W' ? '⚪' : '⚫'} {result.opening}</span>
                    </div>
                    <div className="mt-1 text-xs text-fg-subtle">
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
        <div className="p-6 bg-surface rounded-lg border border-hairline stagger-item">
          <h3 className="mb-4 text-lg font-semibold text-loss">⚠️ Top 3 Losses to Study</h3>
          <p className="mb-4 text-sm text-fg-muted">Losses against lower-rated opponents - learning opportunities</p>
          <div className="space-y-3">
            {worstResults && worstResults.length > 0 ? (
              worstResults.map((result, idx) => (
                <div key={idx} className="p-4 border border-loss/20 rounded-lg bg-loss/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-fg">{result.opponent}</span>
                    <span className="px-2 py-1 text-xs font-bold text-loss bg-loss/20 rounded tabular-nums">
                      {result.diff > 0 ? `+${result.diff}` : result.diff} ELO
                    </span>
                  </div>
                  <div className="text-sm text-fg-muted">
                    <div className="flex justify-between tabular-nums">
                      <span>Your ELO: {result.elo}</span>
                      <span>Opp ELO: {result.oppElo}</span>
                    </div>
                    <div className="mt-1">
                      <span className="font-medium">{result.color === 'W' ? '⚪' : '⚫'} {result.opening}</span>
                    </div>
                    <div className="mt-1 text-xs text-fg-subtle">
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

      {/* Add / Import Games */}
      <div className="rounded-lg border border-hairline bg-surface">
        <button
          onClick={() => setShowAddGames(prev => !prev)}
          className="flex w-full items-center justify-between p-6 text-left"
        >
          <div>
            <h3 className="text-lg font-semibold text-fg">Add / Import Games</h3>
            <p className="mt-1 text-sm text-fg-muted">Manual entry, PGN import, or sync from Lichess</p>
          </div>
          {showAddGames ? <ChevronUpIcon className="w-5 h-5 text-fg-muted" /> : <ChevronDownIcon className="w-5 h-5 text-fg-muted" />}
        </button>
        {showAddGames && (
          <div className="space-y-4 px-6 pb-6">
            <ManualGameEntry
              showManualEntry={showManualEntry}
              setShowManualEntry={setShowManualEntry}
              gameForm={gameForm}
              uniqueTournaments={uniqueTournaments}
              handleInputChange={handleInputChange}
              handleAddGame={handleAddGameWithMessage}
              resetForm={resetForm}
            />

            <PgnImport
              showPgnImport={showPgnImport}
              setShowPgnImport={setShowPgnImport}
              pgnText={pgnText}
              setPgnText={setPgnText}
              handlePgnImport={handlePgnImport}
            />

            {LichessSyncPanel && (
              <div className="space-y-4">
                <LichessSyncPanel onSyncComplete={onLichessSync} />

                {lichessGamesCount > 0 && (
                  <div className="p-4 border border-hairline rounded-lg bg-surface-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-fg">Remove Imported Games</h4>
                        <p className="text-xs text-fg-muted mt-1">
                          You have {lichessGamesCount} Lichess game{lichessGamesCount !== 1 ? 's' : ''} imported
                        </p>
                      </div>
                      <button
                        onClick={onRemoveLichessGames}
                        className="px-4 py-2 text-sm font-medium text-loss border border-hairline bg-surface hover:bg-surface-2 rounded-lg transition-colors"
                      >
                        Remove All Lichess Games
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OverviewTab;
