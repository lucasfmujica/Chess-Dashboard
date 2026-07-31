import type { AnnotatedGame, Game } from '../types/chess';

/**
 * Which games already have a post-mortem, in the two ways that link can exist.
 *
 * `annotated_games.game_id` is the real link, but rows written before that
 * column existed only carry the opponent's name and the date — hence the
 * fallback key.
 */
export interface AnnotationIndex {
  gameIds: Set<string>;
  legacyKeys: Set<string>;
}

const legacyKey = (opponent: string, date: string): string => `${opponent}|${date}`;

export const buildAnnotationIndex = (annotations: AnnotatedGame[]): AnnotationIndex => {
  const gameIds = new Set<string>();
  const legacyKeys = new Set<string>();
  for (const a of annotations) {
    if (a.gameId) gameIds.add(a.gameId);
    // Both halves are required: an annotation missing them would otherwise
    // register the key `"|"` and mask every game with a blank opponent.
    if (a.opponent && a.date) legacyKeys.add(legacyKey(a.opponent, a.date));
  }
  return { gameIds, legacyKeys };
};

export const isGameAnnotated = (game: Game, index: AnnotationIndex): boolean =>
  (!!game.id && index.gameIds.has(game.id)) ||
  (!!game.opp && !!game.date && index.legacyKeys.has(legacyKey(game.opp, game.date)));

/**
 * Games played on or after `sinceKey` that have no post-mortem yet, newest
 * first. The rule the training program states is that a game isn't finished
 * until it has been analysed, so this is what "sin analizar" means everywhere.
 *
 * `sinceKey` is passed in rather than defaulted because the two callers mean
 * different windows: the week view grades the current week, the library shows
 * the backlog.
 */
export const unanalyzedGames = (
  games: Game[],
  annotations: AnnotatedGame[],
  sinceKey: string
): Game[] => {
  const index = buildAnnotationIndex(annotations);
  return games
    .filter(g => g.date && g.date >= sinceKey && !isGameAnnotated(g, index))
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
};
