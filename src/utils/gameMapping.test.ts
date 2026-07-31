import { describe, it, expect } from 'vitest';
import {
  gameLabel,
  gameToAnnotationDraft,
  gameToViewerData,
  mergeAnnotationDraft,
  pgnResultTag,
} from './gameMapping';
import { gamesToPGN } from './exportUtils';
import type { Game } from '../types/chess';

const game = (over: Partial<Game>): Game =>
  ({
    id: 'g1',
    elo: 1880,
    color: 'W',
    result: 'W',
    opp: 'Petrosian',
    opp_elo: 1900,
    eco: 'B30',
    opening: 'Sicilian Defense',
    tournament: 'Lichess Online',
    timeControl: '15+10',
    rated: true,
    date: '2026-07-30',
    ...over,
  }) as Game;

describe('pgnResultTag', () => {
  it('flips the tag for results recorded from the Black side', () => {
    expect(pgnResultTag({ result: 'W', color: 'W' })).toBe('1-0');
    expect(pgnResultTag({ result: 'W', color: 'B' })).toBe('0-1');
    expect(pgnResultTag({ result: 'L', color: 'W' })).toBe('0-1');
    expect(pgnResultTag({ result: 'L', color: 'B' })).toBe('1-0');
    expect(pgnResultTag({ result: 'D', color: 'W' })).toBe('1/2-1/2');
    expect(pgnResultTag({ result: 'D', color: 'B' })).toBe('1/2-1/2');
  });
});

describe('gameToAnnotationDraft', () => {
  it('carries everything the post-mortem would otherwise be retyped from', () => {
    const draft = gameToAnnotationDraft(game({ pgn: '1. e4 c5' }));
    expect(draft).toEqual({
      gameName: 'vs Petrosian · 2026-07-30 · 15+10',
      date: '2026-07-30',
      result: '1-0',
      opponent: 'Petrosian',
      eco: 'B30',
      opening: 'Sicilian Defense',
      pgn: '1. e4 c5',
      gameId: 'g1',
    });
  });

  it('drops the sync placeholders rather than writing them into the record', () => {
    const draft = gameToAnnotationDraft(game({ eco: 'Unknown', opening: 'Unknown Opening' }));
    expect(draft.eco).toBeUndefined();
    expect(draft.opening).toBeUndefined();
  });

  it('labels a game without a time control by its tournament', () => {
    expect(gameLabel(game({ timeControl: undefined, tournament: 'Copa Cultura' }))).toBe(
      'vs Petrosian · 2026-07-30 · Copa Cultura'
    );
  });
});

describe('mergeAnnotationDraft', () => {
  const draft = gameToAnnotationDraft(game({ pgn: '1. e4 c5' }));

  it('fills empty fields and always replaces the link', () => {
    const merged = mergeAnnotationDraft({ gameId: 'old' }, draft, null);
    expect(merged.gameId).toBe('g1');
    expect(merged.opponent).toBe('Petrosian');
    expect(merged.pgn).toBe('1. e4 c5');
  });

  it('never overwrites what the user typed', () => {
    const merged = mergeAnnotationDraft({ gameName: 'La que perdí en 20' }, draft, null);
    expect(merged.gameName).toBe('La que perdí en 20');
    expect(merged.date).toBe('2026-07-30');
  });

  it('replaces values the previous auto-fill wrote', () => {
    const prevAuto = gameToAnnotationDraft(game({ id: 'g0', opp: 'Tal', pgn: '1. d4 Nf6' }));
    const merged = mergeAnnotationDraft({ ...prevAuto }, draft, prevAuto);
    expect(merged.opponent).toBe('Petrosian');
    expect(merged.pgn).toBe('1. e4 c5');
  });

  it('leaves a saved annotation alone when there was no auto-fill', () => {
    // prevAuto is null while editing an existing row, so changing the link
    // must not repaint fields the post-mortem already recorded.
    const saved = { gameName: 'Ronda 4', opponent: 'Tal', pgn: '1. d4 Nf6' };
    const merged = mergeAnnotationDraft(saved, draft, null);
    expect(merged).toMatchObject({ ...saved, gameId: 'g1' });
  });
});

describe('gameToViewerData', () => {
  it('names you on your side and faces the board that way', () => {
    expect(gameToViewerData(game({ color: 'B', result: 'W' }))).toMatchObject({
      white: 'Petrosian',
      black: 'Vos',
      result: '0-1',
      orientation: 'black',
    });
  });
});

describe('gamesToPGN', () => {
  it('still emits the same headers after sharing pgnResultTag', () => {
    const pgn = gamesToPGN([game({ color: 'B', result: 'W', pgn: '1. e4 c5' })]);
    expect(pgn).toContain('[White "Petrosian"]');
    expect(pgn).toContain('[Black "You"]');
    expect(pgn).toContain('[Result "0-1"]');
    expect(pgn).toContain('[ECO "B30"]');
    expect(pgn.trimEnd().endsWith('1. e4 c5')).toBe(true);
  });

  it('falls back to the result as movetext when a game has no moves', () => {
    expect(gamesToPGN([game({ pgn: undefined })]).trimEnd().endsWith('1-0')).toBe(true);
  });
});
