import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const refreshProfile = vi.fn();
const insertGames = vi.fn();
const sqlMock = vi.fn();

vi.mock('./_db.js', () => ({ sql: (...a: unknown[]) => sqlMock(...a) }));
vi.mock('./profile.js', () => ({ refreshProfile: () => refreshProfile() }));
vi.mock('./_gameInsert.js', () => ({ insertGames: (...a: unknown[]) => insertGames(...a) }));
vi.mock('@anthropic-ai/sdk', () => ({ default: class {} }));

import handler from './cron';
import { syncLichess, MAX_GAMES, USER_AGENT } from './_lichessSync';

const rawGame = (id: string, createdAt = Date.UTC(2026, 10, 5, 15, 0)) => ({
  id,
  rated: true,
  createdAt,
  winner: 'white',
  speed: 'rapid',
  players: {
    white: { user: { name: 'lmujica24' }, rating: 2000, ratingDiff: 5 },
    black: { user: { name: 'rival' }, rating: 1900, ratingDiff: -5 },
  },
  opening: { eco: 'C20', name: 'King Pawn' },
  clock: { initial: 600, increment: 0 },
  pgn: '[Date "2026.11.05"]\n1. e4 e5',
});
const ndjson = (n: number) =>
  Array.from({ length: n }, (_, i) => JSON.stringify(rawGame(`g${i}`))).join('\n');

const ok = (body: string) => new Response(body, { status: 200 });

/** sql mock: max(played_date) lookup, existing-ids lookup (`existing`), the rest are Fathom's. */
const stubSql = (latest: string | null, existing: string[] = []) => {
  sqlMock.mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join('?');
    if (text.includes("source = 'lichess'")) return [{ latest }];
    if (text.includes('ANY(')) {
      return (values[0] as string[]).filter(id => existing.includes(id)).map(id => ({ lichess_game_id: id }));
    }
    if (text.includes('max(assigned_date)')) return [{ latest: null }];
    return [];
  });
};

const makeRes = () => {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
};
const run = async () => {
  const res = makeRes();
  await handler(
    { headers: { authorization: 'Bearer secret-secret-secret-1234567890ab' } } as never,
    res as never
  );
  return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
};

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', 'secret-secret-secret-1234567890ab');
  vi.stubEnv('FATHOM_API_KEY', 'fk');
  vi.stubEnv('ANTHROPIC_API_KEY', 'ak');
  refreshProfile.mockReset().mockResolvedValue({ ok: true });
  insertGames.mockReset().mockResolvedValue(undefined);
  sqlMock.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('syncLichess', () => {
  it('computes since as 00:00 UTC of the day before the last stored game', async () => {
    stubSql('2026-11-05');
    const fetchMock = vi.fn().mockResolvedValue(ok(ndjson(2)));
    vi.stubGlobal('fetch', fetchMock);
    const out = await syncLichess(sqlMock as never);
    expect(out?.since).toBe('2026-11-04T00:00:00.000Z');
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('since')).toBe(String(Date.parse('2026-11-04T00:00:00Z')));
    expect(url.searchParams.get('sort')).toBe('dateAsc');
    expect(url.searchParams.get('max')).toBe(String(MAX_GAMES));
    expect(url.pathname).toBe('/api/games/user/lmujica24');
    for (const [k, v] of Object.entries({
      rated: 'true', perfType: 'rapid,classical', moves: 'true', pgnInJson: 'true',
      clocks: 'true', opening: 'true', ratingDiff: 'true',
    })) expect(url.searchParams.get(k)).toBe(v);
  });

  it('does not fetch when no Lichess games are stored', async () => {
    stubSql(null);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await syncLichess(sqlMock as never)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(insertGames).not.toHaveBeenCalled();
  });

  it('parses NDJSON, transforms and passes the games to insertGames', async () => {
    stubSql('2026-11-05');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(ndjson(3) + '\n')));
    const out = await syncLichess(sqlMock as never);
    expect(out).toMatchObject({ fetched: 3, inserted: 3, truncated: false });
    const games = insertGames.mock.calls[0][1];
    expect(games).toHaveLength(3);
    expect(games[0]).toMatchObject({
      gameId: 'g0', source: 'lichess', color: 'W', result: 'W', elo: 2005, opp: 'rival',
    });
  });

  it('sends the identifying User-Agent and ndjson Accept', async () => {
    stubSql('2026-11-05');
    const fetchMock = vi.fn().mockResolvedValue(ok(''));
    vi.stubGlobal('fetch', fetchMock);
    await syncLichess(sqlMock as never);
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers['User-Agent']).toBe(USER_AGENT);
    expect(headers['User-Agent']).toContain('Chess-Dashboard/1.0');
    expect(headers.Accept).toBe('application/x-ndjson');
  });

  it('reports truncated when max games come back', async () => {
    stubSql('2026-11-05');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(ndjson(MAX_GAMES))));
    const out = await syncLichess(sqlMock as never);
    expect(out).toMatchObject({ fetched: MAX_GAMES, truncated: true });
  });

  it('only inserts new games and reports the skipped ones', async () => {
    stubSql('2026-11-05', ['g0', 'g2']);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(ndjson(4))));
    const out = await syncLichess(sqlMock as never);
    expect(out).toMatchObject({ fetched: 4, inserted: 2, skippedExisting: 2 });
    expect(insertGames.mock.calls[0][1].map((g: { gameId: string }) => g.gameId)).toEqual(['g1', 'g3']);
  });

  it('does not call insertGames when everything already exists', async () => {
    stubSql('2026-11-05', ['g0', 'g1']);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(ndjson(2))));
    const out = await syncLichess(sqlMock as never);
    expect(out).toMatchObject({ inserted: 0, skippedExisting: 2 });
    expect(insertGames).not.toHaveBeenCalled();
  });

  it('sets played_time in Argentina time', async () => {
    stubSql('2026-11-05');
    // 02:30 UTC = 23:30 ART of the previous day
    const body = JSON.stringify(rawGame('night', Date.UTC(2026, 10, 6, 2, 30)));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(body)));
    await syncLichess(sqlMock as never);
    expect(insertGames.mock.calls[0][1][0].time).toBe('11:30 PM');
  });

  it('skips malformed NDJSON lines and counts them', async () => {
    stubSql('2026-11-05');
    const body = [ndjson(1), '{not json', ndjson(0), JSON.stringify(rawGame('g9'))].join('\n');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(body)));
    const out = await syncLichess(sqlMock as never);
    expect(out).toMatchObject({ fetched: 2, inserted: 2, badLines: 1 });
  });

  it('truncated run keeps the oldest games; the next run resumes from the last stored day', async () => {
    stubSql('2026-11-05');
    const fetchMock = vi.fn().mockResolvedValue(ok(ndjson(MAX_GAMES)));
    vi.stubGlobal('fetch', fetchMock);
    expect(await syncLichess(sqlMock as never)).toMatchObject({ truncated: true });
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('sort')).toBe('dateAsc');
    // after storing, max(played_date) advanced to 2026-11-07
    stubSql('2026-11-07');
    fetchMock.mockResolvedValue(ok(ndjson(1)));
    const next = await syncLichess(sqlMock as never);
    expect(next?.since).toBe('2026-11-06T00:00:00.000Z');
    expect(next?.truncated).toBe(false);
  });

  it('aborts the whole Lichess part after 60s (e.g. a hung insert)', async () => {
    vi.useFakeTimers();
    stubSql('2026-11-05');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(ndjson(1))));
    insertGames.mockReturnValue(new Promise(() => {}));
    const p = syncLichess(sqlMock as never).catch(e => e);
    await vi.advanceTimersByTimeAsync(60_000);
    expect((await p).message).toMatch(/exceeded 60s/);
  });

  it('aborts a fetch that never responds', async () => {
    vi.useFakeTimers();
    stubSql('2026-11-05');
    vi.stubGlobal(
      'fetch',
      vi.fn((_u: string, init: { signal: AbortSignal }) =>
        new Promise((_res, rej) =>
          init.signal.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')))
        )
      )
    );
    const p = syncLichess(sqlMock as never).catch(e => e);
    await vi.advanceTimersByTimeAsync(30_000);
    expect((await p).message).toMatch(/timed out/);
  });
});

describe('cron handler', () => {
  const fathomFetch = (lichess: () => Promise<Response>) =>
    vi.fn(async (url: unknown) =>
      String(url).includes('lichess.org')
        ? lichess()
        : new Response(JSON.stringify({ items: [] }), { status: 200 })
    );

  it('runs Lichess between FIDE and Fathom and reports it', async () => {
    stubSql('2026-11-05');
    vi.stubGlobal('fetch', fathomFetch(async () => ok(ndjson(2))));
    const { status, body } = await run();
    expect(status).toBe(200);
    expect(body.profile).toEqual({ ok: true });
    expect(body.lichess).toMatchObject({ fetched: 2, inserted: 2, truncated: false });
  });

  it('a Lichess error does not break FIDE or Fathom', async () => {
    stubSql('2026-11-05');
    vi.stubGlobal('fetch', fathomFetch(async () => new Response('', { status: 503 })));
    const { status, body } = await run();
    expect(status).toBe(200);
    expect(body.lichess.error).toMatch(/503/);
    expect(body.profile).toEqual({ ok: true });
    expect(body.lessonsScanned).toBe(0);
  });

  it('a hung Lichess aborts, is reported, and Fathom still runs', async () => {
    vi.useFakeTimers();
    stubSql('2026-11-05');
    vi.stubGlobal(
      'fetch',
      vi.fn((url: unknown, init: { signal?: AbortSignal }) =>
        String(url).includes('lichess.org')
          ? new Promise((_r, rej) =>
              init.signal!.addEventListener('abort', () => rej(new DOMException('a', 'AbortError')))
            )
          : Promise.resolve(new Response(JSON.stringify({ items: [] }), { status: 200 }))
      )
    );
    const p = run();
    await vi.advanceTimersByTimeAsync(30_000);
    const { status, body } = await p;
    expect(status).toBe(200);
    expect(body.lichess.error).toMatch(/timed out/);
    expect(body.lessonsScanned).toBe(0);
  });

  it('a missing FATHOM_API_KEY does not prevent Lichess', async () => {
    vi.stubEnv('FATHOM_API_KEY', '');
    stubSql('2026-11-05');
    vi.stubGlobal('fetch', fathomFetch(async () => ok(ndjson(1))));
    const { status, body } = await run();
    expect(status).toBe(500);
    expect(body.error).toMatch(/FATHOM_API_KEY/);
    expect(body.lichess).toMatchObject({ fetched: 1 });
    expect(insertGames).toHaveBeenCalledTimes(1);
  });

  it('a Fathom failure still reports Lichess', async () => {
    stubSql('2026-11-05');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: unknown) =>
        String(url).includes('lichess.org') ? ok(ndjson(1)) : new Response('x', { status: 500 })
      )
    );
    const { status, body } = await run();
    expect(status).toBe(502);
    expect(body.lichess).toMatchObject({ fetched: 1 });
  });
});
