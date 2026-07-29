import type { RepertoireLine } from '../types/chess';

/**
 * Match played games against prepared repertoire lines by longest common
 * move prefix.
 *
 * Confidence on a repertoire line is set by hand, so "which chapters are
 * shaky" has only ever been a feeling. Linking games to lines replaces that
 * with the ply each game actually left book, which is a fact.
 */

/** Result tokens and NAGs that appear in movetext but aren't moves. */
const NON_MOVE = /^(1-0|0-1|1\/2-1\/2|\*|\$\d+)$/;

/**
 * Tokenize a movetext string ('1.d4 Nf6 2.c4 c5') into bare SAN moves.
 * Handles both '1.d4' and '1. d4' spacing, and strips check/mate marks and
 * annotation glyphs so 'Qxc3+' and 'Qxc3' compare equal.
 */
export const tokenizeMovesSan = (movesSan?: string | null): string[] => {
  if (!movesSan) return [];
  return movesSan
    .replace(/\{[^}]*\}/g, ' ') // comments
    .replace(/\d+\.(\.\.)?/g, ' ') // move numbers, incl. black's '12...'
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token && !NON_MOVE.test(token))
    .map(normalizeSan);
};

/**
 * Strip decoration that doesn't change which move was played. Check and mate
 * marks are implied by the position, and !/? glyphs are commentary — leaving
 * them in would make an annotated repertoire line fail to match the same
 * move played in a game.
 */
export const normalizeSan = (san: string): string => san.replace(/[+#!?]+$/g, '');

/** Number of leading moves two sequences share. */
export const commonPrefixLength = (a: string[], b: string[]): number => {
  const limit = Math.min(a.length, b.length);
  let i = 0;
  while (i < limit && a[i] === b[i]) i += 1;
  return i;
};

export interface RepertoireMatch {
  lineId: string;
  /**
   * Ply at which the game left the prepared line — i.e. how many moves were
   * followed. Equal to the line's length when the whole line was played out.
   */
  exitPly: number;
}

/**
 * A prefix this short is shared by every line of an opening ('1.e4 c5'), so
 * matching on it would assign essentially arbitrary lines to every game.
 */
export const MIN_MATCH_PLIES = 4;

/**
 * Best-matching prepared line for one game's moves, or null.
 *
 * Only lines for the colour the player had are considered: a line prepared
 * for Black says nothing about a game played as White, even if the moves
 * happen to coincide.
 */
export const matchRepertoireLine = (
  gameSans: string[],
  color: 'W' | 'B',
  lines: RepertoireLine[]
): RepertoireMatch | null => {
  if (gameSans.length === 0) return null;
  const normalized = gameSans.map(normalizeSan);

  let best: RepertoireMatch | null = null;
  for (const line of lines) {
    if (line.color !== color) continue;
    const lineSans = tokenizeMovesSan(line.movesSan);
    if (lineSans.length === 0) continue;
    const depth = commonPrefixLength(normalized, lineSans);
    if (depth < MIN_MATCH_PLIES) continue;
    if (!best || depth > best.exitPly) {
      best = { lineId: line.id, exitPly: depth };
    }
  }
  return best;
};
