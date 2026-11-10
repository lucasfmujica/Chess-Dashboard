import { describe, it, expect, vi } from 'vitest';
import {
  fetchChessComGames,
  humanizeTimeControl,
  selectArchives,
  transformChessComGames,
  type ChessComRawGame,
} from './chessComApi';

const PGN = `[Event "Live Chess"]
[Site "Chess.com"]
[ECO "B30"]
[ECOUrl "https://www.chess.com/openings/Sicilian-Defense-Old-Sicilian-Variation"]

1. e4 {[%clk 0:10:00]} 1... c5 {[%clk 0:10:00]} 2. Nf3 {[%clk 0:09:58.2]} 2... Nc6 {[%clk 0:09:57]} 1-0`;

const raw = (over: Partial<ChessComRawGame> = {}): ChessComRawGame => ({
  uuid: 'abc-123',
  pgn: PGN,
  end_time: Date.UTC(2026, 9, 12, 18, 30) / 1000,
  rated: true,
  time_control: '600',
  time_class: 'rapid',
  rules: 'chess',
  white: { username: 'lmujica24', rating: 1650, result: 'win' },
  black: { username: 'Rival', rating: 1700, result: 'resigned' },
  ...over,
});

describe('transformChessComGames', () => {
  it('maps a rapid win as white, keeping the uuid and the clocks in the pgn', () => {
    const [game] = transformChessComGames([raw()], 'LMujica24');
    expect(game).toMatchObject({
      source: 'chesscom',
      gameId: 'abc-123',
      speed: 'rapid',
      timeControl: '10+0',
      color: 'W',
      result: 'W',
      elo: 1650,
      opp: 'Rival',
      opp_elo: 1700,
      eco: 'B30',
      opening: 'Sicilian Defense Old Sicilian Variation',
      date: '2026-10-12',
      time: '18:30',
    });
    expect(game.pgn).toContain('{[%clk 0:09:58.2]}');
  });

  it('reads result and colour from the tracked player when playing black', () => {
    const [game] = transformChessComGames(
      [raw({ white: { username: 'Rival', rating: 1700, result: 'win' }, black: { username: 'lmujica24', rating: 1650, result: 'checkmated' } })],
      'lmujica24'
    );
    expect(game).toMatchObject({ color: 'B', result: 'L', elo: 1650, opp: 'Rival' });
  });

  it('treats agreed / repetition / stalemate as draws', () => {
    for (const how of ['agreed', 'repetition', 'stalemate', '50move']) {
      const [game] = transformChessComGames(
        [raw({ white: { username: 'lmujica24', rating: 1, result: how }, black: { username: 'x', rating: 1, result: how } })],
        'lmujica24'
      );
      expect(game.result).toBe('D');
    }
  });
});

describe('humanizeTimeControl', () => {
  it('turns seconds into minutes+increment and leaves daily alone', () => {
    expect(humanizeTimeControl('600')).toBe('10+0');
    expect(humanizeTimeControl('900+10')).toBe('15+10');
    expect(humanizeTimeControl('1/86400')).toBe('1/86400');
  });
});

describe('selectArchives', () => {
  const archives = [2026, 2025].flatMap(y =>
    ['01', '06', '07', '10'].map(m => `https://api.chess.com/pub/player/x/games/${y}/${m}`)
  );

  it('keeps everything without a sinceDate', () => {
    expect(selectArchives(archives)).toEqual(archives);
  });

  it('keeps only the sinceDate month and later', () => {
    expect(selectArchives(archives, '2026-07-30')).toEqual([
      'https://api.chess.com/pub/player/x/games/2026/07',
      'https://api.chess.com/pub/player/x/games/2026/10',
    ]);
  });
});

describe('fetchChessComGames', () => {
  const setup = (monthGames: Record<string, ChessComRawGame[]>) => {
    const urls: string[] = [];
    let inFlight = 0;
    let maxInFlight = 0;
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      urls.push(url);
      expect((init?.headers as Record<string, string>)['User-Agent']).toMatch(/^Chess-Dashboard\/1\.0/);
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight--;
      const body = url.endsWith('/games/archives')
        ? { archives: Object.keys(monthGames) }
        : { games: monthGames[url] };
      return { ok: true, status: 200, statusText: 'OK', json: async () => body } as Response;
    });
    return { fetchImpl: fetchImpl as unknown as typeof fetch, urls, maxInFlight: () => maxInFlight };
  };

  const A = 'https://api.chess.com/pub/player/lmujica24/games/2026/09';
  const B = 'https://api.chess.com/pub/player/lmujica24/games/2026/10';

  it('requests only archives from the sinceDate month, serially', async () => {
    const { fetchImpl, urls, maxInFlight } = setup({ [A]: [raw({ uuid: 'old' })], [B]: [raw({ uuid: 'new' })] });
    const games = await fetchChessComGames('lmujica24', { sinceDate: '2026-10-01', delayMs: 0, fetchImpl });
    expect(urls).toEqual([expect.stringContaining('/games/archives'), B]);
    expect(maxInFlight()).toBe(1);
    expect(games.map(g => g.uuid)).toEqual(['new']);
  });

  it('drops games older than sinceDate inside the first archive', async () => {
    const early = raw({ uuid: 'early', end_time: Date.UTC(2026, 9, 1, 12) / 1000 });
    const late = raw({ uuid: 'late', end_time: Date.UTC(2026, 9, 20, 12) / 1000 });
    const { fetchImpl } = setup({ [B]: [early, late] });
    const games = await fetchChessComGames('lmujica24', { sinceDate: '2026-10-15', delayMs: 0, fetchImpl });
    expect(games.map(g => g.uuid)).toEqual(['late']);
  });

  it('never returns bullet, even when blitz is asked for', async () => {
    const { fetchImpl } = setup({
      [B]: [
        raw({ uuid: 'r' }),
        raw({ uuid: 'b', time_class: 'blitz', time_control: '180' }),
        raw({ uuid: 'u', time_class: 'bullet', time_control: '60' }),
      ],
    });
    const rapidOnly = await fetchChessComGames('lmujica24', { delayMs: 0, fetchImpl });
    expect(rapidOnly.map(g => g.uuid)).toEqual(['r']);
    const both = await fetchChessComGames('lmujica24', { timeClasses: ['rapid', 'blitz'], delayMs: 0, fetchImpl });
    expect(both.map(g => g.uuid)).toEqual(['r', 'b']);
  });

  it('skips unrated and non-standard games', async () => {
    const { fetchImpl } = setup({
      [B]: [raw({ uuid: 'ok' }), raw({ uuid: 'unrated', rated: false }), raw({ uuid: '960', rules: 'chess960' })],
    });
    const games = await fetchChessComGames('lmujica24', { delayMs: 0, fetchImpl });
    expect(games.map(g => g.uuid)).toEqual(['ok']);
  });
});
