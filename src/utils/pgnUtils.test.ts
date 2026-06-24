import { describe, it, expect } from 'vitest';
import { parsePGN, convertPGNGamesToInternal } from './pgnUtils';

const pgn = (headers: Record<string, string>) =>
  Object.entries(headers)
    .map(([k, v]) => `[${k} "${v}"]`)
    .join('\n') + '\n\n1. e4 e5 *\n';

describe('parsePGN', () => {
  it('returns an empty array for empty / non-string input', () => {
    expect(parsePGN('')).toEqual([]);
    // @ts-expect-error testing runtime guard against bad input
    expect(parsePGN(null)).toEqual([]);
  });

  it('parses a valid game and extracts headers', () => {
    const text = pgn({
      Event: 'Test Open',
      White: 'Lucas',
      Black: 'Rival',
      WhiteElo: '1800',
      BlackElo: '1750',
      ECO: 'B30',
      Result: '1-0',
    });
    const [game] = parsePGN(text);
    expect(game.white).toBe('Lucas');
    expect(game.black).toBe('Rival');
    expect(game.whiteElo).toBe(1800);
    expect(game.blackElo).toBe(1750);
    expect(game.eco).toBe('B30');
    expect(game.tournament).toBe('Test Open');
  });

  it('skips games without a recognized result', () => {
    const text = pgn({ Event: 'X', White: 'A', Black: 'B', Result: '*' });
    expect(parsePGN(text)).toEqual([]);
  });

  it('sanitizes out-of-range / invalid ELO to 0', () => {
    const text = pgn({
      Event: 'X',
      White: 'A',
      Black: 'B',
      WhiteElo: '99999',
      BlackElo: 'abc',
      Result: '1/2-1/2',
    });
    const [game] = parsePGN(text);
    expect(game.whiteElo).toBe(0);
    expect(game.blackElo).toBe(0);
  });

  it('parses multiple games separated by blank lines', () => {
    const text =
      pgn({ Event: 'A', White: 'Lucas', Black: 'X', Result: '1-0' }) +
      '\n' +
      pgn({ Event: 'B', White: 'Y', Black: 'Lucas', Result: '0-1' });
    expect(parsePGN(text)).toHaveLength(2);
  });
});

describe('convertPGNGamesToInternal', () => {
  it('maps a white win to W and reads the opponent from the black header', () => {
    const parsed = parsePGN(
      pgn({ Event: 'T', White: 'Lucas', Black: 'Rival', BlackElo: '1900', Result: '1-0' })
    );
    const { games, skippedCount } = convertPGNGamesToInternal(parsed, 'lucas', 1850);
    expect(skippedCount).toBe(0);
    expect(games[0]).toMatchObject({
      color: 'W',
      result: 'W',
      opp: 'Rival',
      opp_elo: 1900,
      elo: 1850,
      source: 'otb',
    });
  });

  it('reverses the result when the tracked player is Black', () => {
    const parsed = parsePGN(pgn({ Event: 'T', White: 'Rival', Black: 'Lucas', Result: '1-0' }));
    const { games } = convertPGNGamesToInternal(parsed, 'Lucas', 1850);
    expect(games[0]).toMatchObject({ color: 'B', result: 'L', opp: 'Rival' });
  });

  it('skips games where the player name is not found', () => {
    const parsed = parsePGN(pgn({ Event: 'T', White: 'A', Black: 'B', Result: '1-0' }));
    const { games, skippedCount } = convertPGNGamesToInternal(parsed, 'Lucas', 1850);
    expect(games).toHaveLength(0);
    expect(skippedCount).toBe(1);
  });
});
