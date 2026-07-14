import { useState } from 'react';
import type { ComponentType } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';
import ResultsDonut from '../../charts/ResultsDonut';
import { useCountUp } from '../../../hooks/useCountUp';
import { useGameForm } from '../../../hooks/useGameForm';
import { useModal } from '../../modals/ModalContext';
import StatCard, { Sparkline } from '../StatCard';
import { Card, CardHeader } from '../../ui/Card';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import { PieceGlyph } from '../../ui/PieceGlyph';
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
      tournament: t.name.length > 15 ? t.name.substring(0, 15) + '…' : t.name,
      fullTournament: t.name,
      elo: t.eloBefore || playerInfo.current_elo,
      performanceRating: t.performanceRating
    })) : [];

  const eloSpark = ratedGames.map(g => g.elo).filter(e => e > 0);
  const eloUp = playerInfo.elo_change_last_tournament > 0;

  // Extract numeric score from whiteStats and blackStats
  const whiteScore = whiteStats.score || '0/0';
  const blackScore = blackStats.score || '0/0';
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero: current ELO */}
      <Card className="p-8">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div>
            <p className="text-label">Current ELO</p>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-6xl font-semibold tracking-tight tabular-nums text-fg">{animatedElo}</span>
              <Badge tone={eloUp ? 'win' : 'loss'}>
                {eloUp ? <ArrowTrendingUpIcon className="w-3.5 h-3.5" /> : <ArrowTrendingDownIcon className="w-3.5 h-3.5" />}
                {eloUp ? '+' : ''}{playerInfo.elo_change_last_tournament} last tournament
              </Badge>
            </div>
          </div>
          {eloSpark.length > 1 && (
            <div className="w-full sm:w-56">
              <p className="text-label mb-1">Last {eloSpark.length} rated games</p>
              <Sparkline data={eloSpark} />
            </div>
          )}
        </div>
      </Card>

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
        <Card>
          <CardHeader title="Results Distribution" className="mb-4" />
          <ResultsDonut wins={overallStats.wins} draws={overallStats.draws} losses={overallStats.losses} />
        </Card>

        {/* Performance by Color */}
        <Card>
          <CardHeader title="Performance by Color" className="mb-5" />
          <div className="space-y-4">
            {[
              { label: 'White Pieces', color: 'W' as const, stats: whiteStats, score: whiteScore },
              { label: 'Black Pieces', color: 'B' as const, stats: blackStats, score: blackScore },
            ].map(({ label, color, stats, score }) => {
              const total = stats.wins + stats.draws + stats.losses || 1;
              const winPct = (stats.wins / total) * 100;
              const drawPct = (stats.draws / total) * 100;
              const lossPct = (stats.losses / total) * 100;
              const rate = parseFloat(stats.winRate) || 0;
              return (
                <div key={label} className="p-4 bg-surface-2 rounded-lg border border-hairline">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <PieceGlyph color={color} size={10} />
                      <span className="text-label">{label}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold text-fg tabular-nums">{score}</span>
                      <Badge tone={rate >= 50 ? 'win' : 'loss'}>{stats.winRate}%</Badge>
                    </div>
                  </div>
                  <div className="flex w-full h-2 rounded-full overflow-hidden bg-surface">
                    <div className="h-full bg-win transition-all duration-1000" style={{ width: `${winPct}%` }} />
                    <div className="h-full bg-draw transition-all duration-1000" style={{ width: `${drawPct}%` }} />
                    <div className="h-full bg-loss transition-all duration-1000" style={{ width: `${lossPct}%` }} />
                  </div>
                  <div className="flex items-center gap-4 mt-2.5 text-xs font-medium text-fg-subtle">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-win" />{stats.wins}W</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-draw" />{stats.draws}D</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-loss" />{stats.losses}L</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ELO Progress */}
      <Card>
        <CardHeader title="ELO Progress Timeline" subtitle="Rating vs. performance across tournaments" className="mb-6" />
        {eloTimeline.length > 0 ? (
          <ResponsiveContainer width="100%" height={getChartHeight('mini')}>
            <LineChart data={eloTimeline} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
              <XAxis dataKey="tournament" angle={-25} textAnchor="end" height={62} stroke="rgb(var(--fg-subtle))" tick={{ fontSize: 11, fill: 'rgb(var(--fg-subtle))' }} axisLine={{ stroke: 'rgb(var(--border))' }} tickLine={false} />
              <YAxis domain={['auto', 'auto']} stroke="rgb(var(--fg-subtle))" tick={{ fontSize: 12, fill: 'rgb(var(--fg-subtle))' }} axisLine={false} tickLine={false} width={48} />
              <Tooltip
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTournament ?? ''}
                contentStyle={{
                  backgroundColor: 'rgb(var(--surface))',
                  borderRadius: '12px',
                  border: '1px solid rgb(var(--border))',
                  color: 'rgb(var(--fg))',
                  fontSize: '13px',
                }}
                labelStyle={{ color: 'rgb(var(--fg-muted))', fontWeight: 600, marginBottom: 4 }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '12px', color: 'rgb(var(--fg-muted))', paddingTop: '12px' }}
              />
              <Line type="monotone" dataKey="elo" stroke="rgb(var(--accent))" strokeWidth={2.5} name="ELO Rating" dot={{ r: 4, strokeWidth: 0, fill: 'rgb(var(--accent))' }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="performanceRating" stroke="rgb(var(--draw))" strokeWidth={2} name="Performance" dot={{ r: 3, strokeWidth: 0, fill: 'rgb(var(--draw))' }} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-fg-muted">
            <p>No tournament data available</p>
          </div>
        )}
      </Card>

      {/* Best and Worst Results */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Best Results */}
        <Card>
          <CardHeader title="Top 3 Wins" subtitle="Biggest upsets — wins vs. higher-rated opponents" className="mb-4" />
          <div className="space-y-3">
            {bestResults && bestResults.length > 0 ? (
              bestResults.map((result, idx) => (
                <div key={idx} className="p-4 border border-win/20 rounded-lg bg-win/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-fg">{result.opponent}</span>
                    <Badge tone="win">+{result.diff} ELO</Badge>
                  </div>
                  <div className="text-sm text-fg-muted">
                    <div className="flex justify-between tabular-nums">
                      <span>Your ELO: {result.elo}</span>
                      <span>Opp ELO: {result.oppElo}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <PieceGlyph color={result.color === 'W' ? 'W' : 'B'} size={10} />
                      <span className="font-medium text-fg">{result.opening}</span>
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
        </Card>

        {/* Worst Results */}
        <Card>
          <CardHeader title="Top 3 Losses to Study" subtitle="Losses vs. lower-rated opponents — learning spots" className="mb-4" />
          <div className="space-y-3">
            {worstResults && worstResults.length > 0 ? (
              worstResults.map((result, idx) => (
                <div key={idx} className="p-4 border border-loss/20 rounded-lg bg-loss/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-fg">{result.opponent}</span>
                    <Badge tone="loss">{result.diff > 0 ? `+${result.diff}` : result.diff} ELO</Badge>
                  </div>
                  <div className="text-sm text-fg-muted">
                    <div className="flex justify-between tabular-nums">
                      <span>Your ELO: {result.elo}</span>
                      <span>Opp ELO: {result.oppElo}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <PieceGlyph color={result.color === 'W' ? 'W' : 'B'} size={10} />
                      <span className="font-medium text-fg">{result.opening}</span>
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
        </Card>
      </div>

      {/* Additional Stats Summary */}
      <Card>
        <CardHeader title="Quick Stats Summary" className="mb-4" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="p-4 text-center bg-surface-2 rounded-lg">
            <div className="text-2xl font-semibold text-fg tabular-nums">{overallStats.wins}</div>
            <div className="text-sm text-fg-muted">Total Wins</div>
          </div>
          <div className="p-4 text-center bg-surface-2 rounded-lg">
            <div className="text-2xl font-semibold text-fg tabular-nums">{overallStats.draws}</div>
            <div className="text-sm text-fg-muted">Total Draws</div>
          </div>
          <div className="p-4 text-center bg-surface-2 rounded-lg">
            <div className="text-2xl font-semibold text-fg tabular-nums">{overallStats.losses}</div>
            <div className="text-sm text-fg-muted">Total Losses</div>
          </div>
          <div className="p-4 text-center bg-surface-2 rounded-lg">
            <div className="text-2xl font-semibold text-fg tabular-nums">
              {overallStats.total > 0 ? ((parseFloat(overallStats.actualScore) / overallStats.total) * 100).toFixed(0) : '0'}%
            </div>
            <div className="text-sm text-fg-muted">Score Rate</div>
          </div>
        </div>
      </Card>

      {/* Add / Import Games */}
      <Card flush>
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
                      <Button variant="danger" onClick={onRemoveLichessGames}>
                        Remove All Lichess Games
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default OverviewTab;
