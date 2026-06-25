interface ResultsDonutProps {
  wins: number;
  draws: number;
  losses: number;
}

/**
 * Win/draw/loss donut rendered with a CSS conic-gradient (always a full ring,
 * theme-aware via tokens) plus a centered total and a legend.
 */
const ResultsDonut = ({ wins, draws, losses }: ResultsDonutProps) => {
  const total = wins + draws + losses;
  const wEnd = total ? (wins / total) * 360 : 0;
  const dEnd = total ? wEnd + (draws / total) * 360 : 0;
  const gradient = total
    ? `conic-gradient(rgb(var(--win)) 0deg ${wEnd}deg, rgb(var(--draw)) ${wEnd}deg ${dEnd}deg, rgb(var(--loss)) ${dEnd}deg 360deg)`
    : 'rgb(var(--border))';

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 184, height: 184 }}>
        <div className="absolute inset-0 rounded-full" style={{ background: gradient }} />
        <div className="absolute rounded-full bg-surface flex flex-col items-center justify-center" style={{ inset: 30 }}>
          <span className="text-3xl font-semibold tabular-nums text-fg">{total}</span>
          <span className="text-xs text-fg-muted">games</span>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-win" />Wins <span className="font-semibold tabular-nums text-fg">{wins}</span></span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-draw" />Draws <span className="font-semibold tabular-nums text-fg">{draws}</span></span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-loss" />Losses <span className="font-semibold tabular-nums text-fg">{losses}</span></span>
      </div>
    </div>
  );
};

export default ResultsDonut;
