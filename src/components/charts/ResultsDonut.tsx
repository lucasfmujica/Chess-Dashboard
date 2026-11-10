import ResultMark from '../ui/ResultMark';

interface ResultsDonutProps {
  wins: number;
  draws: number;
  losses: number;
}

/**
 * Win/draw/loss ring: hard-stop conic segments in the win / draw / loss
 * tokens, the total in the middle and a 1 / ½ / 0 legend.
 */
const ResultsDonut = ({ wins, draws, losses }: ResultsDonutProps) => {
  const total = wins + draws + losses;
  const wEnd = total ? (wins / total) * 360 : 0;
  const dEnd = total ? wEnd + (draws / total) * 360 : 0;
  const ring = total
    ? `conic-gradient(rgb(var(--win)) 0deg ${wEnd}deg, rgb(var(--draw)) ${wEnd}deg ${dEnd}deg, rgb(var(--loss)) ${dEnd}deg 360deg)`
    : 'rgb(var(--surface-2))';

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative"
        style={{ width: 184, height: 184 }}
        role="img"
        aria-label={`${total} partidas: ${wins} victorias, ${draws} tablas, ${losses} derrotas`}
      >
        <div className="absolute inset-0 rounded-full" style={{ background: ring }} />
        <div className="absolute flex flex-col items-center justify-center rounded-full bg-surface" style={{ inset: 26 }}>
          <span className="font-mono text-3xl font-medium tabular-nums text-fg">{total}</span>
          <span className="text-label">partidas</span>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-fg-muted">
        <span className="flex items-center gap-1.5"><ResultMark result="W" />Victorias <span className="font-mono tabular-nums text-fg">{wins}</span></span>
        <span className="flex items-center gap-1.5"><ResultMark result="D" />Tablas <span className="font-mono tabular-nums text-fg">{draws}</span></span>
        <span className="flex items-center gap-1.5"><ResultMark result="L" />Derrotas <span className="font-mono tabular-nums text-fg">{losses}</span></span>
      </div>
    </div>
  );
};

export default ResultsDonut;
