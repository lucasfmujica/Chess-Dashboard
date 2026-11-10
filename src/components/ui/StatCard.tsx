import type { ComponentType, ReactNode } from 'react';

type Trend = 'up' | 'down';

interface StatCardProps {
  title: ReactNode;
  value: ReactNode;
  subtitle?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  trend?: Trend;
  /** Optional series rendered as a small sparkline under the value. */
  trendData?: number[];
  className?: string;
}

/** Tiny inline SVG sparkline (no chart library): pen ink when it rises, loss when it falls. */
export const Sparkline = ({ data }: { data: number[] }) => {
  if (data.length < 2) return null;
  const W = 120;
  const H = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - 2 - ((v - min) / span) * (H - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const stroke = data[data.length - 1] >= data[0] ? 'rgb(var(--accent))' : 'rgb(var(--loss))';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-2 h-7 w-full" aria-hidden="true">
      <line x1="0" y1={H - 1} x2={W} y2={H - 1} stroke="rgb(var(--border))" strokeWidth={1} />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

/**
 * Planilla metric: a cell of the scoresheet header. Paper, a thick ink rule on
 * top, the number in mono ink, the delta in win/loss. Only for things that
 * are measured. Several in a row go inside one <ClockBar>.
 */
const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendData, className = '' }: StatCardProps) => (
  <div
    className={`flex min-w-0 flex-col gap-1 rounded-sm border border-hairline border-t-[3px] border-t-hairline-strong bg-surface px-5 py-4 ${className}`}
  >
    <div className="flex items-start justify-between gap-3">
      <p className="text-label !text-fg-muted">{title}</p>
      {Icon && <Icon className="h-4 w-4 text-fg-subtle" />}
    </div>
    <div className="flex items-baseline gap-2">
      <p className="font-mono text-[32px] font-medium leading-10 tracking-tight tabular-nums text-fg sm:text-4xl">{value}</p>
      {trend && (
        <span className={`font-mono text-sm ${trend === 'up' ? 'text-win' : 'text-loss'}`} aria-label={trend === 'up' ? 'Sube' : 'Baja'}>
          {trend === 'up' ? '▲' : '▼'}
        </span>
      )}
    </div>
    {subtitle && <p className="text-xs leading-4 text-fg-subtle">{subtitle}</p>}
    {trendData && <Sparkline data={trendData} />}
  </div>
);

interface ClockBarProps {
  children: ReactNode;
  className?: string;
}

/**
 * The metrics header of a view: several StatCards joined into one ruled
 * strip, like the header block of a FIDE scoresheet. One per view, on top.
 */
export const ClockBar = ({ children, className = '' }: ClockBarProps) => (
  <section
    className={`grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] overflow-hidden rounded-sm border border-hairline border-t-[3px] border-t-hairline-strong bg-surface [&>*]:rounded-none [&>*]:border-0 [&>*]:shadow-[inset_1px_0_0_rgb(var(--border))] ${className}`}
  >
    {children}
  </section>
);

export default StatCard;
