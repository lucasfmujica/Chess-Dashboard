import { useMemo, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRightIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import ResultsDonut from '../../charts/ResultsDonut';
import { useCountUp } from '../../../hooks/useCountUp';
import { useGameForm } from '../../../hooks/useGameForm';
import { useTrainingPulse, SPLIT_WINDOW_DAYS } from '../../../hooks/useTrainingPulse';
import { WEEKLY_QUEUE_TARGET, programForDate, plannedMinutes } from '../../../constants/trainingProgram';
import { useModal } from '../../modals/ModalContext';
import TodayStrip from './TodayStrip';
import MomentSplitSummary from './training/MomentSplitSummary';
import { Card, CardHeader } from '../../ui/Card';
import StatCard, { ClockBar } from '../../ui/StatCard';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import ResultMark from '../../ui/ResultMark';
import { Table, THead, TBody, TR, TH, TD } from '../../ui/Table';
import { PieceGlyph } from '../../ui/PieceGlyph';
import { Chessboard } from 'react-chessboard';
import { boardSquareStyles } from '../boardTheme';
import { finalPositionFromPgn } from '../../../utils/finalPosition';
import ManualGameEntry from './analytics/ManualGameEntry';
import PgnImport from './analytics/PgnImport';
import OtbScoreSummary from './analytics/OtbScoreSummary';
import { getChartHeight } from '../../../utils/chartUtils';
import { dateFromKey, localDateKey } from '../../../utils/localDate';
import { hidePrepDistractions } from '../../../utils/featureWindow';
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
  ChessComSyncPanel: ComponentType<Record<string, unknown>>;
  onChessComSync: (games: Game[]) => void;
  onRemoveLichessGames: () => void;
  lichessGamesCount: number;
}

/** Inline "Ver …" link in pen ink, jumping to a full view. */
const TabLink = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1 rounded-sm text-xs font-medium text-accent underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
  >
    {label}
    <ArrowRightIcon className="h-3 w-3" />
  </button>
);

/** One column of the signals sheet: label, value, one line of context. */
const Signal = ({ label, onClick, children }: { label: string; onClick?: () => void; children: ReactNode }) => {
  const body = (
    <>
      <p className="text-label">{label}</p>
      <div className="mt-2 space-y-1">{children}</div>
    </>
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className="block w-full p-5 text-left transition-colors hover:bg-app focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
    >
      {body}
    </button>
  ) : (
    <div className="p-5">{body}</div>
  );
};

const STREAK_LABELS: Record<string, string> = {
  win: 'victorias seguidas',
  loss: 'derrotas seguidas',
  unbeaten: 'sin perder',
};

/** 3.5 → "3½", 0.5 → "½", 4 → "4". */
const fmtPoints = (n: number): string => {
  const whole = Math.floor(n);
  const half = n - whole >= 0.5;
  if (!half) return String(whole);
  return whole === 0 ? '½' : `${whole}½`;
};

const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

const FORM_COLOR: Record<string, string> = { W: 'text-win', L: 'text-loss', D: 'text-fg-muted' };
const FORM_SYMBOL: Record<string, string> = { W: '1', L: '0', D: '½' };

const roundKey = (g: Game) => {
  const n = parseFloat(g.round ?? '');
  return Number.isNaN(n) ? Number.POSITIVE_INFINITY : n;
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
  games,
  addManualGame,
  showPgnImport,
  setShowPgnImport,
  pgnText,
  setPgnText,
  handlePgnImport,
  LichessSyncPanel,
  onLichessSync,
  ChessComSyncPanel,
  onChessComSync,
  onRemoveLichessGames,
  lichessGamesCount
}: OverviewTabProps) => {
  const animatedElo = useCountUp(playerInfo.current_elo);
  const pulse = useTrainingPulse();
  const program = useMemo(() => programForDate(localDateKey()), []);
  // Streaks is out of the nav until the Final, so its cards must not link there.
  const streaksLink = hidePrepDistractions() ? undefined : () => onNavigate('streaks');
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
      await modal.alert('Partida guardada.');
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
  const eloChange = playerInfo.elo_change_last_tournament;

  // --- Last tournament (tournamentStats is ordered by earliest game) ---------
  const lastTournament = tournamentStats.length > 0 ? tournamentStats[tournamentStats.length - 1] : null;
  const lastTournamentGames = useMemo(
    () =>
      lastTournament
        ? games
            .filter(g => g.tournament === lastTournament.name)
            .map((g, i) => ({ g, i }))
            .sort((a, b) => roundKey(a.g) - roundKey(b.g) || a.i - b.i)
            .map(({ g }) => g)
        : [],
    [games, lastTournament]
  );
  const tournamentPoints = lastTournament ? lastTournament.wins + lastTournament.draws / 2 : 0;
  const tournamentPct = lastTournament && lastTournament.total > 0
    ? Math.round((tournamentPoints / lastTournament.total) * 100)
    : 0;

  const colorLine = (color: 'W' | 'B') => {
    const list = lastTournamentGames.filter(g => g.color === color);
    if (list.length === 0) return null;
    const pts = list.reduce((s, g) => s + (g.result === 'W' ? 1 : g.result === 'D' ? 0.5 : 0), 0);
    return `Con ${color === 'W' ? 'blancas' : 'negras'}, ${fmtPoints(pts)} de ${list.length}`;
  };
  const reading = [colorLine('W'), colorLine('B')].filter(Boolean).join('. ');

  const lastGame = lastTournamentGames.length > 0
    ? lastTournamentGames[lastTournamentGames.length - 1]
    : games.length > 0 ? games[games.length - 1] : null;
  // Final position of that game, when its PGN can be read (null otherwise:
  // the sheet then stays text-only).
  const lastGamePgn = lastGame?.pgn;
  const lastGameFinal = useMemo(() => finalPositionFromPgn(lastGamePgn), [lastGamePgn]);

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

  const perfUp = overallStats.performanceRating > playerInfo.current_elo;
  const scoreUp = parseFloat(overallStats.actualScore) > parseFloat(overallStats.expectedScore);

  return (
    <div className="space-y-8 animate-fadeIn">
      <ClockBar>
        <StatCard
          title="ELO FIDE"
          value={animatedElo}
          trend={eloChange > 0 ? 'up' : eloChange < 0 ? 'down' : undefined}
          subtitle={`${signed(eloChange)} · ${playerInfo.last_tournament || 'último torneo'}`}
          trendData={eloSpark.length > 1 ? eloSpark : undefined}
        />
        <StatCard
          title="Puntos en el torneo"
          value={
            lastTournament ? (
              <>
                {fmtPoints(tournamentPoints)}
                <span className="text-xl text-fg-muted"> / {lastTournament.total}</span>
              </>
            ) : (
              '—'
            )
          }
          subtitle={
            lastTournament
              ? `${tournamentPct}% · rendimiento ${lastTournament.performanceRating}`
              : 'Sin torneos cargados'
          }
        />
        <StatCard
          title={`Forma · últimas ${form.games || 5}`}
          value={
            form.games > 0 ? (
              <span className="tracking-[0.12em]">
                {[...form.results].reverse().map((r, i) => (
                  <span key={i} className={FORM_COLOR[r] ?? 'text-fg-muted'}>
                    {FORM_SYMBOL[r] ?? r}
                  </span>
                ))}
              </span>
            ) : (
              '—'
            )
          }
          subtitle={form.games > 0 ? `${form.score} · ${form.percentage}% · la más reciente a la derecha` : 'Sin partidas válidas todavía'}
        />
        <StatCard
          title={`Hoy · ${program.dayName.toLowerCase()}`}
          value={
            <>
              {plannedMinutes(program)}
              <span className="text-xl text-fg-muted"> min</span>
            </>
          }
          subtitle={program.focus}
        />
      </ClockBar>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          {/* Last tournament, round by round */}
          <Card flush>
            <div className="p-5 sm:p-6">
              <CardHeader
                title={lastTournament ? lastTournament.name : 'Último torneo'}
                subtitle={
                  lastTournament
                    ? `${fmtPoints(tournamentPoints)} de ${lastTournament.total} · rendimiento ${lastTournament.performanceRating}`
                    : undefined
                }
                actions={<TabLink label="Ver en la biblioteca" onClick={() => onNavigate('annotations')} />}
              />
            </div>
            {lastTournamentGames.length > 0 ? (
              <>
                <div className="px-5 sm:px-6">
                  <Table>
                    <THead>
                      <tr>
                        <TH align="right">R</TH>
                        <TH>Rival</TH>
                        <TH align="right">ELO</TH>
                        <TH>Color</TH>
                        <TH>Apertura</TH>
                        <TH align="right">Res.</TH>
                        <TH align="right">Δ</TH>
                      </tr>
                    </THead>
                    <TBody>
                      {lastTournamentGames.map((g, i) => (
                        <TR key={g.id ?? i}>
                          <TD align="right" className="font-mono">{g.round ?? i + 1}</TD>
                          <TD className="whitespace-nowrap">{g.opp}</TD>
                          <TD align="right" muted className="font-mono">{g.opp_elo || '—'}</TD>
                          <TD muted className="whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5">
                              <PieceGlyph color={g.color} size={10} />
                              {g.color === 'W' ? 'Blancas' : 'Negras'}
                            </span>
                          </TD>
                          <TD className="whitespace-nowrap">
                            {g.eco && <span className="mr-1.5 font-mono text-xs text-fg-muted">{g.eco}</span>}
                            {g.opening && <span className="font-serif">{g.opening}</span>}
                          </TD>
                          <TD align="right">
                            <ResultMark result={g.result} outline />
                          </TD>
                          <TD
                            align="right"
                            className={`font-mono ${
                              g.eloChange == null ? '!text-fg-subtle' : g.eloChange > 0 ? '!text-win' : g.eloChange < 0 ? '!text-loss' : ''
                            }`}
                          >
                            {g.eloChange == null ? '—' : signed(Math.round(g.eloChange * 10) / 10)}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </div>
                {reading && (
                  <p className="mt-5 border-t border-hairline px-5 py-4 font-serif text-[15px] leading-[22px] text-fg-muted sm:px-6">
                    {reading.charAt(0).toUpperCase() + reading.slice(1)}.
                  </p>
                )}
              </>
            ) : (
              <p className="px-5 pb-6 text-sm text-fg-muted sm:px-6">Todavía no hay partidas de torneo cargadas.</p>
            )}
          </Card>

          <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2">
            {/* Process numbers beside the outcome ones: what was actually done. */}
            <Card>
              <CardHeader title="Entrenamiento" subtitle={`Últimos ${SPLIT_WINDOW_DAYS} días`} />
              <dl className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-label">Intentos esta semana</dt>
                  <dd className="mt-1 font-mono text-2xl tabular-nums text-fg">
                    {pulse.loading ? '—' : pulse.attemptsThisWeek}
                    <span className="text-sm text-fg-muted"> / {WEEKLY_QUEUE_TARGET}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-label">Candidato perdido</dt>
                  <dd className="mt-1 font-mono text-2xl tabular-nums text-fg">
                    {pulse.loading || pulse.split.asked === 0 ? '—' : `${pulse.split.missedPct}%`}
                  </dd>
                  {!pulse.loading && pulse.split.asked > 0 && (
                    <dd className="mt-0.5 text-xs text-fg-muted tabular-nums">
                      {pulse.split.missed} de {pulse.split.asked} fallos
                    </dd>
                  )}
                </div>
              </dl>
              {!pulse.loading && pulse.attemptsThisWeek === 0 && (
                <p className="mt-3 text-xs text-fg-muted">
                  {pulse.daysSinceLastSession === null
                    ? 'Sin intentos registrados todavía. '
                    : `Hace ${pulse.daysSinceLastSession} día${pulse.daysSinceLastSession === 1 ? '' : 's'} del último registro. `}
                  <TabLink label="Entrenar" onClick={() => onNavigate('training')} />
                </p>
              )}
              {!pulse.loading && (
                <div className="mt-3 border-t border-hairline pt-3">
                  <MomentSplitSummary split={pulse.momentSplit} />
                </div>
              )}
            </Card>

            {lastGame && (
              <Card>
                <CardHeader title="Última partida" actions={<ResultMark result={lastGame.result} />} />
                <div className="mt-3">
                  <p className="font-serif text-base leading-6 text-fg">
                    {lastGame.color === 'W' ? 'Blancas' : 'Negras'} contra {lastGame.opp}
                    {lastGame.opp_elo ? <span className="font-mono text-sm text-fg-muted"> ({lastGame.opp_elo})</span> : null}
                  </p>
                  <p className="mt-0.5 text-xs text-fg-subtle">
                    {[
                      lastGame.tournament,
                      lastGame.round ? `R${lastGame.round}` : null,
                      [lastGame.opening, lastGame.eco].filter(Boolean).join(' '),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                {lastGame && lastGameFinal && (
                  <div className="board-frame mt-4 aspect-square w-full">
                    <Chessboard
                      options={{
                        id: 'overview-last-game',
                        position: lastGameFinal.fen,
                        boardOrientation: lastGame.color === 'B' ? 'black' : 'white',
                        allowDragging: false,
                        showNotation: false,
                        squareStyles: {
                          [lastGameFinal.lastMove.from]: { backgroundColor: 'rgb(var(--board-highlight) / 0.75)' },
                          [lastGameFinal.lastMove.to]: { backgroundColor: 'rgb(var(--board-highlight) / 0.75)' },
                        },
                        ...boardSquareStyles,
                      }}
                    />
                  </div>
                )}
                <Button className="mt-4 w-full" onClick={() => onNavigate('analysis-board')}>
                  Abrir en el tablero
                </Button>
              </Card>
            )}
          </div>
        </div>

        {/* What to do now: the only actionable sheet on the page. */}
        <TodayStrip onNavigate={onNavigate} />
      </div>

      {/* At-a-glance signals: what happened recently & what's next */}
      <Card flush className="grid grid-cols-1 divide-y divide-hairline sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Signal label="Racha actual" onClick={streaksLink}>
          {streak.type && streak.count > 0 ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-3xl tabular-nums text-fg">{streak.count}</span>
                <Badge tone={streakTone}>{STREAK_LABELS[streak.type]}</Badge>
              </div>
              <p className="text-sm text-fg-muted">Mejor serie sin perder: {streaks.longestUnbeaten}</p>
            </>
          ) : (
            <p className="text-sm text-fg-muted">Sin racha activa</p>
          )}
        </Signal>

        <Signal label="Próximo torneo" onClick={() => onNavigate('tournaments')}>
          {nextTournament ? (
            <>
              <p className="line-clamp-2 font-serif text-lg leading-snug text-fg">{nextTournament.t.name}</p>
              <p className="text-sm text-fg-muted">
                {daysUntilNext === 0 ? 'Hoy' : daysUntilNext === 1 ? 'Mañana' : `En ${daysUntilNext} días`}
              </p>
            </>
          ) : (
            <p className="text-sm text-fg-muted">Ninguno cargado. Agregá uno en Torneos.</p>
          )}
        </Signal>

        <Signal label="Objetivo de ELO" onClick={() => onNavigate('goals')}>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl tabular-nums text-fg">{goalProjections.targetElo}</span>
            {goalReached ? (
              <Badge tone="win">alcanzado</Badge>
            ) : (
              <Badge tone={goalProjections.onTrack ? 'win' : 'neutral'}>
                {goalProjections.onTrack ? 'en camino' : `faltan ${eloToGoal}`}
              </Badge>
            )}
          </div>
          <p className="text-sm text-fg-muted tabular-nums">
            {goalReached ? 'Objetivo cumplido' : `Quedan ${goalProjections.daysRemaining} días`}
          </p>
        </Signal>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Resultados"
            subtitle={`${overallStats.total} partidas · ${overallStats.actualScore} puntos`}
            className="mb-4"
          />
          <ResultsDonut wins={overallStats.wins} draws={overallStats.draws} losses={overallStats.losses} />
          <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-hairline pt-4">
            <div>
              <dt className="text-label">Rendimiento</dt>
              <dd className={`mt-1 font-mono text-2xl tabular-nums ${perfUp ? 'text-win' : 'text-loss'}`}>
                {overallStats.performanceRating}
              </dd>
              <dd className="text-xs text-fg-muted tabular-nums">
                {overallStats.actualScore} de {overallStats.total}
              </dd>
            </div>
            <div>
              <dt className="text-label">Obtenido / esperado</dt>
              <dd className={`mt-1 font-mono text-2xl tabular-nums ${scoreUp ? 'text-win' : 'text-loss'}`}>
                {overallStats.actualScore}
              </dd>
              <dd className="text-xs text-fg-muted tabular-nums">Esperado: {overallStats.expectedScore}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="Por color"
            className="mb-5"
            actions={<TabLink label="Ver detalle" onClick={() => onNavigate('by-color')} />}
          />
          <div className="divide-y divide-hairline">
            {[
              { label: 'Blancas', color: 'W' as const, stats: whiteStats },
              { label: 'Negras', color: 'B' as const, stats: blackStats },
            ].map(({ label, color, stats }) => {
              const total = stats.wins + stats.draws + stats.losses || 1;
              const winPct = (stats.wins / total) * 100;
              const drawPct = (stats.draws / total) * 100;
              const lossPct = (stats.losses / total) * 100;
              return (
                <div key={label} className="py-4 first:pt-0 last:pb-0">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <PieceGlyph color={color} size={10} />
                      <span className="text-label">{label}</span>
                    </div>
                    <div className="flex items-baseline gap-2 font-mono tabular-nums">
                      <span className="text-lg text-fg">{stats.score || '0/0'}</span>
                      <span className="text-sm text-fg-muted">{stats.winRate}%</span>
                    </div>
                  </div>
                  <div className="flex h-2 w-full overflow-hidden rounded-sm bg-surface-2">
                    <div className="h-full bg-win" style={{ width: `${winPct}%` }} />
                    <div className="h-full bg-draw" style={{ width: `${drawPct}%` }} />
                    <div className="h-full bg-loss" style={{ width: `${lossPct}%` }} />
                  </div>
                  <p className="mt-2 font-mono text-xs tabular-nums text-fg-muted">
                    + {stats.wins} · = {stats.draws} · − {stats.losses}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ELO Progress */}
      <Card>
        <CardHeader
          title="ELO por torneo"
          subtitle="ELO al empezar cada torneo y rendimiento en él"
          className="mb-6"
          actions={<TabLink label="Ver historial completo" onClick={() => onNavigate('rating')} />}
        />
        {eloTimeline.length > 0 ? (
          <ResponsiveContainer width="100%" height={getChartHeight('mini')}>
            <LineChart data={eloTimeline} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="rgb(var(--border))" vertical={false} />
              <XAxis dataKey="tournament" angle={-25} textAnchor="end" height={62} stroke="rgb(var(--fg-muted))" tick={{ fontSize: 11, fill: 'rgb(var(--fg-muted))' }} axisLine={{ stroke: 'rgb(var(--border))' }} tickLine={false} />
              <YAxis domain={['auto', 'auto']} stroke="rgb(var(--fg-muted))" tick={{ fontSize: 12, fill: 'rgb(var(--fg-muted))', fontFamily: 'var(--font-mono, monospace)' }} axisLine={false} tickLine={false} width={48} />
              <Tooltip
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTournament ?? ''}
                contentStyle={{
                  backgroundColor: 'rgb(var(--surface))',
                  borderRadius: '4px',
                  border: '1px solid rgb(var(--border))',
                  color: 'rgb(var(--fg))',
                  fontSize: '13px',
                }}
                labelStyle={{ color: 'rgb(var(--fg-muted))', fontWeight: 600, marginBottom: 4 }}
              />
              <Legend
                iconType="plainline"
                iconSize={14}
                wrapperStyle={{ fontSize: '12px', color: 'rgb(var(--fg-muted))', paddingTop: '12px' }}
              />
              <Line type="monotone" dataKey="elo" stroke="rgb(var(--cat-1))" strokeWidth={2} name="ELO" dot={{ r: 3, strokeWidth: 0, fill: 'rgb(var(--cat-1))' }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="performanceRating" stroke="rgb(var(--fg-muted))" strokeWidth={1.5} name="Rendimiento" dot={{ r: 2.5, strokeWidth: 0, fill: 'rgb(var(--fg-muted))' }} strokeDasharray="5 4" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-fg-muted">
            <p>Todavía no hay torneos cargados.</p>
          </div>
        )}
      </Card>

      {/* Add / Import Games */}
      <Card flush>
        <button
          type="button"
          onClick={() => setShowAddGames(prev => !prev)}
          aria-expanded={showAddGames}
          className="flex w-full items-center justify-between gap-4 p-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent sm:p-6"
        >
          <div>
            <h3 className="font-serif text-xl font-semibold leading-tight text-fg">Cargar partidas</h3>
            <p className="mt-1 text-sm text-fg-muted">A mano, pegando un PGN o sincronizando Lichess y Chess.com</p>
          </div>
          {showAddGames ? <ChevronUpIcon className="h-5 w-5 shrink-0 text-fg-muted" /> : <ChevronDownIcon className="h-5 w-5 shrink-0 text-fg-muted" />}
        </button>
        {showAddGames && (
          <div className="space-y-4 border-t border-hairline px-5 pb-6 pt-5 sm:px-6">
            <ManualGameEntry
              showManualEntry={showManualEntry}
              setShowManualEntry={setShowManualEntry}
              gameForm={gameForm}
              uniqueTournaments={uniqueTournaments}
              handleInputChange={handleInputChange}
              handleAddGame={handleAddGameWithMessage}
              resetForm={resetForm}
            />

            <OtbScoreSummary games={games} />

            <PgnImport
              showPgnImport={showPgnImport}
              setShowPgnImport={setShowPgnImport}
              pgnText={pgnText}
              setPgnText={setPgnText}
              handlePgnImport={handlePgnImport}
            />

            {ChessComSyncPanel && <ChessComSyncPanel onSyncComplete={onChessComSync} />}

            {LichessSyncPanel && (
              <div className="space-y-4">
                <LichessSyncPanel onSyncComplete={onLichessSync} />

                {lichessGamesCount > 0 && (
                  <div className="rounded border border-hairline bg-surface-2 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-fg">Borrar partidas importadas</h4>
                        <p className="mt-1 text-xs text-fg-muted">
                          Tenés {lichessGamesCount} partida{lichessGamesCount !== 1 ? 's' : ''} de Lichess importada{lichessGamesCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Button variant="danger" onClick={onRemoveLichessGames}>
                        Borrar todas las de Lichess
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
