import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchLichessGames, transformLichessGames, type LichessRawGame } from './lichessApi';

const CLK_PGN = '[Event "Rated Rapid game"]\n\n1. e4 { [%clk 0:10:00] } 1... c5 { [%clk 0:10:00] } 1-0';

const raw = (over: Partial<LichessRawGame> = {}): LichessRawGame => ({
  id: 'abcd1234',
  rated: true,
  createdAt: Date.UTC(2026, 9, 12, 18, 30),
  winner: 'white',
  speed: 'rapid',
  players: {
    white: { user: { name: 'lmujica24' }, rating: 1650, ratingDiff: 5 },
    black: { user: { name: 'Rival' }, rating: 1700, ratingDiff: -5 },
  },
  clock: { initial: 600, increment: 0 },
  moves: 'e4 c5',
  ...over,
});

describe('transformLichessGames', () => {
  it('keeps the clocks by preferring the PGN over bare movetext', () => {
    const [game] = transformLichessGames([raw({ pgn: CLK_PGN })], 'lmujica24');
    expect(game.pgn).toBe(CLK_PGN);
    expect(game.pgn).toContain('[%clk 0:10:00]');
  });

  it('falls back to SAN moves when the response has no pgn', () => {
    const [game] = transformLichessGames([raw()], 'lmujica24');
    expect(game.pgn).toBe('e4 c5');
  });

  it('omits pgn when neither is present', () => {
    const [game] = transformLichessGames([raw({ moves: undefined })], 'lmujica24');
    expect(game).not.toHaveProperty('pgn');
  });
});

describe('fetchLichessGames', () => {
  afterEach(() => vi.unstubAllGlobals());

  const stubFetch = () => {
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => '' }) as Response);
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };
  const lastCall = (fetchMock: ReturnType<typeof stubFetch>) => {
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    return { params: new URL(url).searchParams, init };
  };

  it('asks for clocks and the PGN', async () => {
    const fetchMock = stubFetch();
    await fetchLichessGames('lmujica24');
    const { params } = lastCall(fetchMock);
    expect(params.get('clocks')).toBe('true');
    expect(params.get('pgnInJson')).toBe('true');
  });

  it('in the browser sends no User-Agent (any casing) and only CORS-safelisted headers', async () => {
    expect(typeof window).toBe('object');
    const fetchMock = stubFetch();
    await fetchLichessGames('lmujica24');
    const headers = lastCall(fetchMock).init.headers as Record<string, string>;
    const names = Object.keys(headers).map(h => h.toLowerCase());
    expect(names).not.toContain('user-agent');
    const safelisted = ['accept', 'accept-language', 'content-language', 'content-type'];
    expect(names.every(n => safelisted.includes(n))).toBe(true);
  });

  it('outside the browser (no window) sends the identifying User-Agent', async () => {
    vi.stubGlobal('window', undefined);
    const fetchMock = stubFetch();
    await fetchLichessGames('lmujica24');
    const headers = lastCall(fetchMock).init.headers as Record<string, string>;
    expect(headers['User-Agent']).toMatch(/^Chess-Dashboard\/1\.0/);
    expect(headers.Accept).toBe('application/x-ndjson');
  });

  it('documents the fetch defaults: rated, max 50, rapid+classical', async () => {
    const fetchMock = stubFetch();
    await fetchLichessGames('lmujica24');
    const { params } = lastCall(fetchMock);
    expect(params.get('rated')).toBe('true');
    expect(params.get('max')).toBe('50');
    expect(params.get('perfType')).toBe('rapid,classical');
  });

  it('sends no max with a null cap, and passes since/until and perfType through', async () => {
    const fetchMock = stubFetch();
    await fetchLichessGames('lmujica24', { max: null, since: 1000, until: 2000, perfType: 'rapid,classical' });
    const { params } = lastCall(fetchMock);
    expect(params.has('max')).toBe(false);
    expect(params.get('since')).toBe('1000');
    expect(params.get('until')).toBe('2000');
    expect(params.get('perfType')).toBe('rapid,classical');
  });
});
