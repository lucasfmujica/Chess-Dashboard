import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardHeader, Table, THead, TBody, TR, TH, TD } from '../../../ui';

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

interface TournamentComparisonProps {
  tournamentComparison: TournamentComparisonEntry[];
}

const TOOLTIP_STYLE = {
  backgroundColor: 'rgb(var(--surface))',
  border: '1px solid rgb(var(--border))',
  borderRadius: '4px',
  color: 'rgb(var(--fg))',
  fontSize: '13px',
};

const deltaClass = (n: number) => (n > 0 ? '!text-win' : n < 0 ? '!text-loss' : '');
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

const TournamentComparison = ({ tournamentComparison }: TournamentComparisonProps) => {
  // Over real events only. Online play is one 400-game bucket whose rating
  // is on a different scale entirely, so including it would just mean this
  // number always reports Lichess.
  const bestPerformance = Math.max(
    0,
    ...tournamentComparison.filter(t => t.otb !== false).map(t => t.performance || 0)
  );

  return (
    <Card>
      <CardHeader title="Torneo contra torneo" subtitle="Tu rendimiento en cada torneo válido para ELO" />

      <dl className="mt-5 grid grid-cols-2 divide-x divide-hairline rounded border border-hairline">
        <div className="p-4">
          <dt className="text-label">Torneos</dt>
          <dd className="mt-1 font-mono text-3xl tabular-nums text-fg">{tournamentComparison.length}</dd>
        </div>
        <div className="p-4">
          <dt className="text-label">Mejor rendimiento</dt>
          <dd className="mt-1 font-mono text-3xl tabular-nums text-fg">{bestPerformance}</dd>
        </div>
      </dl>

      <div className="mt-6">
        <Table>
          <THead>
            <tr>
              <TH>Torneo</TH>
              <TH align="right">Partidas</TH>
              <TH align="right">Puntos %</TH>
              <TH align="right">Tu ELO</TH>
              <TH align="right">Rival prom.</TH>
              <TH align="right">Rendimiento</TH>
              <TH align="right">Δ ELO</TH>
            </tr>
          </THead>
          <TBody>
            {tournamentComparison.map((t, idx) => (
              <TR key={idx}>
                <TD className="whitespace-nowrap font-medium">{t.name}</TD>
                <TD align="right" muted className="font-mono">{t.games}</TD>
                <TD align="right" className={`font-mono ${t.score >= 50 ? '!text-win' : '!text-loss'}`}>{t.score}%</TD>
                <TD align="right" className="font-mono">{t.playerElo}</TD>
                <TD align="right" muted className="font-mono">{t.avgOppElo}</TD>
                <TD align="right" className={`font-mono ${deltaClass((t.performance ?? t.playerElo) - t.playerElo)}`}>
                  {t.performance || '—'}
                </TD>
                <TD align="right" className={`font-mono ${deltaClass(t.eloChange)}`}>{signed(t.eloChange)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>

      <div className="mt-6 border-t border-hairline pt-5">
        <h4 className="mb-4 text-label">Rendimiento por torneo</h4>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={tournamentComparison}>
            <CartesianGrid stroke="rgb(var(--border))" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="rgb(var(--fg-muted))"
              tick={{ fontSize: 11, fill: 'rgb(var(--fg-muted))' }}
              axisLine={{ stroke: 'rgb(var(--border))' }}
              tickLine={false}
              angle={-15}
              textAnchor="end"
              height={80}
            />
            <YAxis stroke="rgb(var(--fg-muted))" domain={[1600, 2100]} tick={{ fontSize: 12, fill: 'rgb(var(--fg-muted))' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend iconType="plainline" wrapperStyle={{ paddingTop: '16px', fontSize: '12px', color: 'rgb(var(--fg-muted))' }} />
            <Line
              type="monotone"
              dataKey="playerElo"
              stroke="rgb(var(--cat-1))"
              name="Tu ELO"
              strokeWidth={2}
              dot={{ fill: 'rgb(var(--cat-1))', r: 3, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="avgOppElo"
              stroke="rgb(var(--fg-muted))"
              name="Rival promedio"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={{ fill: 'rgb(var(--fg-muted))', r: 2.5, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="performance"
              stroke="rgb(var(--cat-2))"
              name="Rendimiento"
              strokeWidth={2}
              connectNulls
              dot={{ fill: 'rgb(var(--cat-2))', r: 3, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default TournamentComparison;
