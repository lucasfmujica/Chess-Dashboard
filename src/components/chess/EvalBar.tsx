/**
 * Stockfish's opinion of the position, as a bar.
 *
 * Always drawn from the **solver's** perspective, not White's: a puzzle where
 * you are Black should fill upwards when you are winning. A bar that flips
 * meaning depending on the puzzle's colour is worse than no bar.
 */

import type { PositionEval } from '../../engine/stockfishEngine';

interface EvalBarProps {
  /** Engine score for the position, from the side-to-move's perspective. */
  evaluation: PositionEval | null;
  /** True when the score belongs to the solver's opponent and must be negated. */
  flip?: boolean;
  loading?: boolean;
}

/** Centipawns at which the bar is considered fully won — beyond this it saturates. */
const CLAMP_CP = 800;

const label = (cp: number | undefined, mate: number | undefined): string => {
  if (mate !== undefined) return mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`;
  if (cp === undefined) return '—';
  const pawns = cp / 100;
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(1)}`;
};

const EvalBar = ({ evaluation, flip = false, loading = false }: EvalBarProps) => {
  const sign = flip ? -1 : 1;
  const cp = evaluation?.cp === undefined ? undefined : evaluation.cp * sign;
  const mate = evaluation?.mate === undefined ? undefined : evaluation.mate * sign;

  // Mate saturates the bar; otherwise clamp so a +9 doesn't look the same as a
  // forced win but also doesn't need a logarithmic scale to stay readable.
  const raw = mate !== undefined ? (mate > 0 ? CLAMP_CP : -CLAMP_CP) : (cp ?? 0);
  const pct = 50 + (Math.max(-CLAMP_CP, Math.min(CLAMP_CP, raw)) / CLAMP_CP) * 50;
  const known = evaluation && (cp !== undefined || mate !== undefined);

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            !known ? 'bg-fg-subtle/30' : raw >= 0 ? 'bg-win' : 'bg-loss'
          }`}
          style={{ width: `${known ? pct : 50}%` }}
        />
      </div>
      <span className="nums w-14 shrink-0 text-right text-xs text-fg-muted">
        {loading && !known ? '…' : label(cp, mate)}
      </span>
    </div>
  );
};

export default EvalBar;
