import type { ReactNode } from 'react';

type Tone = 'neutral' | 'accent' | 'win' | 'draw' | 'loss' | 'today' | 'alert';

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

/**
 * Planilla "Tag": a short label on paper, near-square. `accent` = belongs to
 * the player (pen), `today` = carbon yellow, `alert` = carbon pink. Result
 * tones keep their text in the semantic colour, which reads ≥4.5:1 on its own
 * tint in both themes.
 */
const TONES: Record<Tone, string> = {
  neutral: 'bg-surface text-fg-muted border-hairline',
  accent: 'bg-accent/10 text-accent border-transparent',
  win: 'bg-win/10 text-win border-transparent',
  draw: 'bg-draw/10 text-fg-muted border-transparent',
  loss: 'bg-loss/10 text-loss border-transparent',
  today: 'bg-carbon text-fg border-transparent',
  alert: 'bg-carbon-pink text-fg border-transparent',
};

/** Small status label. Result tones (win/draw/loss) share the app's color language. */
const Badge = ({ tone = 'neutral', children, className = '' }: BadgeProps) => (
  <span
    className={`inline-flex items-center gap-1 whitespace-nowrap rounded-sm border px-2 py-0.5 text-xs font-medium ${TONES[tone]} ${className}`}
  >
    {children}
  </span>
);

/** Maps a game result ('1-0','0-1','½-½' / 'W','D','L') to a badge tone. */
export const resultTone = (result: string): Exclude<Tone, 'neutral' | 'accent' | 'today' | 'alert'> => {
  const r = result.toLowerCase();
  if (r === 'w' || r === '1' || r === '1-0' || r === 'win') return 'win';
  if (r === 'l' || r === '0' || r === '0-1' || r === 'loss') return 'loss';
  return 'draw';
};

export default Badge;
