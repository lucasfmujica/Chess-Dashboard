/**
 * The Jaque+ mark: a king whose crown cross is the "+" a scoresheet uses for
 * check — the king in check. Ink body, pen cross. Mirrors public/favicon.svg.
 */
export const LogoMark = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
    <path
      d="M24 58h16l-2-6h-12zM22 50h20c0-6 6-10 6-18 0-6-5-10-10-10h-12c-5 0-10 4-10 10 0 8 6 12 6 18z"
      fill="currentColor"
    />
    <path d="M32 2v18M23 11h18" stroke="rgb(var(--accent))" strokeWidth="5" />
  </svg>
);

export default LogoMark;
