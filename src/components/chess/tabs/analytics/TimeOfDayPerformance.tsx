import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardHeader, Badge, Table, THead, TBody, TR, TH, TD } from '../../../ui';

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

interface TimeOfDayPerformanceProps {
  timeOfDayStats: TimeOfDayStat[];
}

const TOOLTIP_STYLE = {
  backgroundColor: 'rgb(var(--surface))',
  border: '1px solid rgb(var(--border))',
  borderRadius: '4px',
  color: 'rgb(var(--fg))',
  fontSize: '13px',
};

const TimeOfDayPerformance = ({ timeOfDayStats }: TimeOfDayPerformanceProps) => {
  return (
    <Card>
      <CardHeader title="Rendimiento por horario" subtitle="En qué franja del día jugás mejor" />

      {/* Top three slots */}
      <div className="mt-5 grid grid-cols-1 divide-y divide-hairline rounded border border-hairline md:grid-cols-3 md:divide-x md:divide-y-0">
        {timeOfDayStats.slice(0, 3).map((slot, idx) => (
          <div key={idx} className="p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-label">{slot.time}</span>
              {idx === 0 && <Badge tone="accent">Mejor franja</Badge>}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl tabular-nums text-fg">{slot.score}%</span>
              <span className="text-sm text-fg-muted">de los puntos</span>
            </div>
            <p className="mt-1 font-mono text-xs tabular-nums text-fg-muted">
              + {slot.wins} · = {slot.draws} · − {slot.losses}
              <span className="ml-2 font-sans text-fg-subtle">({slot.total} partidas)</span>
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Table>
          <THead>
            <tr>
              <TH>Franja</TH>
              <TH align="right">Partidas</TH>
              <TH align="right">+</TH>
              <TH align="right">=</TH>
              <TH align="right">−</TH>
              <TH align="right">Puntos %</TH>
              <TH align="right">Victorias %</TH>
            </tr>
          </THead>
          <TBody>
            {timeOfDayStats.map((slot, idx) => (
              <TR key={idx}>
                <TD className="font-medium">{slot.time}</TD>
                <TD align="right" muted className="font-mono">{slot.total}</TD>
                <TD align="right" className="font-mono">{slot.wins}</TD>
                <TD align="right" className="font-mono">{slot.draws}</TD>
                <TD align="right" className="font-mono">{slot.losses}</TD>
                <TD align="right" className="font-mono">{slot.score}%</TD>
                <TD
                  align="right"
                  className={`font-mono ${parseFloat(slot.winRate) >= 50 ? '!text-win' : '!text-loss'}`}
                >
                  {slot.winRate}%
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>

      <div className="mt-6 border-t border-hairline pt-5">
        <h4 className="mb-4 text-label">Resultados por franja</h4>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={timeOfDayStats}>
            <CartesianGrid stroke="rgb(var(--border))" vertical={false} />
            <XAxis dataKey="time" stroke="rgb(var(--fg-muted))" tick={{ fontSize: 12, fill: 'rgb(var(--fg-muted))' }} axisLine={{ stroke: 'rgb(var(--border))' }} tickLine={false} />
            <YAxis stroke="rgb(var(--fg-muted))" tick={{ fontSize: 12, fill: 'rgb(var(--fg-muted))' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgb(var(--surface-2))' }} />
            <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px', color: 'rgb(var(--fg-muted))' }} />
            <Bar dataKey="wins" fill="rgb(var(--win))" name="Victorias" radius={[2, 2, 0, 0]} />
            <Bar dataKey="draws" fill="rgb(var(--draw))" name="Tablas" radius={[2, 2, 0, 0]} />
            <Bar dataKey="losses" fill="rgb(var(--loss))" name="Derrotas" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default TimeOfDayPerformance;
