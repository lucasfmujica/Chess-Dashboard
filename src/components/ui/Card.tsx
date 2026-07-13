import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds hover affordance (border brightens) — use for interactive cards. */
  interactive?: boolean;
  /** Removes default padding so callers can lay out their own sections. */
  flush?: boolean;
}

/** Flat surface card: hairline border, no shadow (Linear/Vercel style). */
export const Card = ({ interactive, flush, className = '', children, ...rest }: CardProps) => (
  <div
    className={`rounded-lg border border-hairline bg-surface ${flush ? '' : 'p-5'} ${
      interactive ? 'transition-colors hover:border-fg-subtle/40' : ''
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

/** Consistent card header: h3 title, muted subtitle, optional actions. */
export const CardHeader = ({ title, subtitle, actions, className = '' }: CardHeaderProps) => (
  <div className={`flex items-start justify-between gap-3 ${className}`}>
    <div>
      <h3 className="text-h3 text-fg">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-fg-muted">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

export default Card;
