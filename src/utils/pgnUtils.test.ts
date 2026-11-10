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

describe('Round and clock snapshots', () => {
  /** 40 full moves of knight shuffles; every ply carries a clock that encodes its move number and side. */
  const shuffle = (() => {
    const plies = ['Nf3', 'Nf6', 'Ng1', 'Ng8'];
    const out: string[] = [];
    for (let n = 1; n <= 40; n++) {
      const w = `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}:10`;
      const b = `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}:20`;
      out.push(`${n}. ${plies[((n - 1) * 2) % 4]} {[%clk ${w}]} ${plies[((n - 1) * 2 + 1) % 4]} {[%clk ${b}]}`);
    }
    return out.join(' ');
  })();

  const text = (round: string, white: string, black: string) =>
    `[Event "Open"]\n[Round "${round}"]\n[White "${white}"]\n[Black "${black}"]\n[Result "1-0"]\n\n${shuffle} 1-0\n`;

  it('reads the Round tag, ignoring placeholders', () => {
    expect(parsePGN(text('4', 'Lucas', 'Rival'))[0].round).toBe('4');
    expect(parsePGN(text('?', 'Lucas', 'Rival'))[0].round).toBeUndefined();
    expect(parsePGN(text('-', 'Lucas', 'Rival'))[0].round).toBeUndefined();
  });

  it('extracts each side\'s clock after move 20, 30 and 40', () => {
    const [game] = parsePGN(text('1', 'Lucas', 'Rival'));
    expect(game.clocks?.white).toEqual({ 20: '0:20:10', 30: '0:30:10', 40: '0:40:10' });
    expect(game.clocks?.black).toEqual({ 20: '0:20:20', 30: '0:30:20', 40: '0:40:20' });
  });

  it('gives the tracked player\'s own clock, whichever colour they had', () => {
    const asWhite = convertPGNGamesToInternal(parsePGN(text('3', 'Lucas', 'Rival')), 'Lucas', 1800).games[0];
    expect(asWhite).toMatchObject({ round: '3', clock20: '0:20:10', clock30: '0:30:10', clock40: '0:40:10' });

    const asBlack = convertPGNGamesToInternal(parsePGN(text('3', 'Rival', 'Lucas')), 'Lucas', 1800).games[0];
    expect(asBlack).toMatchObject({ clock20: '0:20:20', clock30: '0:30:20', clock40: '0:40:20' });
  });

  it('leaves round and clocks off games that have none', () => {
    const [game] = convertPGNGamesToInternal(
      parsePGN('[Event "X"]\n[White "Lucas"]\n[Black "R"]\n[Result "1-0"]\n\n1. e4 e5 1-0\n'),
      'Lucas',
      1800
    ).games;
    expect(game).not.toHaveProperty('round');
    expect(game).not.toHaveProperty('clock20');
  });

  it('keeps the last clock seen for a move number and ignores games shorter than 20 moves', () => {
    const short = '[Event "X"]\n[White "L"]\n[Black "R"]\n[Result "1-0"]\n\n1. e4 {[%clk 0:59:00]} 1... e5 {[%clk 0:59:00]} 1-0\n';
    expect(parsePGN(short)[0].clocks).toBeUndefined();
  });
});
