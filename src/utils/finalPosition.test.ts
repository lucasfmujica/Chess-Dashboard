import { describe, expect, it } from 'vitest';
import { finalPositionFromPgn } from './finalPosition';

describe('finalPositionFromPgn', () => {
  it('returns the final FEN and last move squares', () => {
    const res = finalPositionFromPgn('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6');
    expect(res).toEqual({
      fen: 'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
      lastMove: { from: 'a7', to: 'a6' },
    });
  });

  it('handles headers, comments, variations, NAGs and zero castling', () => {
    const pgn = [
      '[Event "Club"]',
      '[White "A"]',
      '[Black "B"]',
      '[Result "1-0"]',
      '',
      '1. e4 {[%clk 0:05:00]} e5 2. Nf3 (2. f4 exf4) Nc6 $1 3. Bc4 Bc5 4. 0-0! 1-0',
    ].join('\n');
    const res = finalPositionFromPgn(pgn);
    expect(res?.lastMove).toEqual({ from: 'e1', to: 'g1' });
    expect(res?.fen.startsWith('r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b')).toBe(true);
  });

  it('returns null for missing, empty, move-less or unreadable PGN', () => {
    expect(finalPositionFromPgn(undefined)).toBeNull();
    expect(finalPositionFromPgn(null)).toBeNull();
    expect(finalPositionFromPgn('   ')).toBeNull();
    expect(finalPositionFromPgn('[Event "x"]\n\n*')).toBeNull();
    expect(finalPositionFromPgn('1. e4 e5 2. Ke3 Qh4 3. Zz9')).toBeNull();
  });
});
