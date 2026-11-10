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

/** Tiny inline SVG sparkline (no chart library), drawn in the clock's lit digit. */
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
  const stroke = data[data.length - 1] >= data[0] ? 'rgb(var(--clock-lit))' : 'rgb(var(--clock-flag))';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-2 h-7 w-full" aria-hidden="true">
      <line x1="0" y1={H - 1} x2={W} y2={H - 1} stroke="rgb(var(--clock-2))" strokeWidth={1} />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

/**
 * Planilla "Clock": the instrument panel, like the display of a digital chess
 * clock. Dark in both themes, big monospaced number, delta in the lit digit
 * (up) or the fallen flag (down). Only for things that are measured.
 * Several in a row read best inside a <ClockBar>.
 */
const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendData, className = '' }: StatCardProps) => (
  <div className={`flex min-w-0 flex-col gap-1.5 rounded-2xl bg-clock p-5 text-clock-fg ${className}`}>
    <div className="flex items-start justify-between gap-3">
      <p className="text-[11px] font-semibold uppercase leading-tight tracking-[0.08em] text-clock-muted">{title}</p>
      {Icon && <Icon className="h-4 w-4 text-clock-muted" />}
    </div>
    <div className="flex items-baseline gap-2">
      <p className="font-mono text-[32px] font-medium leading-none tracking-tight tabular-nums text-clock-fg sm:text-4xl">{value}</p>
      {trend && (
        <span className={`font-mono text-sm ${trend === 'up' ? 'text-clock-lit' : 'text-clock-flag'}`} aria-label={trend === 'up' ? 'Sube' : 'Baja'}>
          {trend === 'up' ? '▲' : '▼'}
        </span>
      )}
    </div>
    {subtitle && <p className="text-xs leading-4 text-clock-muted">{subtitle}</p>}
    {trendData && <Sparkline data={trendData} />}
  </div>
);

interface ClockBarProps {
  children: ReactNode;
  className?: string;
}

/**
 * Joins several clock panels into one instrument, the way the clock sits
 * beside the board. One per view, at the top.
 */
export const ClockBar = ({ children, className = '' }: ClockBarProps) => (
  <section
    className={`grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] overflow-hidden rounded-2xl bg-clock [&>*]:rounded-none [&>*+*]:shadow-[inset_1px_0_0_rgb(var(--clock-2))] ${className}`}
  >
    {children}
  </section>
);

export default StatCard;
