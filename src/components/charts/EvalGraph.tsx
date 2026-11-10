import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface EvalGraphProps {
  /** White-normalized centipawns per position (index 0 = start). */
  evals: number[];
  ply: number;
  onSelect: (ply: number) => void;
}

const CLAMP = 600; // ±6 pawns for display

const TOOLTIP_STYLE = {
  background: 'rgb(var(--surface))',
  border: '1px solid rgb(var(--border))',
  borderRadius: 4,
  fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
  fontSize: 12,
  color: 'rgb(var(--fg))',
};

/** Whole-game evaluation curve; click to jump to a move. */
const EvalGraph = ({ evals, ply, onSelect }: EvalGraphProps) => {
  const data = evals.map((cp, i) => ({ ply: i, eval: Math.max(-CLAMP, Math.min(CLAMP, cp)) / 100 }));

  return (
    <section className="rounded border border-hairline bg-surface px-4 pb-3 pt-3" aria-label="Curva de evaluación">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="text-label">Evaluación</span>
        <span className="text-xs text-fg-subtle">desde Blancas · tocá para ir a la jugada</span>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart
          data={data}
          margin={{ top: 6, right: 6, bottom: 0, left: 0 }}
          onClick={(e) => {
            const label = (e as { activeLabel?: number | string })?.activeLabel;
            if (label !== undefined && label !== null) onSelect(Number(label));
          }}
        >
          <XAxis dataKey="ply" hide />
          <YAxis domain={[-6, 6]} hide />
          <ReferenceLine y={0} stroke="rgb(var(--border-strong))" />
          <ReferenceLine x={ply} stroke="rgb(var(--fg))" strokeWidth={1.5} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ stroke: 'rgb(var(--border))' }}
            formatter={(v) => {
              const n = Number(v);
              return [`${n > 0 ? '+' : ''}${n.toFixed(1)}`, 'Evaluación'];
            }}
            labelFormatter={(l) => `Jugada ${Math.max(1, Math.ceil(Number(l) / 2))}`}
          />
          <Area
            type="monotone"
            dataKey="eval"
            stroke="rgb(var(--accent))"
            strokeWidth={1.5}
            fill="rgb(var(--accent))"
            fillOpacity={0.12}
          />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
};

export default EvalGraph;
