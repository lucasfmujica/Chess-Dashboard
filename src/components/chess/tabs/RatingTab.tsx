import { useMemo } from 'react';
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { getChartHeight } from '../../../utils/chartUtils';
import { Card, CardHeader, ClockBar, StatCard, Table, THead, TBody, TR, TH, TD } from '../../ui';

/** −12 with a real minus sign, +12 with a plus. */
const signed = (n: number, digits = 0): string => {
  const v = digits ? n.toFixed(digits) : String(Math.round(n));
  return n > 0 ? `+${v}` : n < 0 ? `−${v.replace('-', '')}` : v;
};

/** Integer deltas without decimals, fractional ones with one. */
const delta = (n: number): string => signed(n, Number.isInteger(n) ? 0 : 1);

/** 3.5 → "3½". */
const fmtPoints = (n: number): string => {
  const whole = Math.floor(n);
  if (n - whole < 0.5) return String(whole);
  return whole === 0 ? '½' : `${whole}½`;
};

const AXIS_TICK = { fontSize: 12, fill: 'rgb(var(--fg-muted))' };
const TOOLTIP_BOX = 'rounded border border-hairline bg-surface p-3 text-sm shadow-[0_1px_0_rgb(var(--fg)/0.06)]';

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
      points: number;
    }

    const tournaments: Record<string, TournamentSummary> = {};
    eloHistory.forEach(game => {
      if (!tournaments[game.tournament]) {
        tournaments[game.tournament] = {
          name: game.tournament,
          totalChange: 0,
          games: 0,
          startElo: game.eloBefore,
          endElo: game.elo,
          points: 0
        };
      }
      tournaments[game.tournament].totalChange += game.eloChange;
      tournaments[game.tournament].games++;
      tournaments[game.tournament].points += game.actual;
      tournaments[game.tournament].endElo = game.elo;
    });

    return Object.values(tournaments).map(t => ({
      ...t,
      avgChange: (t.totalChange / t.games).toFixed(1)
    }));
  }, [eloHistory]);

  const first = eloHistory[0];
  const peakGame = eloHistory.find(h => h.elo === stats.highestElo);
  const fromPeak = stats.currentElo - stats.highestElo;
  const bestTournament = tournamentPerformance.reduce<(typeof tournamentPerformance)[number] | null>(
    (best, t) => (best === null || t.totalChange > best.totalChange ? t : best),
    null
  );
  const tournamentsRecentFirst = [...tournamentPerformance].reverse();

  if (eloHistory.length === 0) {
    return (
      <Card>
        <p className="text-sm text-fg-muted">Todavía no hay partidas válidas para ELO.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-fg-muted">
        <span className="font-mono tabular-nums">{eloHistory.length}</span> partidas válidas ·{' '}
        <span className="font-mono tabular-nums">{tournamentPerformance.length}</span> torneos
      </p>

      <ClockBar>
        <StatCard
          title="ELO hoy"
          value={stats.currentElo}
          trend={fromPeak < 0 ? 'down' : undefined}
          subtitle={fromPeak < 0 ? `${signed(fromPeak)} desde el máximo` : 'En su máximo'}
        />
        <StatCard
          title="Desde el inicio"
          value={signed(stats.totalChange)}
          trend={stats.totalChange > 0 ? 'up' : stats.totalChange < 0 ? 'down' : undefined}
          subtitle={`${first.eloBefore} en ${first.tournament}`}
        />
        <StatCard
          title="Máximo"
          value={stats.highestElo}
          subtitle={peakGame ? peakGame.tournament : undefined}
        />
        {bestTournament && (
          <StatCard
            title="Mejor torneo"
            value={delta(bestTournament.totalChange)}
            subtitle={`${bestTournament.name} · ${fmtPoints(bestTournament.points)} / ${bestTournament.games}`}
          />
        )}
      </ClockBar>

      {/* ELO Progression Chart */}
      <Card>
        <CardHeader
          title="Partida por partida"
          subtitle={`De ${first.eloBefore} a ${stats.currentElo} en ${eloHistory.length} partidas`}
          className="mb-6"
        />
        <ResponsiveContainer width="100%" height={getChartHeight('large')}>
          <ComposedChart data={eloHistory} margin={{ top: 8, right: 16, left: -4, bottom: 0 }}>
            <CartesianGrid stroke="rgb(var(--border))" vertical={false} />
            <XAxis
              dataKey="game"
              stroke="rgb(var(--fg-muted))"
              tick={AXIS_TICK}
              axisLine={{ stroke: 'rgb(var(--border))' }}
              tickLine={false}
            />
            <YAxis
              domain={[
                (min: number) => Math.floor((min - 30) / 50) * 50,
                (max: number) => Math.ceil((max + 30) / 50) * 50,
              ]}
              allowDataOverflow={false}
              stroke="rgb(var(--fg-muted))"
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip
              cursor={{ stroke: 'rgb(var(--border-strong))', strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const changeColor = data.eloChange > 0 ? 'text-win' : data.eloChange < 0 ? 'text-loss' : 'text-fg-muted';
                  return (
                    <div className={TOOLTIP_BOX}>
                      <div className="mb-1 flex items-baseline justify-between gap-4">
                        <p className="font-medium text-fg">Partida {data.game}</p>
                        <span className={`font-mono tabular-nums ${changeColor}`}>{delta(data.eloChange)}</span>
                      </div>
                      <p className="text-fg-muted">{data.tournament}</p>
                      <p className="text-fg">contra {data.opponent}</p>
                      {data.opening && <p className="font-serif text-fg-subtle">{data.opening}</p>}
                      <div className="mt-2 space-y-0.5 border-t border-hairline pt-2 font-mono text-xs tabular-nums">
                        <div className="flex justify-between gap-6"><span className="font-sans text-fg-muted">Antes</span><span className="text-fg">{data.eloBefore}</span></div>
                        <div className="flex justify-between gap-6"><span className="font-sans text-fg-muted">Después</span><span className="text-fg">{data.elo}</span></div>
                        <div className="flex justify-between gap-6"><span className="font-sans text-fg-muted">K</span><span className="text-fg">{data.kFactor}</span></div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area type="monotone" dataKey="elo" fill="rgb(var(--cat-1))" fillOpacity={0.06} stroke="none" isAnimationActive={false} />
            <Line
              type="monotone"
              dataKey="elo"
              stroke="rgb(var(--cat-1))"
              strokeWidth={2}
              name="ELO"
              dot={(props) => {
                const { cx, cy, payload, index } = props;
                const dotColor = payload.eloChange > 0 ? 'rgb(var(--win))' : payload.eloChange < 0 ? 'rgb(var(--loss))' : 'rgb(var(--fg-subtle))';
                return <circle key={index} cx={cx} cy={cy} r={2.5} fill={dotColor} stroke="none" />;
              }}
              activeDot={{ r: 5, fill: 'rgb(var(--cat-1))', stroke: 'rgb(var(--surface))', strokeWidth: 2 }}
            />
            <ReferenceLine
              y={stats.highestElo}
              stroke="rgb(var(--fg-muted))"
              strokeDasharray="4 4"
              label={{ value: `Máximo ${stats.highestElo}`, position: 'insideTopRight', fill: 'rgb(var(--fg-muted))', fontSize: 12 }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-hairline pt-4 sm:grid-cols-4">
          <div>
            <dt className="text-label">Mejor partida</dt>
            <dd className="mt-1 font-mono text-xl tabular-nums text-win">{delta(stats.biggestGain)}</dd>
          </div>
          <div>
            <dt className="text-label">Peor partida</dt>
            <dd className="mt-1 font-mono text-xl tabular-nums text-loss">{delta(stats.biggestLoss)}</dd>
          </div>
          <div>
            <dt className="text-label">Promedio por partida</dt>
            <dd className={`mt-1 font-mono text-xl tabular-nums ${stats.averageEloChange >= 0 ? 'text-win' : 'text-loss'}`}>
              {signed(stats.averageEloChange, 1)}
            </dd>
          </div>
          <div>
            <dt className="text-label">Suben / bajan</dt>
            <dd className="mt-1 font-mono text-xl tabular-nums text-fg">
              <span className="text-win">{stats.positiveGames}</span>
              <span className="text-fg-subtle"> / </span>
              <span className="text-loss">{stats.negativeGames}</span>
            </dd>
          </div>
        </dl>
      </Card>

      {/* Tournament by tournament */}
      <Card flush>
        <div className="p-5 sm:p-6">
          <CardHeader title="Torneo por torneo" subtitle="Más reciente arriba" />
        </div>
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <Table>
            <THead>
              <tr>
                <TH>Torneo</TH>
                <TH align="right">P</TH>
                <TH align="right">Pts</TH>
                <TH align="right">ELO al empezar</TH>
                <TH align="right">ELO al terminar</TH>
                <TH align="right">Δ</TH>
              </tr>
            </THead>
            <TBody>
              {tournamentsRecentFirst.map(t => (
                <TR key={t.name}>
                  <TD className="whitespace-nowrap font-serif">{t.name}</TD>
                  <TD align="right" muted className="font-mono">{t.games}</TD>
                  <TD align="right" className="font-mono">{fmtPoints(t.points)}</TD>
                  <TD align="right" className="font-mono">{t.startElo}</TD>
                  <TD align="right" className="font-mono">{t.endElo}</TD>
                  <TD
                    align="right"
                    className={`font-mono ${t.totalChange > 0 ? '!text-win' : t.totalChange < 0 ? '!text-loss' : ''}`}
                  >
                    {delta(t.totalChange)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Expected vs actual */}
        <Card>
          <CardHeader title="Esperado contra obtenido" subtitle="Lo que daba la diferencia de ELO y lo que sacaste" className="mb-6" />
          <ResponsiveContainer width="100%" height={getChartHeight('regular')}>
            <BarChart data={eloHistory} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="rgb(var(--border))" vertical={false} />
              <XAxis dataKey="game" stroke="rgb(var(--fg-muted))" tick={AXIS_TICK} axisLine={{ stroke: 'rgb(var(--border))' }} tickLine={false} />
              <YAxis domain={[0, 1]} stroke="rgb(var(--fg-muted))" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgb(var(--surface-2))' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const diffColor = data.diff > 0 ? 'text-win' : 'text-loss';
                    return (
                      <div className={TOOLTIP_BOX}>
                        <p className="font-medium text-fg">Partida {data.game}</p>
                        {data.opening && <p className="mb-2 font-serif text-fg-muted">{data.opening}</p>}
                        <div className="space-y-0.5 font-mono text-xs tabular-nums">
                          <div className="flex justify-between gap-6"><span className="font-sans text-fg-muted">Esperado</span><span className="text-fg">{data.expected.toFixed(2)}</span></div>
                          <div className="flex justify-between gap-6"><span className="font-sans text-fg-muted">Obtenido</span><span className="text-fg">{data.actual.toFixed(2)}</span></div>
                          <div className="flex justify-between gap-6 border-t border-hairline pt-1"><span className="font-sans text-fg-muted">Diferencia</span><span className={diffColor}>{signed(data.diff, 2)}</span></div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '12px', color: 'rgb(var(--fg-muted))' }} />
              <Bar dataKey="expected" fill="rgb(var(--fg-subtle))" fillOpacity={0.5} name="Esperado" radius={[2, 2, 0, 0]} />
              <Bar dataKey="actual" fill="rgb(var(--cat-1))" name="Obtenido" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* ELO Change Distribution */}
        <Card>
          <CardHeader title="Cuánto se mueve por partida" subtitle="Partidas según la variación de ELO" className="mb-6" />
          <ResponsiveContainer width="100%" height={getChartHeight('regular')}>
            <BarChart data={eloChangeDistribution} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="rgb(var(--border))" vertical={false} />
              <XAxis
                dataKey="range"
                angle={-35}
                textAnchor="end"
                height={70}
                tick={{ fontSize: 11, fill: 'rgb(var(--fg-muted))' }}
                stroke="rgb(var(--fg-muted))"
                axisLine={{ stroke: 'rgb(var(--border))' }}
                tickLine={false}
                tickFormatter={(r: string) => r.replace(' to ', ' a ')}
              />
              <YAxis stroke="rgb(var(--fg-muted))" tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: 'rgb(var(--surface-2))' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className={TOOLTIP_BOX}>
                        <p className="font-mono text-fg">{String(data.range).replace(' to ', ' a ')}</p>
                        <p className="text-fg-muted">
                          <span className="font-mono tabular-nums text-fg">{data.count}</span> partidas
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {eloChangeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

export default RatingTab;
