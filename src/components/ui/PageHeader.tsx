import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned controls (filters, actions). */
  actions?: ReactNode;
  className?: string;
}

/** Page-level header using the shared type scale (text-h1). */
export const PageHeader = ({ title, subtitle, actions, className = '' }: PageHeaderProps) => (
  <div className={`flex flex-wrap items-start justify-between gap-4 ${className}`}>
    <div>
      <h1 className="text-h1 text-fg">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

interface SectionHeadingProps {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** In-page section heading (text-h2), optionally with trailing actions. */
export const SectionHeading = ({ children, actions, className = '' }: SectionHeadingProps) => (
  <div className={`flex items-center justify-between gap-3 ${className}`}>
    <h2 className="text-h2 text-fg">{children}</h2>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

export default PageHeader;
