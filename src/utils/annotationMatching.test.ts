import { describe, it, expect } from 'vitest';
import { buildAnnotationIndex, isGameAnnotated, unanalyzedGames } from './annotationMatching';
import type { AnnotatedGame, Game } from '../types/chess';

const game = (over: Partial<Game>): Game =>
  ({
    id: 'g1',
    elo: 1880,
    color: 'W',
    result: 'W',
    opp: 'Petrosian',
    opp_elo: 1900,
    eco: 'B30',
    tournament: 'Lichess Online',
    rated: true,
    date: '2026-07-30',
    ...over,
  }) as Game;

const annotation = (over: Partial<AnnotatedGame>): AnnotatedGame =>
  ({ id: 'a1', createdAt: 0, ...over }) as AnnotatedGame;

describe('isGameAnnotated', () => {
  it('matches on game_id', () => {
    const index = buildAnnotationIndex([annotation({ gameId: 'g1' })]);
    expect(isGameAnnotated(game({}), index)).toBe(true);
    expect(isGameAnnotated(game({ id: 'g2' }), index)).toBe(false);
  });

  it('falls back to opponent+date for rows written before game_id existed', () => {
    const index = buildAnnotationIndex([
      annotation({ opponent: 'Petrosian', date: '2026-07-30' }),
    ]);
    expect(isGameAnnotated(game({ id: 'other' }), index)).toBe(true);
  });

  it('does not match on a half-empty legacy key', () => {
    // An annotation with neither field would otherwise register "|" and mask
    // every game whose opponent is blank.
    const index = buildAnnotationIndex([annotation({})]);
    expect(isGameAnnotated(game({ id: undefined, opp: '', date: '' }), index)).toBe(false);
  });

  it('does not match when only the opponent lines up', () => {
    const index = buildAnnotationIndex([
      annotation({ opponent: 'Petrosian', date: '2026-07-01' }),
    ]);
    expect(isGameAnnotated(game({ id: 'other' }), index)).toBe(false);
  });
});

describe('unanalyzedGames', () => {
  it('keeps games on the cutoff date and drops earlier ones', () => {
    const games = [
      game({ id: 'a', date: '2026-07-24' }),
      game({ id: 'b', date: '2026-07-23' }),
    ];
    expect(unanalyzedGames(games, [], '2026-07-24').map(g => g.id)).toEqual(['a']);
  });

  it('excludes games with no date', () => {
    expect(unanalyzedGames([game({ id: 'a', date: undefined })], [], '2026-07-01')).toEqual([]);
  });

  it('excludes games that already have a post-mortem', () => {
    const games = [game({ id: 'a' }), game({ id: 'b' })];
    const result = unanalyzedGames(games, [annotation({ gameId: 'a' })], '2026-07-01');
    expect(result.map(g => g.id)).toEqual(['b']);
  });

  it('returns the newest games first', () => {
    const games = [
      game({ id: 'old', date: '2026-07-20' }),
      game({ id: 'new', date: '2026-07-29' }),
      game({ id: 'mid', date: '2026-07-25' }),
    ];
    expect(unanalyzedGames(games, [], '2026-07-01').map(g => g.id)).toEqual(['new', 'mid', 'old']);
  });
});
