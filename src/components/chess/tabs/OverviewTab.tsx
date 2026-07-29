import { useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, ArrowRightIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';
import ResultsDonut from '../../charts/ResultsDonut';
import { useCountUp } from '../../../hooks/useCountUp';
import { useGameForm } from '../../../hooks/useGameForm';
import { useTrainingPulse, SPLIT_WINDOW_DAYS } from '../../../hooks/useTrainingPulse';
import { WEEKLY_QUEUE_TARGET } from '../../../constants/trainingProgram';
import { useModal } from '../../modals/ModalContext';
import StatCard, { Sparkline } from '../StatCard';
import TodayStrip from './TodayStrip';
import { Card, CardHeader } from '../../ui/Card';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import { PieceGlyph } from '../../ui/PieceGlyph';
import ManualGameEntry from './analytics/ManualGameEntry';
import PgnImport from './analytics/PgnImport';
import { getChartHeight } from '../../../utils/chartUtils';
import { dateFromKey } from '../../../utils/localDate';
import type { Game, GameStats, PlayerInfo, TournamentStat, StreaksSummary, Tournament } from '../../../types/chess';

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

/** Recent-form snapshot for a window of games (from useTrendsAndAnalytics.formStats). */
interface FormWindow {
  games: number;
  wins: number;
  draws: number;
  losses: number;
  score: string;
  percentage: string;
  /** Result letters, most-recent first. */
  results: string[];
}

/** Goal projection summary (subset of useGoalsAndAchievements.goalProjections). */
interface GoalProjection {
  currentElo: number;
  targetElo: number;
  eloGain: number;
  daysRemaining: number;
  onTrack: boolean;
  projectedElo: number;
}

interface OverviewTabProps {
  playerInfo: PlayerInfo;
  overallStats: GameStats;
  whiteStats: ColorStats;
  blackStats: ColorStats;
  eloHistory: { elo: number }[];
  tournamentStats: TournamentStat[];
  formStats: { last5: FormWindow; last10: FormWindow };
  streaks: StreaksSummary;
  upcomingTournaments: Tournament[];
  goalProjections: GoalProjection;
  onNavigate: (tab: string) => void;
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

/** A small "View all →" link rendered in a card header, jumping to a full tab. */
const TabLink = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:opacity-80 transition-opacity"
  >
    {label}
    <ArrowRightIcon className="w-3 h-3" />
  </button>
);

/** Compact at-a-glance signal tile used in the Overview signal row. */
const SignalCard = ({ label, onClick, children }: { label: string; onClick?: () => void; children: ReactNode }) => (
  <Card
    interactive={!!onClick}
    onClick={onClick}
    className={`flex flex-col gap-2 ${onClick ? 'cursor-pointer' : ''}`}
  >
    <p className="text-label">{label}</p>
    {children}
  </Card>
);

const STREAK_LABELS: Record<string, string> = {
  win: 'win streak',
  loss: 'loss streak',
  unbeaten: 'unbeaten',
};

const OverviewTab = ({
  playerInfo,
  overallStats,
  whiteStats,
  blackStats,
  eloHistory,
  tournamentStats,
  formStats,
  streaks,
  upcomingTournaments,
  goalProjections,
  onNavigate,
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
  const pulse = useTrainingPulse();
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

  // Per-game (not per-tournament) progression: `game.elo` is the same flat value
  // for every game within one OTB tournament, which plotted directly looks like a
  // staircase. `eloHistory[i].elo` recomputes a smooth incremental value per game.
  const eloSpark = eloHistory.slice(-45).map(h => h.elo).filter(e => e > 0);
  const eloUp = playerInfo.elo_change_last_tournament > 0;

  // Extract numeric score from whiteStats and blackStats
  const whiteScore = whiteStats.score || '0/0';
  const blackScore = blackStats.score || '0/0';

  // --- At-a-glance signals -------------------------------------------------
  const form = formStats.last5;
  const streak = streaks.current;
  const streakTone = streak.type === 'win' ? 'win' : streak.type === 'loss' ? 'loss' : 'draw';

  // Next upcoming tournament (soonest start date from today onward).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextTournament = [...upcomingTournaments]
    .flatMap(t => (t.startDate ? [{ t, start: dateFromKey(t.startDate) }] : []))
    .filter(({ start }) => !Number.isNaN(start.getTime()) && start.getTime() >= today.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
  const daysUntilNext = nextTournament
    ? Math.round((nextTournament.start.getTime() - today.getTime()) / 86_400_000)
    : null;

  const eloToGoal = goalProjections.eloGain;
  const goalReached = eloToGoal <= 0;

  const resultTileTone = (r: string) =>
    r === 'W' ? 'bg-win/15 text-win' : r === 'L' ? 'bg-loss/15 text-loss' : 'bg-draw/15 text-draw';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero: two outcome numbers, two process numbers, at the same weight.
          ELO and win rate say how it went; attempts and the candidate split
          say what was actually done about it. Showing only the first pair
          trains you to watch the number you don't control. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <p className="text-label">ELO actual</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-semibold tracking-tight tabular-nums text-fg">
              {animatedElo}
            </span>
            <Badge tone={eloUp ? 'win' : 'loss'}>
              {eloUp ? (
                <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
              ) : (
                <ArrowTrendingDownIcon className="w-3.5 h-3.5" />
              )}
              {eloUp ? '+' : ''}
              {playerInfo.elo_change_last_tournament}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-fg-muted">Último torneo</p>
          {eloSpark.length > 1 && <Sparkline data={eloSpark} />}
        </Card>

        <Card className="p-6">
          <p className="text-label">Win rate</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-4xl font-semibold tracking-tight tabular-nums text-fg">
              {overallStats.winRate}
            </span>
            <span className="text-xl font-medium text-fg-subtle">%</span>
          </div>
          <p className="mt-1 text-xs text-fg-muted tabular-nums">
            {overallStats.total} partidas · {overallStats.actualScore} pts
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-label">Intentos esta semana</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-semibold tracking-tight tabular-nums text-fg">
              {pulse.loading ? '—' : pulse.attemptsThisWeek}
            </span>
            <span className="text-sm text-fg-subtle tabular-nums">/ {WEEKLY_QUEUE_TARGET}</span>
          </div>
          {pulse.attemptsThisWeek === 0 && !pulse.loading ? (
            <p className="mt-1 text-xs text-fg-muted">
              {pulse.daysSinceLastSession === null
                ? 'Sin intentos registrados todavía. '
                : `Hace ${pulse.daysSinceLastSession} día${pulse.daysSinceLastSession === 1 ? '' : 's'} del último registro. `}
              <TabLink label="Entrenar" onClick={() => onNavigate('training')} />
            </p>
          ) : (
            <p className="mt-1 text-xs text-fg-muted">Meta semanal del programa</p>
          )}
        </Card>

        <Card className="p-6">
          <p className="text-label">Candidato perdido</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-4xl font-semibold tracking-tight tabular-nums text-fg">
              {pulse.loading || pulse.split.asked === 0 ? '—' : pulse.split.missedPct}
            </span>
            {!pulse.loading && pulse.split.asked > 0 && (
              <span className="text-xl font-medium text-fg-subtle">%</span>
            )}
          </div>
          {pulse.split.asked === 0 && !pulse.loading ? (
            <p className="mt-1 text-xs text-fg-muted">
              Sin fallos de cálculo registrados.{' '}
              <TabLink label="Entrenar" onClick={() => onNavigate('training')} />
            </p>
          ) : (
            <p className="mt-1 text-xs text-fg-muted tabular-nums">
              {pulse.split.missed} de {pulse.split.asked} fallos · {SPLIT_WINDOW_DAYS}d
            </p>
          )}
        </Card>
      </div>

      {/* What to do now. Sits above the retrospective signals on purpose:
          those describe the past, this is the only actionable row. */}
      <TodayStrip onNavigate={onNavigate} />

      {/* At-a-glance signals: what happened recently & what's next */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Recent form (last 5) */}
        <SignalCard label="Recent Form" onClick={() => onNavigate('streaks')}>
          {form.games > 0 ? (
            <>
              <div className="flex items-center gap-1.5">
                {form.results.map((r, i) => (
                  <span
                    key={i}
                    className={`flex h-6 w-6 items-center justify-center rounded text-xs font-semibold ${resultTileTone(r)}`}
                  >
                    {r}
                  </span>
                ))}
              </div>
              <p className="text-sm text-fg-muted tabular-nums">
                {form.score} · {form.percentage}%
              </p>
            </>
          ) : (
            <p className="text-sm text-fg-muted">No rated games yet</p>
          )}
        </SignalCard>

        {/* Current streak */}
        <SignalCard label="Current Streak" onClick={() => onNavigate('streaks')}>
          {streak.type && streak.count > 0 ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-fg tabular-nums">{streak.count}</span>
                <Badge tone={streakTone}>{STREAK_LABELS[streak.type]}</Badge>
              </div>
              <p className="text-sm text-fg-muted">Longest unbeaten: {streaks.longestUnbeaten}</p>
            </>
          ) : (
            <p className="text-sm text-fg-muted">No active streak</p>
          )}
        </SignalCard>

        {/* Next tournament */}
        <SignalCard label="Next Tournament" onClick={() => onNavigate('tournaments')}>
          {nextTournament ? (
            <>
              <p className="text-base font-semibold text-fg leading-snug line-clamp-2">{nextTournament.t.name}</p>
              <p className="text-sm text-fg-muted">
                {daysUntilNext === 0 ? 'Today' : daysUntilNext === 1 ? 'Tomorrow' : `in ${daysUntilNext} days`}
              </p>
            </>
          ) : (
            <p className="text-sm text-fg-muted">None scheduled — add one</p>
          )}
        </SignalCard>

        {/* Goal progress */}
        <SignalCard label="ELO Goal" onClick={() => onNavigate('goals')}>
          {goalReached ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-fg tabular-nums">{goalProjections.targetElo}</span>
                <Badge tone="win">reached</Badge>
              </div>
              <p className="text-sm text-fg-muted">Goal achieved 🎉</p>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-fg tabular-nums">{goalProjections.targetElo}</span>
                <Badge tone={goalProjections.onTrack ? 'win' : 'neutral'}>
                  {goalProjections.onTrack ? 'on track' : `+${eloToGoal} to go`}
                </Badge>
              </div>
              <p className="text-sm text-fg-muted tabular-nums">{goalProjections.daysRemaining} days remaining</p>
            </>
          )}
        </SignalCard>
      </div>

      {/* Secondary stats. Total games and win rate live in the hero now, so
          repeating them here would be the third and fourth time on one screen. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <CardHeader
            title="Performance by Color"
            className="mb-5"
            actions={<TabLink label="View details" onClick={() => onNavigate('by-color')} />}
          />
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
        <CardHeader
          title="ELO Progress Timeline"
          subtitle="Rating vs. performance across tournaments"
          className="mb-6"
          actions={<TabLink label="View full history" onClick={() => onNavigate('rating')} />}
        />
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
