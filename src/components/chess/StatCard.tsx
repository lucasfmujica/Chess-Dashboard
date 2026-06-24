import type { ComponentType, ReactNode } from 'react';

type Trend = 'up' | 'down';

interface StatCardProps {
  title: ReactNode;
  value: ReactNode;
  subtitle?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  trend?: Trend;
}

/**
 * Minimal, flat stat tile (Linear/Vercel style): hairline border, no shadow
 * or gradient, prominent tabular value, muted label.
 */
const StatCard = ({ title, value, subtitle, icon: Icon, trend }: StatCardProps) => {
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
    </div>
  );
};

export default StatCard;
