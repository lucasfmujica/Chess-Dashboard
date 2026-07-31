import type { AnnotatedGame, Game } from '../types/chess';
import type { GameViewerData } from '../context/GameViewerContext';

/** PGN result tags, from a result recorded from the White player's side. */
const RESULT_TAG: Record<Game['result'], PgnResultTag> = { W: '1-0', D: '1/2-1/2', L: '0-1' };

export type PgnResultTag = '1-0' | '0-1' | '1/2-1/2';

/**
 * The PGN `[Result]` tag for a game.
 *
 * `Game.result` is recorded from *your* perspective, so a win as Black is a
 * `0-1`. Flipping here rather than at each call site is why this lives in one
 * place: the export, the annotation draft and the board all need the same tag.
 */
export const pgnResultTag = (game: Pick<Game, 'result' | 'color'>): PgnResultTag => {
  if (game.result === 'D') return '1/2-1/2';
  const fromWhite: Game['result'] =
    game.color === 'W' ? game.result : game.result === 'W' ? 'L' : 'W';
  return RESULT_TAG[fromWhite];
};

/** A one-line human label for a game, e.g. `vs Petrosian · 2026-07-30 · 15+10`. */
export const gameLabel = (game: Game): string =>
  [`vs ${game.opp || 'Rival'}`, game.date, game.timeControl || game.tournament]
    .filter(Boolean)
    .join(' · ');

/** The annotation fields a `games` row can fill in by itself. */
export type AnnotationDraft = Pick<
  AnnotatedGame,
  'gameName' | 'date' | 'result' | 'opponent' | 'eco' | 'opening' | 'pgn' | 'gameId'
>;

/** The draft keys that a link change may overwrite. `gameId` is handled separately. */
export const DRAFT_KEYS = [
  'gameName',
  'date',
  'result',
  'opponent',
  'eco',
  'opening',
  'pgn',
] as const satisfies readonly (keyof AnnotationDraft)[];

/**
 * Everything a post-mortem can inherit from the game it is about, so writing
 * one starts from the record rather than from retyping it.
 */
export const gameToAnnotationDraft = (game: Game): AnnotationDraft => ({
  gameName: gameLabel(game),
  date: game.date,
  result: pgnResultTag(game),
  opponent: game.opp,
  eco: game.eco && game.eco !== 'Unknown' ? game.eco : undefined,
  opening: game.opening && game.opening !== 'Unknown Opening' ? game.opening : undefined,
  pgn: game.pgn,
  gameId: game.id,
});

/**
 * Merge a game's draft into a partially-filled annotation without losing
 * anything the user typed.
 *
 * A field is replaced only when it is empty, or when it still holds exactly
 * what the *previous* auto-fill put there — which is what makes switching the
 * linked game twice in a row behave. `prevAuto` is null when the form was
 * opened on a saved annotation, so editing an old row can never be clobbered.
 */
export const mergeAnnotationDraft = (
  current: Partial<AnnotatedGame>,
  draft: AnnotationDraft,
  prevAuto: AnnotationDraft | null
): Partial<AnnotatedGame> => {
  const merged: Partial<AnnotatedGame> = { ...current, gameId: draft.gameId };
  for (const key of DRAFT_KEYS) {
    const value = merged[key];
    const untouched =
      value === undefined || value === '' || (prevAuto ? value === prevAuto[key] : false);
    if (untouched) merged[key] = draft[key];
  }
  return merged;
};

/** Board-viewer props for a game: you are always named, the board faces your side. */
export const gameToViewerData = (game: Game, pgn?: string): GameViewerData => ({
  pgn: pgn ?? game.pgn,
  white: game.color === 'W' ? 'Vos' : game.opp,
  black: game.color === 'W' ? game.opp : 'Vos',
  result: pgnResultTag(game),
  orientation: game.color === 'B' ? 'black' : 'white',
  title: gameLabel(game),
});
