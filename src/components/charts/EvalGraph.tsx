import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface EvalGraphProps {
  /** White-normalized centipawns per position (index 0 = start). */
  evals: number[];
  ply: number;
  onSelect: (ply: number) => void;
}

const CLAMP = 600; // ±6 pawns for display

/** Whole-game evaluation curve; click to jump to a move. */
const EvalGraph = ({ evals, ply, onSelect }: EvalGraphProps) => {
  const data = evals.map((cp, i) => ({ ply: i, eval: Math.max(-CLAMP, Math.min(CLAMP, cp)) / 100 }));

  return (
    <div className="rounded-lg border border-hairline bg-surface p-3">
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart
          data={data}
          margin={{ top: 6, right: 6, bottom: 0, left: 0 }}
          onClick={(e) => {
            const label = (e as { activeLabel?: number | string })?.activeLabel;
            if (label !== undefined && label !== null) onSelect(Number(label));
          }}
        >
          <defs>
            <linearGradient id="evalFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity={0.35} />
              <stop offset="50%" stopColor="rgb(var(--accent))" stopOpacity={0.05} />
              <stop offset="100%" stopColor="rgb(var(--loss))" stopOpacity={0.18} />
            </linearGradient>
          </defs>
          <XAxis dataKey="ply" hide />
          <YAxis domain={[-6, 6]} hide />
          <ReferenceLine y={0} stroke="rgb(var(--border))" />
          <ReferenceLine x={ply} stroke="rgb(var(--accent))" strokeWidth={1.5} />
          <Tooltip
            cursor={{ stroke: 'rgb(var(--border))' }}
            formatter={(v) => {
              const n = Number(v);
              return [`${n > 0 ? '+' : ''}${n.toFixed(1)}`, 'Eval'];
            }}
            labelFormatter={(l) => `Move ${Math.ceil(Number(l) / 2)}`}
          />
          <Area type="monotone" dataKey="eval" stroke="rgb(var(--accent))" strokeWidth={1.5} fill="url(#evalFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EvalGraph;
