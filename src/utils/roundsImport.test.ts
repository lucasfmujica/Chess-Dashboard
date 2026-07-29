import { describe, it, expect } from 'vitest';
import { parseRoundLine, parseRounds, roundsScore } from './roundsImport';

/** The real Copa Cultura AFA XX table, exactly as it reads on the sheet. */
const COPA_XX = `
1 | Romanelli, Gabriel | 2054 | B | ½
2 | Paredes, Ezequiel | 1725 | N | 0
3 | Duarte, Pablo | 1904 | B | 1
4 | Medina, Ivan Ezequiel | 1793 | N | 1
5 | Rueda, Joaquin | 1965 | B | 0
7 | Plotkin, Guillermo | 0 | N | 0
`;

describe('parseRoundLine', () => {
  it('parses a full round', () => {
    expect(parseRoundLine('1 | Romanelli, Gabriel | 2054 | B | ½')).toEqual({
      round: 1,
      opponent: 'Romanelli, Gabriel',
      opponentElo: 2054,
      color: 'W',
      result: 'D',
    });
  });

  it('keeps the comma in "Apellido, Nombre"', () => {
    // The name column contains a comma; splitting on it would mangle every row.
    expect(parseRoundLine('3 | Duarte, Pablo | 1904 | B | 1')?.opponent).toBe('Duarte, Pablo');
  });

  it('reads an unrated opponent as 0, not undefined', () => {
    // This is the important one: calculateExpectedScore only special-cases 0.
    // undefined makes it return NaN and poison every average.
    const parsed = parseRoundLine('7 | Plotkin, Guillermo | 0 | N | 0');
    expect(parsed?.opponentElo).toBe(0);
    expect(Number.isNaN(parsed?.opponentElo)).toBe(false);
  });

  it('reads a blank rating column as 0 too', () => {
    expect(parseRoundLine('7 | Sin Elo |  | N | 0')?.opponentElo).toBe(0);
  });

  it('accepts the chess-results colour glyphs', () => {
    expect(parseRoundLine('1 | X | 1800 | □ | 1')?.color).toBe('W');
    expect(parseRoundLine('1 | X | 1800 | ■ | 1')?.color).toBe('B');
  });

  it('reads a bare "b" as blancas, matching the Spanish sheet', () => {
    expect(parseRoundLine('1 | X | 1800 | b | 1')?.color).toBe('W');
    expect(parseRoundLine('1 | X | 1800 | blancas | 1')?.color).toBe('W');
    expect(parseRoundLine('1 | X | 1800 | negras | 1')?.color).toBe('B');
  });

  it('accepts every result spelling', () => {
    expect(parseRoundLine('1 | X | 1800 | B | 1')?.result).toBe('W');
    expect(parseRoundLine('1 | X | 1800 | B | 0')?.result).toBe('L');
    expect(parseRoundLine('1 | X | 1800 | B | ½')?.result).toBe('D');
    expect(parseRoundLine('1 | X | 1800 | B | 0.5')?.result).toBe('D');
    expect(parseRoundLine('1 | X | 1800 | B | 0,5')?.result).toBe('D');
    expect(parseRoundLine('1 | X | 1800 | B | =')?.result).toBe('D');
    expect(parseRoundLine('1 | X | 1800 | B | 1/2')?.result).toBe('D');
  });

  it('reads forfeits as a normal win or loss', () => {
    expect(parseRoundLine('6 | X | 1800 | B | +')?.result).toBe('W');
    expect(parseRoundLine('6 | X | 1800 | B | -')?.result).toBe('L');
  });

  it('works without a round number', () => {
    expect(parseRoundLine('Romanelli, Gabriel | 2054 | B | ½')).toMatchObject({
      round: undefined,
      opponent: 'Romanelli, Gabriel',
      color: 'W',
    });
  });

  it('rejects a header row rather than importing it as a game', () => {
    expect(parseRoundLine('Ronda | Rival | Elo | Color | Resultado')).toBeNull();
  });

  it('rejects a row with an unreadable colour or result', () => {
    expect(parseRoundLine('1 | X | 1800 | ? | 1')).toBeNull();
    expect(parseRoundLine('1 | X | 1800 | B | aplazada')).toBeNull();
  });

  it('rejects a line with too few columns', () => {
    expect(parseRoundLine('1 | X | 1800')).toBeNull();
    expect(parseRoundLine('')).toBeNull();
  });
});

describe('parseRounds — the real Copa Cultura AFA XX table', () => {
  const rounds = parseRounds(COPA_XX);

  it('reads all six played rounds', () => {
    // Round 6 is absent from the sheet — he did not play it. The parser must
    // not invent it or shift the numbering.
    expect(rounds).toHaveLength(6);
    expect(rounds.map(r => r.round)).toEqual([1, 2, 3, 4, 5, 7]);
  });

  it('totals the official 2.5 points', () => {
    expect(roundsScore(rounds)).toBe(2.5);
  });

  it('splits the colours the way the sheet does', () => {
    expect(rounds.filter(r => r.color === 'W')).toHaveLength(3);
    expect(rounds.filter(r => r.color === 'B')).toHaveLength(3);
  });

  it('carries the unrated opponent through as 0', () => {
    const plotkin = rounds.find(r => r.opponent.startsWith('Plotkin'));
    expect(plotkin?.opponentElo).toBe(0);
  });

  it('records the draw against the highest-rated opponent', () => {
    const romanelli = rounds.find(r => r.opponent.startsWith('Romanelli'));
    expect(romanelli).toMatchObject({ opponentElo: 2054, result: 'D', color: 'W' });
  });
});

describe('roundsScore', () => {
  it('counts a draw as half a point', () => {
    expect(
      roundsScore([
        { opponent: 'a', opponentElo: 0, color: 'W', result: 'W' },
        { opponent: 'b', opponentElo: 0, color: 'B', result: 'D' },
        { opponent: 'c', opponentElo: 0, color: 'W', result: 'L' },
      ])
    ).toBe(1.5);
  });

  it('is zero for an empty list', () => {
    expect(roundsScore([])).toBe(0);
  });
});
