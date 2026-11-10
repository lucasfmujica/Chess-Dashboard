import { describe, it, expect } from 'vitest';
import { extractPgnComments } from './pgnComments';
import { parsePgn } from '../hooks/useGameReplay';

describe('extractPgnComments', () => {
  it('returns only the empty initial slot for an empty PGN', () => {
    expect(extractPgnComments('')).toEqual([null]);
    expect(extractPgnComments(undefined)).toEqual([null]);
  });

  it('attaches a normal comment to the move it follows', () => {
    const c = extractPgnComments('1. e4 { Mejor por test. } e5 2. Nf3 Nc6 { Sólido. } *');
    expect(c).toEqual([null, 'Mejor por test.', null, null, 'Sólido.']);
  });

  it('treats a comment holding only a clock annotation as no comment', () => {
    const c = extractPgnComments('1. e4 { [%clk 0:05:00] } e5 { [%clk 0:04:58] [%eval 0.2] } *');
    expect(c).toEqual([null, null, null]);
  });

  it('strips machine annotations but keeps the human text', () => {
    const c = extractPgnComments('1. d4 { [%eval 0.3] [%csl Gd4] Ocupa el centro. [%cal Gc2c4] } d5 *');
    expect(c[1]).toBe('Ocupa el centro.');
  });

  it('reads a comment before the first move as the initial comment', () => {
    const pgn = '[Event "Test"]\n[White "A"]\n\n{ Partida del club. } 1. e4 e5 *';
    expect(extractPgnComments(pgn)).toEqual(['Partida del club.', null, null]);
  });

  it('ignores variations and the comments inside them', () => {
    const pgn = '1. e4 e5 ( 1... c5 { Siciliana. } 2. Nf3 ( 2. c3 ) ) 2. Nf3 { Desarrollo. } Nc6 *';
    const c = extractPgnComments(pgn);
    expect(c).toEqual([null, null, null, 'Desarrollo.', null]);
    expect(c.length - 1).toBe(parsePgn(pgn).sans.length);
  });

  it('skips NAGs and suffix annotations without counting them as plies', () => {
    const pgn = '1. e4 $1 e5 $2 { Pasivo. } 2. Nf3!? $14 Nc6 1-0';
    const c = extractPgnComments(pgn);
    expect(c).toEqual([null, null, 'Pasivo.', null, null]);
  });

  it('counts zero-castling as a move and handles black move numbers', () => {
    const pgn = '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. 0-0 { Enroque. } 4... Nf6 1/2 - 1/2';
    const c = extractPgnComments(pgn);
    expect(c[7]).toBe('Enroque.');
    expect(c.length - 1).toBe(parsePgn(pgn).sans.length);
  });

  it('joins consecutive comments on the same ply', () => {
    expect(extractPgnComments('1. e4 { Uno. } { Dos. } *')[1]).toBe('Uno. Dos.');
  });
});
