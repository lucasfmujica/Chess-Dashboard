import { describe, it, expect } from 'vitest';
import {
  tokenizeMovesSan,
  normalizeSan,
  commonPrefixLength,
  matchRepertoireLine,
  MIN_MATCH_PLIES,
} from './repertoireMatch';
import type { RepertoireLine } from '../types/chess';

const line = (id: string, color: 'W' | 'B', movesSan: string): RepertoireLine =>
  ({ id, color, movesSan }) as RepertoireLine;

describe('tokenizeMovesSan', () => {
  it('strips move numbers in the stored format', () => {
    expect(tokenizeMovesSan('1.e4 c5 2.Nf3 Nc6')).toEqual(['e4', 'c5', 'Nf3', 'Nc6']);
  });

  it('handles spaced numbering and black-to-move ellipses', () => {
    expect(tokenizeMovesSan('1. e4 c5 2. Nf3')).toEqual(['e4', 'c5', 'Nf3']);
    expect(tokenizeMovesSan('12... Qxc3 13. Bd2')).toEqual(['Qxc3', 'Bd2']);
  });

  it('drops results and comments', () => {
    expect(tokenizeMovesSan('1.e4 e5 {a note} 2.Nf3 1-0')).toEqual(['e4', 'e5', 'Nf3']);
  });

  it('returns empty for missing input', () => {
    expect(tokenizeMovesSan(undefined)).toEqual([]);
    expect(tokenizeMovesSan('')).toEqual([]);
  });

  it('normalizes check and annotation marks', () => {
    expect(tokenizeMovesSan('1.d4 Qa5+ 2.Nc3! Bxc3+')).toEqual(['d4', 'Qa5', 'Nc3', 'Bxc3']);
  });
});

describe('normalizeSan', () => {
  it('removes trailing check, mate and glyph marks only', () => {
    expect(normalizeSan('Qxc3+')).toBe('Qxc3');
    expect(normalizeSan('Qh7#')).toBe('Qh7');
    expect(normalizeSan('Nf3!?')).toBe('Nf3');
    expect(normalizeSan('O-O')).toBe('O-O');
    expect(normalizeSan('exd5')).toBe('exd5');
  });
});

describe('commonPrefixLength', () => {
  it('counts shared leading moves', () => {
    expect(commonPrefixLength(['e4', 'c5', 'Nf3'], ['e4', 'c5', 'Nc3'])).toBe(2);
  });

  it('is zero when the first move differs', () => {
    expect(commonPrefixLength(['d4'], ['e4'])).toBe(0);
  });

  it('stops at the shorter sequence', () => {
    expect(commonPrefixLength(['e4', 'c5'], ['e4', 'c5', 'Nf3'])).toBe(2);
  });
});

describe('matchRepertoireLine', () => {
  const rossolimo = line('rossolimo', 'B', '1.e4 c5 2.Nf3 Nc6 3.Bb5 g6 4.Bxc6 dxc6 5.d3 Bg7');
  const alapin = line('alapin', 'B', '1.e4 c5 2.c3 Nf6 3.e5 Nd5 4.d4 cxd4');
  const asWhite = line('white-line', 'W', '1.e4 c5 2.Nf3 Nc6 3.Bb5 g6');

  it('picks the line sharing the longest prefix', () => {
    const game = ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5', 'g6', 'Bxc6', 'dxc6', 'O-O'];
    const match = matchRepertoireLine(game, 'B', [alapin, rossolimo]);
    expect(match?.lineId).toBe('rossolimo');
    // Followed 8 moves, then diverged (O-O vs d3).
    expect(match?.exitPly).toBe(8);
  });

  it('reports the full line length when the whole line was played', () => {
    const game = ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5', 'g6', 'Bxc6', 'dxc6', 'd3', 'Bg7', 'h3'];
    expect(matchRepertoireLine(game, 'B', [rossolimo])?.exitPly).toBe(10);
  });

  it('ignores lines prepared for the other colour', () => {
    const game = ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5', 'g6'];
    expect(matchRepertoireLine(game, 'B', [asWhite])).toBeNull();
    expect(matchRepertoireLine(game, 'W', [asWhite])?.lineId).toBe('white-line');
  });

  it('rejects matches too shallow to be meaningful', () => {
    // Shares only '1.e4 c5' — below the floor, so no line is claimed.
    const game = ['e4', 'c5', 'd3', 'Nc6'];
    expect(matchRepertoireLine(game, 'B', [rossolimo, alapin])).toBeNull();
    expect(MIN_MATCH_PLIES).toBeGreaterThan(2);
  });

  it('matches through check marks on either side', () => {
    const decorated = line('checks', 'B', '1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 Qa5+');
    const game = ['d4', 'Nf6', 'c4', 'c5', 'd5', 'e6', 'Nc3', 'Qa5+'];
    expect(matchRepertoireLine(game, 'B', [decorated])?.exitPly).toBe(8);
  });

  it('returns null for an empty game or empty repertoire', () => {
    expect(matchRepertoireLine([], 'B', [rossolimo])).toBeNull();
    expect(matchRepertoireLine(['e4', 'c5', 'Nf3', 'Nc6'], 'B', [])).toBeNull();
  });
});
