/**
 * Comparing the same player's name across sources.
 *
 * The same person is written three ways in this project's data: chess-results
 * uses "Medina, Exequiel Alexis", hand-entered games use "Exequiel Medina",
 * and a PGN might use either. Two things vary independently — the order of the
 * parts, and whether middle names survived — so equality on the token set is
 * not enough: it rejects every abbreviated entry.
 */

/** Order-independent, accent-independent name tokens. */
export const nameTokens = (name: string): string[] =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/**
 * Whether two spellings plausibly name the same player.
 *
 * True when one name's tokens are a subset of the other's, so a dropped middle
 * name still matches. Requires at least two shared tokens, which is what keeps
 * this from collapsing everyone who shares a surname: "Borras, Jonathan" and
 * "Borras, Anibal" are two real opponents in this data, one token apart.
 *
 * Deliberately not used to write anything on its own — it proposes a pairing
 * for the user to confirm.
 */
export const samePlayer = (a: string, b: string): boolean => {
  const left = new Set(nameTokens(a));
  const right = new Set(nameTokens(b));
  if (left.size === 0 || right.size === 0) return false;

  const [small, large] = left.size <= right.size ? [left, right] : [right, left];
  for (const token of small) {
    if (!large.has(token)) return false;
  }
  // A single shared token is a surname collision, not a match — unless that is
  // genuinely the whole of both names (a one-word alias or a Lichess handle).
  return small.size >= 2 || (left.size === 1 && right.size === 1);
};
