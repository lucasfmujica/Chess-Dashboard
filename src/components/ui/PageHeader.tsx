import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Small uppercase label above the title (usually the nav section). */
  eyebrow?: ReactNode;
  /** Right-aligned controls (filters, actions). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Planilla page header: section label, serif title, one line of context with
 * real numbers, actions on the right — closed by the thick 2px ink rule of a
 * FIDE scoresheet.
 */
export const PageHeader = ({ title, subtitle, eyebrow, actions, className = '' }: PageHeaderProps) => (
  <div
    className={`flex flex-wrap items-end justify-between gap-4 border-b-2 border-hairline-strong pb-4 ${className}`}
  >
    <div className="min-w-0">
      {eyebrow && <p className="text-label mb-1">{eyebrow}</p>}
      <h1 className="text-h1 text-fg">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

interface SectionHeadingProps {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** In-page section heading (serif text-h2), optionally with trailing actions. */
export const SectionHeading = ({ children, actions, className = '' }: SectionHeadingProps) => (
  <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
    <h2 className="text-h2 text-fg">{children}</h2>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export default PageHeader;
