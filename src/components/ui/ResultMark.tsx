type Result = 'W' | 'D' | 'L' | 'win' | 'draw' | 'loss';

const NORM: Record<Result, 'win' | 'draw' | 'loss'> = { W: 'win', D: 'draw', L: 'loss', win: 'win', draw: 'draw', loss: 'loss' };
const SYMBOL = { win: '1', draw: '½', loss: '0' } as const;
const LABEL = { win: 'Victoria', draw: 'Tablas', loss: 'Derrota' } as const;
const FILLED = { win: 'bg-win text-surface', draw: 'bg-draw text-surface', loss: 'bg-loss text-surface' } as const;
const OUTLINE = { win: 'border border-current text-win', draw: 'border border-current text-draw', loss: 'border border-current text-loss' } as const;

/**
 * A game result the way an arbiter writes it: 1, ½ or 0 in a small square.
 * Always the symbol, never colour alone (win and loss share luminance).
 */
const ResultMark = ({ result, outline = false, className = '' }: { result: Result; outline?: boolean; className?: string }) => {
  const r = NORM[result];
  return (
    <span
      role="img"
      aria-label={LABEL[r]}
      className={`inline-grid h-[22px] w-[22px] shrink-0 place-items-center rounded-sm font-mono text-[13px] font-medium leading-none ${outline ? OUTLINE[r] : FILLED[r]} ${className}`}
    >
      {SYMBOL[r]}
    </span>
  );
};

export default ResultMark;
