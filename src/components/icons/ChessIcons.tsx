interface IconProps {
  className?: string;
}

/** Chess-specific glyphs with no heroicons equivalent. */

export const Swords = ({ className }: IconProps) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" /><line x1="13" y1="19" x2="19" y2="13" />
    <line x1="16" y1="16" x2="20" y2="20" /><line x1="19" y1="21" x2="21" y2="19" />
    <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" /><line x1="5" y1="14" x2="9" y2="18" />
    <line x1="7" y1="17" x2="4" y2="20" /><line x1="3" y1="19" x2="5" y2="21" />
  </svg>
);

/** Two facing pawns, for the "By Color" (White/Black games) nav item. */
export const ByColorPieces = ({ className }: IconProps) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7" cy="6" r="2" fill="currentColor" />
    <path d="M5 12l1-4h2l1 4" />
    <path d="M4.5 12h5l.5 6h-6z" />
    <circle cx="17" cy="6" r="2" />
    <path d="M15 12l1-4h2l1 4" />
    <path d="M14.5 12h5l.5 6h-6z" />
  </svg>
);
