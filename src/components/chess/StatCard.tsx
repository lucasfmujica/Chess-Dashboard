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
}

/** Tiny inline SVG sparkline (no chart library); colored by its own direction. */
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
      const y = H - ((v - min) / span) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const stroke = data[data.length - 1] >= data[0] ? 'rgb(var(--accent))' : 'rgb(var(--loss))';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-2 w-full h-7" aria-hidden="true">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

/**
 * Minimal, flat stat tile (Linear/Vercel style): hairline border, no shadow
 * or gradient, prominent tabular value, muted label.
 */
const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendData }: StatCardProps) => {
  return (
    <div className="rounded-lg border border-hairline bg-surface p-5 transition-colors hover:border-fg-subtle/40">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{title}</p>
        {Icon && <Icon className="w-4 h-4 text-fg-subtle" />}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <p className="text-2xl font-semibold tracking-tight tabular-nums text-fg">{value}</p>
        {trend && (
          <span
            className={`inline-flex items-center ${trend === 'up' ? 'text-win' : 'text-loss'}`}
            aria-hidden="true"
          >
            {trend === 'up' ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-fg-muted">{subtitle}</p>}
      {trendData && <Sparkline data={trendData} />}
    </div>
  );
};

export default StatCard;
