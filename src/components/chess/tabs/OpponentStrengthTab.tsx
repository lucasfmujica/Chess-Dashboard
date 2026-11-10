import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getChartHeight } from '../../../utils/chartUtils';
import TimeOfDayPerformance from './analytics/TimeOfDayPerformance';
import TournamentComparison from './analytics/TournamentComparison';
import { Badge, Button, Card, CardHeader, ClockBar, ResultMark, SegmentedControl, StatCard, Table, TBody, TD, TH, THead, TR, type Segment } from '../../ui';
import type { Game } from '../../../types/chess';
import { groupByOpponentElo, summarizeBracket, type BracketStats } from '../../../utils/opponentEloBands';

/** Per time-of-day-slot aggregate row. */
interface TimeOfDayStat {
  time: string;
  total: number;
  wins: number;
  draws: number;
  losses: number;
  score: string;
  winRate: string;
}

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
  /** False for the "Lichess Online" bucket, which is not an event. */
  otb?: boolean;
}

/** Per-bracket aggregate computed from rated games (either grouping mode). */
type BracketAnalysis = BracketStats & { label: string; color: string };

type GroupingMode = 'diff' | 'abs';

const GROUPING_OPTIONS: Segment<GroupingMode>[] = [
  { value: 'diff', label: 'Diferencia de ELO' },
  { value: 'abs', label: 'ELO del rival' },
];

interface SortConfig {
  key: 'date' | 'opp_elo' | 'eloDiff' | 'result';
  direction: 'asc' | 'desc';
}

interface OpponentStrengthTabProps {
  games: Game[];
  currentElo: number;
  timeOfDayStats: TimeOfDayStat[];
  tournamentComparison: TournamentComparisonEntry[];
}

const SORT_OPTIONS: { key: SortConfig['key']; label: string }[] = [
  { key: 'date', label: 'Fecha' },
  { key: 'opp_elo', label: 'ELO del rival' },
  { key: 'eloDiff', label: 'Diferencia' },
  { key: 'result', label: 'Resultado' },
];

/** 2.5 → "2½", 0.5 → "½". */
const fmtPts = (p: number) => {
  const whole = Math.floor(p);
  return p - whole >= 0.5 ? `${whole || ''}½` : String(whole);
};

const OpponentStrengthTab = ({ games, timeOfDayStats, tournamentComparison }: OpponentStrengthTabProps) => {
  const [selectedBracket, setSelectedBracket] = useState<BracketAnalysis | null>(null);
  const [grouping, setGrouping] = useState<GroupingMode>('diff');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });
  const strengthAnalysis = useMemo<BracketAnalysis[]>(() => {
    const ratedGames = games.filter(g => g.rated && g.opp_elo > 0 && g.elo > 0);

    // Define ELO brackets based on rating difference (opp_elo - player_elo at time of game)
    const brackets = [
      { label: 'Rival 200+ por debajo', minDiff: -Infinity, maxDiff: -200, color: 'rgb(var(--cat-3))' },
      { label: 'Rival 100–199 por debajo', minDiff: -199, maxDiff: -100, color: 'rgb(var(--cat-6))' },
      { label: 'Parejo (±99)', minDiff: -99, maxDiff: 99, color: 'rgb(var(--cat-1))' },
      { label: 'Rival 100–199 por encima', minDiff: 100, maxDiff: 199, color: 'rgb(var(--cat-2))' },
      { label: 'Rival 200+ por encima', minDiff: 200, maxDiff: Infinity, color: 'rgb(var(--cat-5))' },
    ];

    return brackets.map(bracket => ({
      ...bracket,
      ...summarizeBracket(
        ratedGames.filter(g => {
          const diff = g.opp_elo - g.elo;
          return diff >= bracket.minDiff && diff <= bracket.maxDiff;
        })
      ),
    }));
  }, [games]);

  // Absolute opponent-ELO bands; games without opponent ELO are left out and counted.
  const bandAnalysis = useMemo(
    () => groupByOpponentElo(games.filter(g => g.rated && g.elo > 0)),
    [games]
  );

  const strengthTrend = useMemo(() => {
    const ratedGames = games.filter(g => g.rated && g.opp_elo > 0 && g.elo > 0);

    return ratedGames.map((game, idx) => {
      // Use player's ELO at time of game, not current ELO
      const eloDiff = game.opp_elo - game.elo;
      const result = game.result === 'W' ? 1 : game.result === 'D' ? 0.5 : 0;

      return {
        game: idx + 1,
        eloDiff,
        result: result * 100,
        opponent: game.opp,
        oppElo: game.opp_elo,
        playerElo: game.elo,
      };
    });
  }, [games]);

  const summary = useMemo(() => {
    const rated = games.filter(g => g.rated && g.opp_elo > 0 && g.elo > 0);
    const tally = (list: Game[]) => {
      const pts = list.reduce((s, g) => s + (g.result === 'W' ? 1 : g.result === 'D' ? 0.5 : 0), 0);
      const exp = list.reduce((s, g) => s + 1 / (1 + Math.pow(10, (g.opp_elo - g.elo) / 400)), 0);
      return { n: list.length, pts, exp, pct: list.length ? Math.round((pts / list.length) * 100) : 0 };
    };
    const avgOpp = rated.length ? Math.round(rated.reduce((s, g) => s + g.opp_elo, 0) / rated.length) : 0;
    return {
      all: tally(rated),
      stronger: tally(rated.filter(g => g.opp_elo - g.elo >= 100)),
      weaker: tally(rated.filter(g => g.opp_elo - g.elo <= -100)),
      avgOpp,
    };
  }, [games]);

  const sortedGames = useMemo(() => {
    if (!selectedBracket) return [];
    const resultOrder: Record<string, number> = { W: 3, D: 2, L: 1 };
    const val = (g: Game): number => {
      switch (sortConfig.key) {
        case 'date':
          return new Date(g.date || 0).getTime();
        case 'opp_elo':
          return g.opp_elo;
        case 'eloDiff':
          return g.opp_elo - g.elo;
        case 'result':
          return resultOrder[g.result] || 0;
        default:
          return 0;
      }
    };
    return [...selectedBracket.bracketGames].sort((a, b) =>
      sortConfig.direction === 'asc' ? val(a) - val(b) : val(b) - val(a)
    );
  }, [selectedBracket, sortConfig]);

  const toggleBracket = (bracket: BracketAnalysis) =>
    setSelectedBracket(selectedBracket?.label === bracket.label ? null : bracket);

  const changeGrouping = (mode: GroupingMode) => {
    setGrouping(mode);
    setSelectedBracket(null);
  };

  const groupRows: BracketAnalysis[] = grouping === 'diff' ? strengthAnalysis : bandAnalysis.bands;
  const activeBrackets = groupRows.filter(b => b.games > 0);
  const readings = groupRows.filter(b => b.games >= 5 && Math.abs(b.performance) > 5);
  /** How a bracket is named at the start of a "Lectura" sentence. */
  const readingLabel = (label: string) =>
    grouping === 'diff' ? label : `Contra rivales de ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
  const diffPts = summary.all.pts - summary.all.exp;

  return (
    <div className="space-y-8">
      <p className="text-sm text-fg-muted">
        <span className="font-mono tabular-nums">{summary.all.n}</span> partidas con ELO · rival promedio{' '}
        <span className="font-mono tabular-nums">{summary.avgOpp || '—'}</span>
      </p>

      <ClockBar>
        <StatCard
          title="Puntaje total"
          value={`${summary.all.pct}%`}
          subtitle={`${fmtPts(summary.all.pts)} de ${summary.all.n}`}
        />
        <StatCard
          title="Contra rivales más fuertes"
          value={summary.stronger.n ? `${summary.stronger.pct}%` : '—'}
          trend={summary.stronger.n ? (summary.stronger.pts >= summary.stronger.exp ? 'up' : 'down') : undefined}
          subtitle={`${fmtPts(summary.stronger.pts)} de ${summary.stronger.n} · 100+ por encima`}
        />
        <StatCard
          title="Contra rivales más débiles"
          value={summary.weaker.n ? `${summary.weaker.pct}%` : '—'}
          trend={summary.weaker.n ? (summary.weaker.pts >= summary.weaker.exp ? 'up' : 'down') : undefined}
          subtitle={`${fmtPts(summary.weaker.pts)} de ${summary.weaker.n} · 100+ por debajo`}
        />
        <StatCard
          title="Rendimiento vs esperado"
          value={`${diffPts >= 0 ? '+' : '−'}${Math.abs(diffPts).toFixed(1)}`}
          trend={summary.all.n ? (diffPts >= 0 ? 'up' : 'down') : undefined}
          subtitle={`puntos ${diffPts >= 0 ? 'sobre' : 'bajo'} lo esperado por ELO`}
        />
      </ClockBar>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <SegmentedControl
            options={GROUPING_OPTIONS}
            value={grouping}
            onChange={changeGrouping}
            size="sm"
            aria-label="Agrupar partidas por"
            className="mb-4"
          />
          <CardHeader
            title={grouping === 'diff' ? 'Por diferencia de ELO' : 'Por ELO del rival'}
            subtitle="barra: puntaje · línea: esperado · tocá una franja para ver sus partidas"
            className="mb-2"
          />
          {grouping === 'abs' && bandAnalysis.excluded > 0 && (
            <p className="mb-2 text-xs text-fg-subtle">
              <span className="font-mono tabular-nums">{bandAnalysis.excluded}</span>{' '}
              {bandAnalysis.excluded === 1 ? 'partida quedó afuera' : 'partidas quedaron afuera'} por no tener ELO del rival.
            </p>
          )}
          {activeBrackets.length === 0 ? (
            <p className="py-6 text-sm text-fg-muted">Todavía no hay partidas con ELO para comparar.</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {activeBrackets.map(bracket => {
                const selected = selectedBracket?.label === bracket.label;
                return (
                  <li key={bracket.label}>
                    <button
                      type="button"
                      onClick={() => toggleBracket(bracket)}
                      aria-pressed={selected}
                      className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-2 py-3.5 text-left transition-colors hover:bg-app focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:grid-cols-[150px_minmax(0,1fr)_56px_96px] ${
                        selected ? 'bg-accent/10' : ''
                      }`}
                    >
                      <span className={`font-serif text-base leading-snug ${selected ? 'text-accent' : 'text-fg'}`}>
                        {bracket.label}
                      </span>
                      <span className="relative col-span-2 row-start-2 h-3.5 rounded-sm bg-surface-2 sm:col-span-1 sm:row-start-auto" aria-hidden="true">
                        <span className="absolute inset-y-0 left-0 rounded-sm bg-accent" style={{ width: `${Math.min(100, bracket.scorePercentage)}%` }} />
                        <span
                          className="absolute -bottom-1 -top-1 w-0.5 bg-fg"
                          style={{ left: `calc(${Math.min(100, bracket.expectedPercentage)}% - 1px)` }}
                        />
                      </span>
                      <span className="text-right font-mono text-[15px] tabular-nums text-fg sm:row-start-auto">
                        {Math.round(bracket.scorePercentage)}%
                      </span>
                      <span className="col-span-2 font-mono text-xs tabular-nums text-fg-subtle sm:col-span-1 sm:text-right">
                        +{bracket.wins} ={bracket.draws} −{bracket.losses}
                        <span className="sm:block">
                          {' '}· esp. {Math.round(bracket.expectedPercentage)}%
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Lectura" subtitle="franjas con 5 partidas o más" className="mb-4" />
          {readings.length === 0 ? (
            <p className="font-serif text-base leading-6 text-fg-muted">
              En ninguna franja te alejás más de 5 puntos de lo que marca el ELO: rendís lo esperado.
            </p>
          ) : (
            <div className="space-y-4 font-serif text-base leading-6 text-fg">
              {readings.map(bracket =>
                bracket.performance > 0 ? (
                  <p key={bracket.label}>
                    {readingLabel(bracket.label)}: hacés {Math.round(bracket.scorePercentage)}% cuando el ELO espera{' '}
                    {Math.round(bracket.expectedPercentage)}%. Rendís {bracket.performance.toFixed(1)} puntos por encima, en{' '}
                    {bracket.games} partidas.
                  </p>
                ) : (
                  <p key={bracket.label}>
                    {readingLabel(bracket.label)}: hacés {Math.round(bracket.scorePercentage)}% contra un esperado de{' '}
                    {Math.round(bracket.expectedPercentage)}%. Quedás {Math.abs(bracket.performance).toFixed(1)} puntos abajo: ahí
                    está el trabajo.
                  </p>
                )
              )}
            </div>
          )}
        </Card>
      </div>

      {selectedBracket && (
        <Card flush>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h3 className="font-serif text-xl font-semibold leading-tight text-fg">Partidas · {selectedBracket.label}</h3>
              <p className="mt-1 font-mono text-xs tabular-nums text-fg-subtle">
                {fmtPts(parseFloat(selectedBracket.score))} de {selectedBracket.games} ({selectedBracket.scorePercentage}%) · +
                {selectedBracket.wins} ={selectedBracket.draws} −{selectedBracket.losses}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedBracket(null)}>
              Cerrar
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 px-5 pt-3 sm:px-6">
            <span className="text-label">Ordenar por</span>
            {SORT_OPTIONS.map(({ key, label }) => {
              const active = sortConfig.key === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setSortConfig(
                      active
                        ? { key, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' }
                        : { key, direction: 'desc' }
                    )
                  }
                  className={`rounded-sm px-2 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    active ? 'bg-accent/10 text-accent' : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  {label}
                  {active && <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                </button>
              );
            })}
          </div>

          <div className="max-h-96 overflow-y-auto p-5 pt-3 sm:p-6 sm:pt-3">
            <Table>
              <THead>
                <tr>
                  <TH>Fecha</TH>
                  <TH>Rival</TH>
                  <TH align="right">ELO</TH>
                  <TH align="right">Tu ELO</TH>
                  <TH align="right">Dif.</TH>
                  <TH>Color</TH>
                  <TH>ECO</TH>
                  <TH>Torneo</TH>
                  <TH align="right">Res.</TH>
                </tr>
              </THead>
              <TBody>
                {sortedGames.map((game, idx) => {
                  const eloDiff = game.opp_elo - game.elo;
                  return (
                    <TR key={idx}>
                      <TD muted className="whitespace-nowrap font-mono">
                        {game.date ? new Date(game.date).toLocaleDateString('es-AR') : '—'}
                      </TD>
                      <TD className="whitespace-nowrap">{game.opp}</TD>
                      <TD align="right" className="font-mono">{game.opp_elo}</TD>
                      <TD align="right" muted className="font-mono">{game.elo}</TD>
                      <TD align="right" muted className="font-mono">
                        {eloDiff >= 0 ? '+' : '−'}
                        {Math.abs(eloDiff)}
                      </TD>
                      <TD muted>{game.color === 'W' ? 'Blancas' : 'Negras'}</TD>
                      <TD>{game.eco ? <Badge>{game.eco}</Badge> : <span className="text-fg-subtle">—</span>}</TD>
                      <TD muted className="max-w-[200px] truncate" title={game.tournament}>
                        {game.tournament || '—'}
                      </TD>
                      <TD align="right">
                        <ResultMark result={game.result} outline />
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Resultado y diferencia de ELO, partida por partida"
          subtitle="en orden cronológico · eje izquierdo: resultado (1 = 100) · eje derecho: diferencia con el rival"
          className="mb-4"
        />
        <ResponsiveContainer width="100%" height={getChartHeight('small')}>
          <LineChart data={strengthTrend} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="rgb(var(--border))" vertical={false} />
            <XAxis dataKey="game" tick={{ fontSize: 12, fill: 'rgb(var(--fg-subtle))' }} stroke="rgb(var(--border))" />
            <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 12, fill: 'rgb(var(--fg-subtle))' }} stroke="rgb(var(--border))" />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: 'rgb(var(--fg-subtle))' }} stroke="rgb(var(--border))" />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded border border-hairline bg-surface p-3 text-sm">
                      <p className="font-semibold text-fg">Partida {data.game}</p>
                      <p className="text-fg-muted">vs {data.opponent} <span className="font-mono tabular-nums">({data.oppElo})</span></p>
                      <p className="font-mono tabular-nums text-fg-muted">
                        Tu ELO {data.playerElo} · dif. {data.eloDiff >= 0 ? '+' : '−'}
                        {Math.abs(data.eloDiff)}
                      </p>
                      <p className="font-mono tabular-nums text-fg">
                        Resultado {data.result === 100 ? '1' : data.result === 50 ? '½' : '0'}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line yAxisId="left" type="monotone" dataKey="result" stroke="rgb(var(--cat-1))" strokeWidth={1.5} name="Resultado" dot={{ r: 2 }} />
            <Line yAxisId="right" type="monotone" dataKey="eloDiff" stroke="rgb(var(--cat-2))" strokeWidth={1.5} name="Diferencia de ELO" dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <TimeOfDayPerformance timeOfDayStats={timeOfDayStats} />

      <TournamentComparison tournamentComparison={tournamentComparison} />
    </div>
  );
};

export default OpponentStrengthTab;
