import { parsePgn } from '../hooks/useGameReplay';
import { matchRepertoireLine } from './repertoireMatch';
import type { Game, RepertoireLine } from '../types/chess';

/**
 * Runs the repertoire matcher over a batch of games.
 *
 * Split out of RepertoireMatchPanel so the same code can run from a Node
 * backfill script and straight after an import, not only when someone opens
 * the Repertorio tab and presses a button. Every game in the database had a
 * null `repertoire_line_id` precisely because that button was the only way to
 * populate it.
 *
 * Games that produced no match are still returned, with nulls: the caller
 * bulk-PATCHes the whole batch, so a game that used to match a line that has
 * since been edited must have its stale link cleared rather than left behind.
 */

/** The only fields the matcher reads — keeps callers free of the full Game. */
export type MatchableGame = Pick<Game, 'id' | 'pgn' | 'color'>;

/** One row of the bulk PATCH body accepted by `patchGameRepertoireMatches`. */
export interface GameRepertoireMatch {
  id: string;
  repertoireLineId: string | null;
  bookExitPly: number | null;
}

/** A game can only be matched if it is persisted and has moves to compare. */
const isMatchable = (game: MatchableGame): game is MatchableGame & { id: string; pgn: string } =>
  Boolean(game.id && game.pgn);

/** How many of the games handed in were skipped, and why — for reporting. */
export interface MatchRunSummary {
  matches: GameRepertoireMatch[];
  /** Games that had both an id and a PGN, i.e. the real denominator. */
  considered: number;
  /** Of those, how many landed on a prepared line. */
  matched: number;
  /** Handed in but unpersisted or without movetext. */
  skipped: number;
}

/**
 * Match each game against the prepared lines for the colour it was played
 * with. Pure: does no I/O, so it is equally usable in the browser and in Node.
 */
export const buildRepertoireMatches = (
  games: MatchableGame[],
  lines: RepertoireLine[]
): MatchRunSummary => {
  const matchable = games.filter(isMatchable);
  const matches = matchable.map(game => {
    const { sans } = parsePgn(game.pgn);
    const match = matchRepertoireLine(sans, game.color === 'B' ? 'B' : 'W', lines);
    return {
      id: game.id,
      repertoireLineId: match?.lineId ?? null,
      bookExitPly: match?.exitPly ?? null,
    };
  });

  return {
    matches,
    considered: matchable.length,
    matched: matches.filter(m => m.repertoireLineId).length,
    skipped: games.length - matchable.length,
  };
};

/** A game as it comes back from the API, carrying whatever link it already has. */
export type LinkedGame = MatchableGame & Pick<Game, 'repertoireLineId' | 'bookExitPly'>;

/**
 * Same run, but keeping only the games whose match actually changed.
 *
 * Used on the automatic path after an import, where re-sending all ~460 rows
 * on every sync would be a pointless write. A game the matcher already
 * declined stays declined and produces no row, so in the steady state only
 * the newly-imported games are sent.
 */
export const changedRepertoireMatches = (
  games: LinkedGame[],
  lines: RepertoireLine[]
): MatchRunSummary => {
  const run = buildRepertoireMatches(games, lines);
  const current = new Map(games.filter(g => g.id).map(g => [g.id as string, g]));
  const matches = run.matches.filter(m => {
    const game = current.get(m.id);
    // `??` not `||`: bookExitPly 0 is not a legal match anyway, but reading
    // the absent case as "no link" must not depend on falsiness.
    return (
      (game?.repertoireLineId ?? null) !== m.repertoireLineId ||
      (game?.bookExitPly ?? null) !== m.bookExitPly
    );
  });
  return { ...run, matches, matched: matches.filter(m => m.repertoireLineId).length };
};
