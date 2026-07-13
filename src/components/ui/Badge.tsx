import type { ReactNode } from 'react';

type Tone = 'neutral' | 'accent' | 'win' | 'draw' | 'loss';

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-fg-muted border-hairline',
  accent: 'bg-accent-soft/12 text-accent border-accent-soft/20',
  win: 'bg-win/12 text-win border-win/20',
  draw: 'bg-draw/12 text-draw border-draw/20',
  loss: 'bg-loss/12 text-loss border-loss/20',
};

/** Small status pill. Result tones (win/draw/loss) share the app's color language. */
const Badge = ({ tone = 'neutral', children, className = '' }: BadgeProps) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${TONES[tone]} ${className}`}
  >
    {children}
  </span>
);

/** Maps a game result ('1-0','0-1','½-½' / 'W','D','L') to a badge tone. */
export const resultTone = (result: string): Tone => {
  const r = result.toLowerCase();
  if (r === 'w' || r === '1' || r === '1-0' || r === 'win') return 'win';
  if (r === 'l' || r === '0' || r === '0-1' || r === 'loss') return 'loss';
  return 'draw';
};

export default Badge;
