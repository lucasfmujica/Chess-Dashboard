import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds hover affordance (border darkens) — use for interactive cards. */
  interactive?: boolean;
  /** Removes default padding so callers can lay out their own sections. */
  flush?: boolean;
}

/**
 * Planilla "Sheet": the paper surface. Everything you read or study lives on
 * one. Ruled hairline border, near-square corners, a 1px bottom shadow like a
 * sheet resting on the desk. Never nest a Card inside a Card — separate with
 * a rule instead.
 */
export const Card = ({ interactive, flush, className = '', children, ...rest }: CardProps) => (
  <div
    className={`min-w-0 rounded border border-hairline bg-surface shadow-[0_1px_0_rgb(var(--fg)/0.06)] ${flush ? '' : 'p-5 sm:p-6'} ${
      interactive ? 'transition-colors hover:border-fg-subtle/60' : ''
    } ${className}`}
    {...rest}
  >
    {children}
  </div>
);

interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned actions (buttons, toggles, filters). */
  actions?: ReactNode;
  className?: string;
}

/** Sheet header: serif title, muted metadata, optional actions. */
export const CardHeader = ({ title, subtitle, actions, className = '' }: CardHeaderProps) => (
  <div className={`flex flex-wrap items-start justify-between gap-3 ${className}`}>
    <div className="min-w-0">
      <h3 className="font-serif text-xl font-semibold leading-tight text-fg text-balance">{title}</h3>
      {subtitle && <p className="mt-1 text-xs text-fg-subtle">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export default Card;
