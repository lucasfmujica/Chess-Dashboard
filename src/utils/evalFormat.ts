/** White-relative win percentage from a centipawn eval (logistic curve, matches Lichess's formula). */
export const winPct = (cp: number): number => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);

/** Format a centipawn eval as a short signed string, e.g. "+1.2" or "-#" for mate. */
export const formatEval = (cp: number): string => {
  if (Math.abs(cp) >= 9000) return cp > 0 ? '#' : '-#';
  const v = cp / 100;
  return (v > 0 ? '+' : '') + v.toFixed(1);
};
