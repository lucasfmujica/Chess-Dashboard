type Color = 'W' | 'B' | 'white' | 'black';

const isWhite = (c: Color) => c === 'W' || c === 'white';

interface PieceGlyphProps {
  color: Color;
  size?: number;
  className?: string;
}

/**
 * Small color swatch that replaces the ⚪ / ⚫ emoji used as data.
 * White = hairline ring on surface; Black = filled fg disc.
 */
export const PieceGlyph = ({ color, size = 12, className = '' }: PieceGlyphProps) => {
  const white = isWhite(color);
  return (
    <span
      role="img"
      aria-label={white ? 'White' : 'Black'}
      className={`inline-block rounded-full align-middle ${
        white ? 'bg-surface border border-fg-subtle' : 'bg-fg border border-fg'
      } ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

interface PieceLabelProps {
  color: Color;
  className?: string;
}

/** Swatch + "White"/"Black" text, for legends and toggles. */
export const PieceLabel = ({ color, className = '' }: PieceLabelProps) => (
  <span className={`inline-flex items-center gap-1.5 ${className}`}>
    <PieceGlyph color={color} />
    {isWhite(color) ? 'White' : 'Black'}
  </span>
);

interface ResultDotProps {
  tone: 'win' | 'draw' | 'loss';
  size?: number;
  className?: string;
}

const TONE_BG: Record<ResultDotProps['tone'], string> = {
  win: 'bg-win',
  draw: 'bg-draw',
  loss: 'bg-loss',
};

/** Solid result dot for legends / inline result markers. */
export const ResultDot = ({ tone, size = 8, className = '' }: ResultDotProps) => (
  <span
    className={`inline-block rounded-full align-middle ${TONE_BG[tone]} ${className}`}
    style={{ width: size, height: size }}
    aria-hidden="true"
  />
);

export default PieceGlyph;
