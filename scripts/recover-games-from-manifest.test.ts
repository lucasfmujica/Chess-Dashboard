/**
 * @vitest-environment node
 *
 * Integration tests for the closed-manifest importer. They run against an
 * ephemeral in-process Postgres (pglite, in memory) loaded from the real
 * db/schema.sql, with fetch mocked: no network, no Neon. The only files touched
 * are --out reports in a per-test temporary directory.
 *
 * Every id, user and opponent here is synthetic. The real manifest is private
 * and never appears in this repository.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

import {
  BATCH_SIZE,
  LICHESS_IDS_ENDPOINT,
  PREVIEW_BRANCH_ID,
  PROD_BRANCH_ID,
  PROD_MANIFEST_SHA256,
  USER_AGENT,
  preflightSchema,
  redact,
  runCli,
  runRecovery,
  sha256,
  type AdapterHandle,
  type CliOptions,
  type RecoverDeps,
  type SqlAdapter,
} from './lib/recoverGames.js';

// ---------------------------------------------------------------------------
// Synthetic fixtures
// ---------------------------------------------------------------------------

const USER = 'fixture-user';
const OPPONENT = 'fixture-opponent';
const FROM = '2026-07-30';
const TO = '2026-11-11';
const LICHESS_DATE = '2026-08-01';
const CHESSCOM_DATE = '2026-09-21';
const PROD_URL = 'postgresql://u:p@ep-falling-thunder-af9y8mpb-pooler.us-east-1.aws.neon.tech/db';
const BACKUP_BRANCH = 'br-fixture-backup-000000';
const PREVIEW_URL = 'postgresql://u:p@ep-damp-cake-afjuq6h8-pooler.us-east-1.aws.neon.tech/db';

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);
const lichessId = (n: number): string => `fixLi${String(n).padStart(3, '0')}`;
const chesscomId = (n: number): string =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

interface ManifestGameFixture {
  provider: string;
  source: string;
  id: string;
  date: string;
  speed: string;
  rated: boolean;
  variant: string;
  user: string;
}

const manifestFor = (lichess: number, chesscom: number): Record<string, unknown> => {
  const games: ManifestGameFixture[] = [
    ...range(lichess).map(i => ({
      provider: 'lichess', source: 'lichess', id: lichessId(i), date: LICHESS_DATE,
      speed: 'rapid', rated: true, variant: 'standard', user: USER,
    })),
    ...range(chesscom).map(i => ({
      provider: 'chesscom', source: 'chesscom', id: chesscomId(i), date: CHESSCOM_DATE,
      speed: 'rapid', rated: true, variant: 'chess', user: USER,
    })),
  ];
  return {
    manifest: 'chess-recovery-78',
    version: 1,
    scope: {
      user: USER,
      providers: ['lichess', 'chesscom'],
      rated: true,
      variant: 'standard',
      speed: 'rapid',
      date_from_utc_inclusive: FROM,
      date_to_utc_inclusive: TO,
    },
    counts: { lichess, chesscom },
    total: games.length,
    games,
  };
};

const lichessRaw = (id: string, date: string, over: Record<string, unknown> = {}) => ({
  id,
  rated: true,
  variant: 'standard',
  speed: 'rapid',
  perf: 'rapid',
  createdAt: Date.parse(`${date}T12:34:00Z`),
  winner: 'white',
  players: {
    white: { user: { name: USER }, rating: 1500, ratingDiff: 6 },
    black: { user: { name: OPPONENT }, rating: 1490, ratingDiff: -6 },
  },
  opening: { eco: 'B10', name: 'Caro-Kann Defense' },
  clock: { initial: 600, increment: 0 },
  moves: 'e4 c6',
  pgn: '[Event "fixture"]\n\n1. e4 c6 1-0',
  ...over,
});

const chesscomRaw = (uuid: string, date: string, over: Record<string, unknown> = {}) => ({
  uuid,
  rated: true,
  rules: 'chess',
  time_class: 'rapid',
  time_control: '600',
  end_time: Date.parse(`${date}T15:00:00Z`) / 1000,
  white: { username: USER, rating: 1500, result: 'win' },
  black: { username: OPPONENT, rating: 1490, result: 'resigned' },
  pgn: '[Event "fixture"]\n[ECO "B10"]\n\n1. e4 c6 1-0',
  ...over,
});

const rawsFor = (manifest: Record<string, unknown>) => {
  const games = manifest.games as ManifestGameFixture[];
  const lichess = games.filter(g => g.provider === 'lichess').map(g => lichessRaw(g.id, g.date));
  const archives: Record<string, unknown[]> = {};
  for (const g of games.filter(g => g.provider === 'chesscom')) {
    const month = g.date.slice(0, 7).replace('-', '/');
    (archives[month] ??= []).push(chesscomRaw(g.id, g.date));
  }
  return { lichess, archives };
};

// ---------------------------------------------------------------------------
// Mocked fetch
// ---------------------------------------------------------------------------

type Handler = (url: string, init: RequestInit, nth: number) => Promise<Response>;

const response = (body: string, status = 200, statusText = 'OK'): Response =>
  ({ ok: status >= 200 && status < 300, status, statusText, text: async () => body }) as Response;

const ndjson = (rows: unknown[]): string => rows.map(row => JSON.stringify(row)).join('\n');

function mockFetch(handler: Handler) {
  const calls: { url: string; body?: string; headers?: Record<string, string> }[] = [];
  const fn = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, body: init?.body as string, headers: init?.headers as Record<string, string> });
    return handler(url, init ?? {}, calls.length - 1);
  }) as unknown as typeof fetch;
  return Object.assign(fn, { calls });
}

/** Serves exactly the fixtures a manifest asks for, filtering by requested id. */
const serve = (lichess: ReturnType<typeof lichessRaw>[], archives: Record<string, unknown[]>): Handler =>
  async (url, init) => {
    if (url.startsWith(LICHESS_IDS_ENDPOINT)) {
      const wanted = new Set(String(init.body ?? '').split(','));
      return response(ndjson(lichess.filter(g => wanted.has(g.id))));
    }
    const month = url.slice(-7);
    return response(JSON.stringify({ games: archives[month] ?? [] }));
  };

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

let db: PGlite;

const pgliteAdapter = (): SqlAdapter => ({
  query: async (text, params) =>
    (await db.query(text, params as unknown[])).rows as Record<string, unknown>[],
});

beforeAll(async () => {
  db = new PGlite();
  await db.waitReady;
  const schema = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');
  for (const statement of schema.split(';').map(s => s.trim()).filter(Boolean)) {
    await db.exec(statement);
  }
}, 60_000);

afterAll(async () => {
  await db.close();
});

beforeEach(async () => {
  await db.exec('TRUNCATE games CASCADE');
  await db.exec('TRUNCATE game_analyses');
});

const gameCount = async (): Promise<number> => {
  const { rows } = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM games');
  return rows[0].n;
};
const storedIds = async (): Promise<string[]> => {
  const { rows } = await db.query<{ lichess_game_id: string }>(
    'SELECT lichess_game_id FROM games ORDER BY lichess_game_id'
  );
  return rows.map(r => r.lichess_game_id);
};

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

const LOCAL_ENV = { RECOVERY_DATABASE_URL: undefined, DATABASE_URL: undefined };

interface Harness {
  options: CliOptions;
  deps: RecoverDeps;
  logs: string[];
  fetchMock: ReturnType<typeof mockFetch>;
  queries: string[];
  createAdapter: ReturnType<typeof vi.fn>;
}

function harness(
  init: {
    manifest?: Record<string, unknown>;
    bytes?: Buffer;
    hash?: string;
    handler?: Handler;
    adapter?: SqlAdapter;
    env?: Record<string, string | undefined>;
    cli?: Partial<CliOptions>;
  } = {}
): Harness {
  const manifest = init.manifest ?? manifestFor(3, 2);
  const bytes = init.bytes ?? Buffer.from(JSON.stringify(manifest));
  const { lichess, archives } = rawsFor(manifest);
  const fetchMock = mockFetch(init.handler ?? serve(lichess, archives));
  const logs: string[] = [];
  const queries: string[] = [];
  const base = init.adapter ?? pgliteAdapter();
  const adapter: SqlAdapter = {
    query: (text, params) => {
      queries.push(text);
      return base.query(text, params);
    },
  };
  const createAdapter = vi.fn(async (): Promise<AdapterHandle> => ({ adapter, close: async () => {} }));

  const options: CliOptions = {
    manifest: '/private/manifest.json',
    expectSha256: init.hash ?? sha256(bytes),
    write: false,
    target: 'local',
    confirmTarget: 'local',
    ...init.cli,
  };
  if (options.target === 'local' && !(init.cli && 'pgliteDir' in init.cli)) options.pgliteDir = 'memory://';
  const deps: RecoverDeps = {
    env: { ...LOCAL_ENV, ...init.env },
    fetchImpl: fetchMock,
    log: message => logs.push(message),
    sleep: async () => {},
    createAdapter,
    readManifest: async () => bytes,
    chesscomDelayMs: 0,
  };
  return { options, deps, logs, fetchMock, queries, createAdapter };
}

const argvOf = (options: CliOptions): string[] => {
  const argv: string[] = [];
  if (options.manifest) argv.push('--manifest', options.manifest);
  if (options.expectSha256) argv.push('--expect-sha256', options.expectSha256);
  if (options.write) argv.push('--write');
  if (options.target) argv.push('--target', options.target);
  if (options.confirmTarget) argv.push('--confirm-target', options.confirmTarget);
  if (options.confirmBackupBranch) argv.push('--confirm-backup-branch', options.confirmBackupBranch);
  if (options.pgliteDir) argv.push('--pglite-dir', options.pgliteDir);
  if (options.out) argv.push('--out', options.out);
  return argv;
};

// ---------------------------------------------------------------------------
// 1-2. Insert and repeat
// ---------------------------------------------------------------------------

describe('insert and repeat', () => {
  it('inserts every manifest game and returns their ids', async () => {
    const manifest = manifestFor(3, 2);
    const { options, deps } = harness({ manifest, cli: { write: true } });
    const result = await runRecovery(options, deps);

    expect(result.inserted).toBe(5);
    expect(result.alreadyPresent).toBe(0);
    expect(result.skippedConflict).toBe(0);
    expect([...result.insertedIds].sort()).toEqual(
      (manifest.games as ManifestGameFixture[]).map(g => g.id).sort()
    );
    expect(await gameCount()).toBe(5);
  });

  it('maps both providers onto the stored columns', async () => {
    const { options, deps } = harness({ cli: { write: true } });
    await runRecovery(options, deps);
    const { rows } = await db.query<Record<string, unknown>>(
      'SELECT lichess_game_id, source, speed, rated, played_date, played_time, opponent, time_control, elo, elo_change FROM games ORDER BY source, lichess_game_id'
    );
    expect(rows).toHaveLength(5);
    expect(rows.filter(r => r.source === 'lichess')).toHaveLength(3);
    expect(rows.filter(r => r.source === 'chesscom')).toHaveLength(2);
    for (const row of rows) {
      expect(row.speed).toBe('rapid');
      expect(row.rated).toBe(true);
      expect(row.opponent).toBe(OPPONENT);
      expect(row.time_control).toBe('10+0');
      if (row.source === 'lichess') {
        // Lichess: Argentina local time, same shape the cron stores; post-game elo.
        expect(row.played_time).toMatch(/^\d{2}:\d{2} (AM|PM)$/);
        expect(row.elo).toBe(1506);
        expect(row.elo_change).toBe(6);
      } else {
        // Chess.com: what transformChessComGames produces (UTC, 24h), like the stored chesscom rows.
        expect(row.played_time).toBe('15:00');
      }
    }
  });

  it('is a no-op when repeated', async () => {
    const manifest = manifestFor(3, 2);
    const first = harness({ manifest, cli: { write: true } });
    await runRecovery(first.options, first.deps);

    const second = harness({ manifest, cli: { write: true } });
    const result = await runRecovery(second.options, second.deps);
    expect(result.inserted).toBe(0);
    expect(result.insertedIds).toEqual([]);
    expect(result.alreadyPresent).toBe(5);
    expect(result.wouldInsert).toBe(0);
    expect(result.skippedConflict).toBe(0);
    expect(await gameCount()).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// 3-4. Concurrency and pre-existing data
// ---------------------------------------------------------------------------

describe('concurrency and existing data', () => {
  it('writes each game once when two runs race over the same database', async () => {
    const manifest = manifestFor(4, 2);
    const a = harness({ manifest, cli: { write: true } });
    const b = harness({ manifest, cli: { write: true } });

    const [ra, rb] = await Promise.all([
      runRecovery(a.options, a.deps),
      runRecovery(b.options, b.deps),
    ]);

    expect(ra.inserted + rb.inserted).toBe(6);
    expect(await gameCount()).toBe(6);
    expect(new Set(await storedIds()).size).toBe(6);
  });

  it('leaves a pre-existing row and everything hanging off it byte for byte', async () => {
    const manifest = manifestFor(3, 2);
    const existing = lichessId(0);
    await db.query(
      `INSERT INTO games (lichess_game_id, source, color, result, elo, opponent, opponent_elo,
         eco, opening_name, tournament, rated, played_date, played_time, speed, time_control,
         elo_change, k_factor, pgn, affects_elo)
       VALUES ($1,'lichess','B','L',1234,$2,1111,'A00','Hand written','fixture-tourney',true,
         '2026-08-01','11:11 PM','rapid','10+0',-7,20,'HAND WRITTEN PGN',false)`,
      [existing, OPPONENT]
    );
    const [{ id: gameUuid }] = (
      await db.query<{ id: string }>('SELECT id FROM games WHERE lichess_game_id = $1', [existing])
    ).rows;
    await db.query(
      `INSERT INTO game_analyses (pgn_hash, depth, evals, moves, accuracy_white, accuracy_black,
         blunders, mistakes, inaccuracies)
       VALUES ('fixture-hash', 18, '{10,-5}', '[]'::jsonb, 91.5, 88.25, 1, 2, 3)`
    );
    await db.query(
      `INSERT INTO blunder_drills (game_id, ply, fen_before, played_san, best_move_uci,
         cp_loss, eval_before, eval_after)
       VALUES ($1, 23, 'fixture-fen', 'Qxh7', 'e2e4', 300, 50, -250)`,
      [gameUuid]
    );

    const snapshot = async () => ({
      game: (await db.query<{ j: string }>(
        'SELECT row_to_json(g)::text AS j FROM games g WHERE lichess_game_id = $1', [existing]
      )).rows[0].j,
      analysis: (await db.query<{ j: string }>(
        'SELECT row_to_json(a)::text AS j FROM game_analyses a WHERE pgn_hash = $1', ['fixture-hash']
      )).rows[0].j,
      drill: (await db.query<{ j: string }>(
        'SELECT row_to_json(d)::text AS j FROM blunder_drills d WHERE game_id = $1', [gameUuid]
      )).rows[0].j,
    });
    const before = await snapshot();

    const { options, deps } = harness({ manifest, cli: { write: true } });
    const result = await runRecovery(options, deps);

    expect(await snapshot()).toEqual(before);
    expect(result.alreadyPresentIds).toEqual([existing]);
    expect(result.inserted).toBe(4);
    expect(result.wouldInsert).toBe(4);
    expect(result.skippedConflict).toBe(0);
    expect(result.insertedIds).not.toContain(existing);
    expect(await gameCount()).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// 5-7. Validation aborts
// ---------------------------------------------------------------------------

const brokenManifests: [string, () => Record<string, unknown> | Buffer, RegExp][] = [
  ['malformed JSON', () => Buffer.from('{"manifest": '), /not valid JSON/],
  ['wrong manifest name', () => ({ ...manifestFor(1, 0), manifest: 'something-else' }), /must be "chess-recovery-78"/],
  ['wrong version', () => ({ ...manifestFor(1, 0), version: 2 }), /version must be 1/],
  ['duplicated id', () => {
    const m = manifestFor(2, 0);
    (m.games as ManifestGameFixture[])[1].id = lichessId(0);
    return m;
  }, /duplicate/],
  ['counts that disagree with the games', () => ({ ...manifestFor(2, 1), counts: { lichess: 1, chesscom: 2 } }), /counts\.lichess says 1/],
  ['a total that disagrees with games.length', () => ({ ...manifestFor(2, 1), total: 4 }), /does not match games\.length/],
  ['a date before the scope', () => {
    const m = manifestFor(1, 0);
    (m.games as ManifestGameFixture[])[0].date = '2026-07-29';
    return m;
  }, /outside the manifest scope/],
  ['a date after the scope', () => {
    const m = manifestFor(1, 0);
    (m.games as ManifestGameFixture[])[0].date = '2026-11-12';
    return m;
  }, /outside the manifest scope/],
  ['a user that is not the scope user', () => {
    const m = manifestFor(1, 0);
    (m.games as ManifestGameFixture[])[0].user = 'someone-else';
    return m;
  }, /does not match scope\.user/],
  ['provider and source disagreeing', () => {
    const m = manifestFor(1, 0);
    (m.games as ManifestGameFixture[])[0].source = 'chesscom';
    return m;
  }, /source does not match/],
  ['a variant the provider does not use', () => {
    const m = manifestFor(1, 0);
    (m.games as ManifestGameFixture[])[0].variant = 'chess';
    return m;
  }, /variant must be standard/],
  ['an unrated game', () => {
    const m = manifestFor(1, 0);
    (m.games as ManifestGameFixture[])[0].rated = false;
    return m;
  }, /rated must be true/],
  ['a speed outside the scope', () => {
    const m = manifestFor(1, 0);
    (m.games as ManifestGameFixture[])[0].speed = 'blitz';
    return m;
  }, /speed must be rapid/],
];

describe('manifest validation', () => {
  it.each(brokenManifests)('aborts on %s', async (_name, build, expected) => {
    const built = build();
    const bytes = Buffer.isBuffer(built) ? built : Buffer.from(JSON.stringify(built));
    const { options, deps, fetchMock } = harness({ bytes, cli: { write: true } });
    await expect(runRecovery(options, deps)).rejects.toThrow(expected);
    expect(fetchMock.calls).toHaveLength(0);
    expect(await gameCount()).toBe(0);
  });

  it('aborts on a hash mismatch before parsing anything', async () => {
    const bytes = Buffer.from('this is not even JSON');
    const { options, deps, fetchMock, createAdapter } = harness({
      bytes,
      hash: 'a'.repeat(64),
      cli: { write: true },
    });
    await expect(runRecovery(options, deps)).rejects.toThrow(/does not match --expect-sha256/);
    expect(fetchMock.calls).toHaveLength(0);
    expect(createAdapter).not.toHaveBeenCalled();
    expect(await gameCount()).toBe(0);
  });
});

const brokenFetches: [string, Record<string, unknown>, RegExp][] = [
  ['a blitz game', { speed: 'blitz', perf: 'blitz' }, /speed is blitz/],
  ['an unrated game', { rated: false }, /not rated/],
  ['another variant', { variant: 'chess960' }, /variant is chess960/],
  ['a different UTC date', { createdAt: Date.parse('2026-08-02T12:00:00Z') }, /does not match the manifest/],
  ['the manifest user not playing', {
    players: {
      white: { user: { name: 'stranger' }, rating: 1500 },
      black: { user: { name: OPPONENT }, rating: 1490 },
    },
  }, /did not play it/],
];

describe('fetched games are checked against the manifest', () => {
  it.each(brokenFetches)('aborts on %s', async (_name, over, expected) => {
    const manifest = manifestFor(2, 0);
    const handler = serve([lichessRaw(lichessId(0), LICHESS_DATE, over), lichessRaw(lichessId(1), LICHESS_DATE)], {});
    const { options, deps } = harness({ manifest, handler, cli: { write: true } });
    await expect(runRecovery(options, deps)).rejects.toThrow(expected);
    expect(await gameCount()).toBe(0);
  });

  it('aborts on a Chess.com game that does not line up', async () => {
    const manifest = manifestFor(0, 1);
    const handler: Handler = async () =>
      response(JSON.stringify({ games: [chesscomRaw(chesscomId(0), CHESSCOM_DATE, { time_class: 'blitz' })] }));
    const { options, deps } = harness({ manifest, handler, cli: { write: true } });
    await expect(runRecovery(options, deps)).rejects.toThrow(/time_class is blitz/);
    expect(await gameCount()).toBe(0);
  });

  it('aborts when the provider never returns a manifest id', async () => {
    const manifest = manifestFor(2, 0);
    const handler = serve([lichessRaw(lichessId(0), LICHESS_DATE)], {});
    const { options, deps } = harness({ manifest, handler, cli: { write: true } });
    await expect(runRecovery(options, deps)).rejects.toThrow(/did not return 1 manifest ids/);
    expect(await gameCount()).toBe(0);
  });

  it('aborts on an NDJSON line that does not parse', async () => {
    const manifest = manifestFor(1, 0);
    const handler: Handler = async () => response(`${JSON.stringify(lichessRaw(lichessId(0), LICHESS_DATE))}\n{oops`);
    const { options, deps } = harness({ manifest, handler, cli: { write: true } });
    await expect(runRecovery(options, deps)).rejects.toThrow(/does not parse/);
    expect(await gameCount()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 8. Provider failures
// ---------------------------------------------------------------------------

describe('provider failures', () => {
  it('sends the identifying User-Agent and the agreed Lichess request', async () => {
    const manifest = manifestFor(1, 1);
    const { options, deps, fetchMock } = harness({ manifest, cli: { write: true } });
    await runRecovery(options, deps);
    const lichessCall = fetchMock.calls.find(c => c.url.startsWith(LICHESS_IDS_ENDPOINT));
    expect(lichessCall?.url).toContain('moves=true&pgnInJson=true&clocks=true&evals=false&opening=true&ratingDiff=true');
    expect(lichessCall?.body).toBe(lichessId(0));
    expect(lichessCall?.headers?.['User-Agent']).toBe(USER_AGENT);
    expect(fetchMock.calls.some(c => c.url.endsWith('/games/2026/09'))).toBe(true);
  });

  it('retries a 500 and succeeds on the next attempt', async () => {
    const manifest = manifestFor(1, 0);
    const good = serve([lichessRaw(lichessId(0), LICHESS_DATE)], {});
    const handler: Handler = async (url, init, nth) =>
      nth === 0 ? response('', 500, 'Internal Server Error') : good(url, init, nth);
    const { options, deps, fetchMock } = harness({ manifest, handler, cli: { write: true } });

    const result = await runRecovery(options, deps);
    expect(fetchMock.calls).toHaveLength(2);
    expect(result.inserted).toBe(1);
  });

  it('gives up on a persistent 500 without writing anything', async () => {
    const manifest = manifestFor(1, 0);
    const handler: Handler = async () => response('', 503, 'Service Unavailable');
    const { options, deps, fetchMock, createAdapter } = harness({ manifest, handler, cli: { write: true } });

    await expect(runRecovery(options, deps)).rejects.toThrow(/failed after 3 attempts/);
    expect(fetchMock.calls).toHaveLength(3);
    expect(createAdapter).not.toHaveBeenCalled();
    expect(await gameCount()).toBe(0);
  });

  it('does not retry a 404', async () => {
    const manifest = manifestFor(1, 0);
    const handler: Handler = async () => response('', 404, 'Not Found');
    const { options, deps, fetchMock } = harness({ manifest, handler, cli: { write: true } });

    await expect(runRecovery(options, deps)).rejects.toThrow(/failed with 404/);
    expect(fetchMock.calls).toHaveLength(1);
    expect(await gameCount()).toBe(0);
  });

  it('aborts when every attempt times out', async () => {
    vi.useFakeTimers();
    try {
      const manifest = manifestFor(1, 0);
      const handler: Handler = (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }))
          );
        });
      const { options, deps, fetchMock } = harness({ manifest, handler, cli: { write: true } });

      const promise = runRecovery(options, deps).catch((err: Error) => err);
      for (let i = 0; i < 4; i++) await vi.advanceTimersByTimeAsync(31_000);
      const error = await promise;

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/timed out after 30s/);
      expect(fetchMock.calls).toHaveLength(3);
    } finally {
      vi.useRealTimers();
    }
    expect(await gameCount()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 9. Partial batch
// ---------------------------------------------------------------------------

/** The synthetic game ids carried by a built INSERT's parameters. */
const idsOfInsert = (params: unknown[]): string[] =>
  params.filter((v): v is string => typeof v === 'string' && /^fixLi\d{3}$/.test(v));

describe('partial batch', () => {
  const TOTAL = BATCH_SIZE + 5;

  it('retries a half-applied batch with only the ids that are missing', async () => {
    const manifest = manifestFor(TOTAL, 0);
    const base = pgliteAdapter();
    let inserts = 0;
    let lost: string[] = [];
    const flaky: SqlAdapter = {
      query: async (text, params) => {
        if (!text.startsWith('INSERT')) return base.query(text, params);
        inserts++;
        if (inserts !== 2) return base.query(text, params);
        // Simulate a statement that reached the server and then lost the
        // connection: two rows are committed, the client sees only an error.
        lost = idsOfInsert(params as unknown[]).slice(0, 2);
        await base.query(
          `INSERT INTO games (lichess_game_id, source, color, result, elo, opponent, rated, speed)
           VALUES ($1,'lichess','W','W',1500,$3,true,'rapid'), ($2,'lichess','W','W',1500,$3,true,'rapid')`,
          [lost[0], lost[1], OPPONENT]
        );
        throw new Error('connection terminated unexpectedly');
      },
    };
    const { options, deps } = harness({ manifest, adapter: flaky, cli: { write: true } });
    const result = await runRecovery(options, deps);

    expect(lost).toHaveLength(2);
    // The ledger is exact: rows committed before the client saw the error count as this run's.
    expect(result.inserted).toBe(TOTAL);
    expect(result.insertedIds).toEqual(expect.arrayContaining(lost));
    expect(result.recoveredAfterError).toEqual(lost);
    expect(new Set(result.insertedIds)).toEqual(new Set(await storedIds()));
    expect(await gameCount()).toBe(TOTAL);
    expect(new Set(await storedIds()).size).toBe(TOTAL);

    const second = harness({ manifest, cli: { write: true } });
    const repeat = await runRecovery(second.options, second.deps);
    expect(repeat.inserted).toBe(0);
    expect(repeat.alreadyPresent).toBe(TOTAL);
    expect(await gameCount()).toBe(TOTAL);
  });

  it('stops and reports the inserted ids when the retry fails too', async () => {
    const manifest = manifestFor(TOTAL, 0);
    const base = pgliteAdapter();
    let inserts = 0;
    const broken: SqlAdapter = {
      query: async (text, params) => {
        if (!text.startsWith('INSERT')) return base.query(text, params);
        inserts++;
        if (inserts === 1) return base.query(text, params);
        throw new Error('connection terminated unexpectedly');
      },
    };
    const h = harness({ manifest, adapter: broken, cli: { write: true } });
    const code = await runCli(argvOf(h.options), h.deps);

    expect(code).not.toBe(0);
    expect(h.logs.join('\n')).toMatch(/already inserted: /);
    expect(h.logs.join('\n')).toContain(lichessId(0));
    expect(await gameCount()).toBe(BATCH_SIZE);
  });
});

// ---------------------------------------------------------------------------
// 10. Redaction
// ---------------------------------------------------------------------------

describe('redaction', () => {
  it('keeps credentials and hosts out of a failing run', async () => {
    const url = 'postgresql://user:pass@ep-x.aws.neon.tech/db';
    const h = harness({ cli: { target: 'local', confirmTarget: 'local', write: true } });
    h.createAdapter.mockRejectedValue(new Error(`could not connect to ${url} (password=hunter2)`));

    const code = await runCli(argvOf(h.options), h.deps);
    const output = h.logs.join('\n');

    expect(code).toBe(1);
    expect(output).not.toContain('user:pass');
    expect(output).not.toContain('ep-x.aws.neon.tech');
    expect(output).not.toContain('hunter2');
    expect(output).toContain('[redacted]');
  });

  it('redacts connection strings, secrets and bearer tokens anywhere', () => {
    const out = redact(
      'dsn=postgres://u:p@h/db token=abc123 Bearer xyz789 and the literal SECRET-LITERAL',
      ['SECRET-LITERAL']
    );
    expect(out).not.toMatch(/u:p@h|abc123|xyz789|SECRET-LITERAL/);
    expect(out).toContain('postgres://[redacted]');
  });

  it('never logs a PGN or an opponent name', async () => {
    const { options, deps, logs } = harness({ cli: { write: true } });
    await runRecovery(options, deps);
    const output = logs.join('\n');
    expect(output).not.toContain(OPPONENT);
    expect(output).not.toContain('1. e4 c6');
  });
});

// ---------------------------------------------------------------------------
// 11. Target guard
// ---------------------------------------------------------------------------

describe('target guard', () => {
  const guardCases: [string, Partial<CliOptions>, Record<string, string | undefined>, RegExp][] = [
    ['--write with no target', { write: true, target: undefined, confirmTarget: undefined }, {}, /--target must be preview, local or prod/],
    ['--write with no --confirm-target', { write: true, target: 'preview', confirmTarget: undefined }, {}, /--confirm-target is required/],
    ['the prod branch id', { write: true, target: 'preview', confirmTarget: 'br-royal-pond-afkmp27d' }, {}, /production branch or endpoint/],
    ['a URL on the prod endpoint', { write: true, target: 'preview', confirmTarget: PREVIEW_BRANCH_ID },
      { RECOVERY_DATABASE_URL: 'postgresql://u:p@ep-falling-thunder-af9y8mpb.aws.neon.tech/db' }, /production branch or endpoint/],
    ['an ambient DATABASE_URL', { write: true }, { DATABASE_URL: 'postgresql://u:p@somewhere/db' }, /ambient DATABASE_URL/],
    ['preview without RECOVERY_ALLOW_PREVIEW_WRITE', { write: true, target: 'preview', confirmTarget: PREVIEW_BRANCH_ID },
      { RECOVERY_DATABASE_URL: PREVIEW_URL }, /RECOVERY_ALLOW_PREVIEW_WRITE=1/],
    ['preview pointed at another endpoint', { write: true, target: 'preview', confirmTarget: PREVIEW_BRANCH_ID },
      { RECOVERY_DATABASE_URL: 'postgresql://u:p@ep-other-endpoint.aws.neon.tech/db', RECOVERY_ALLOW_PREVIEW_WRITE: '1' },
      /host must be the br-wispy-meadow/],
    ['preview confirmed as another branch', { write: true, target: 'preview', confirmTarget: 'br-some-other-branch' },
      { RECOVERY_DATABASE_URL: PREVIEW_URL, RECOVERY_ALLOW_PREVIEW_WRITE: '1' }, /requires --confirm-target br-wispy-meadow/],
    ['a prod target confirmed as something else', { write: true, target: 'prod', confirmTarget: 'whatever' }, {},
      /--target prod requires --confirm-target br-royal-pond/],
    ['local given a connection string', { write: true, target: 'local', confirmTarget: 'local' },
      { RECOVERY_DATABASE_URL: 'postgresql://u:p@db.example.com/db' }, /does not take RECOVERY_DATABASE_URL/],
    ['local without --pglite-dir', { write: true, target: 'local', confirmTarget: 'local', pgliteDir: undefined }, {},
      /requires --pglite-dir/],
  ];

  it.each(guardCases)('aborts without connecting on %s', async (_name, cli, env, expected) => {
    const { options, deps, createAdapter, fetchMock } = harness({ cli, env });
    await expect(runRecovery(options, deps)).rejects.toThrow(expected);
    expect(createAdapter).not.toHaveBeenCalled();
    expect(fetchMock.calls).toHaveLength(0);
    expect(await gameCount()).toBe(0);
  });

  it('accepts the confirmed preview branch on its own endpoint', async () => {
    const { options, deps, createAdapter } = harness({
      cli: { write: true, target: 'preview', confirmTarget: PREVIEW_BRANCH_ID },
      env: { RECOVERY_DATABASE_URL: PREVIEW_URL, RECOVERY_ALLOW_PREVIEW_WRITE: '1' },
    });
    const result = await runRecovery(options, deps);
    expect(createAdapter).toHaveBeenCalledWith({ target: 'preview', driver: 'neon', url: PREVIEW_URL });
    expect(result.inserted).toBe(5);
  });

  it('rejects an unknown flag', async () => {
    const h = harness({});
    const code = await runCli(['--manifest', 'x', '--nope'], h.deps);
    expect(code).toBe(1);
    expect(h.logs.join('\n')).toMatch(/Unknown argument: --nope/);
  });
});

// ---------------------------------------------------------------------------
// 12-13. Dry run and write surface
// ---------------------------------------------------------------------------

describe('dry run', () => {
  it('reports without issuing a single INSERT', async () => {
    const { options, deps, queries } = harness({ cli: { write: false } });
    const result = await runRecovery(options, deps);

    expect(result.mode).toBe('dry-run');
    expect(result.inserted).toBe(0);
    expect(result.alreadyPresent).toBe(0);
    expect(queries.every(text => text.startsWith('SELECT'))).toBe(true);
    expect(await gameCount()).toBe(0);
  });

  it('reports what is already stored without a target, and never connects', async () => {
    const { options, deps, createAdapter } = harness({
      cli: { write: false, target: undefined, confirmTarget: undefined },
    });
    const result = await runRecovery(options, deps);
    expect(createAdapter).not.toHaveBeenCalled();
    expect(result.alreadyPresent).toBeNull();
    expect(result.target).toBeNull();
  });

  it('builds its own in-memory pglite when no adapter factory is injected', async () => {
    // Exercises the real adapter factory: a fresh pglite has no schema, so the
    // first SELECT is what proves the driver loaded, connected and ran.
    const { options, deps } = harness({ cli: { write: true } });
    delete deps.createAdapter;
    // The read-only schema preflight is the first thing it runs against the fresh db.
    await expect(runRecovery(options, deps)).rejects.toThrow(/lacks columns/);
  }, 30_000);

  it('writes a report of ids, counts and timestamps only', async () => {
    const written: { path: string; body: string }[] = [];
    const { options, deps } = harness({ cli: { write: true, out: '/private/report.json' } });
    deps.openOut = async path => ({
      write: async body => {
        written.push({ path, body });
      },
      close: async () => {},
    });
    await runRecovery(options, deps);

    expect(written).toHaveLength(1);
    const report = JSON.parse(written[0].body);
    expect(Object.keys(report).sort()).toEqual([
      'alreadyPresent', 'alreadyPresentIds', 'finishedAt', 'inserted',
      'insertedIds', 'recoveredAfterError', 'requested', 'skippedConflict', 'startedAt', 'status',
      'wouldInsert',
    ]);
    expect(report.status).toBe('ok');
    expect(report.insertedIds).toHaveLength(5);
    expect(written[0].body).not.toContain(OPPONENT);
  });
});

describe('write surface', () => {
  const sources = ['lib/recoverGames.ts', 'recover-games-from-manifest.mts'].map(name => ({
    name,
    code: readFileSync(new URL(name, import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, ''),
  }));

  it.each(sources)('$name issues no UPDATE, DELETE, TRUNCATE or DDL', ({ code }) => {
    expect(code).not.toMatch(/\b(UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE)\b/);
    expect(code).not.toMatch(/\b(update|delete|truncate|alter|drop|create)\s+(table|from|into)\b/i);
  });

  it.each(sources)('$name pairs every INSERT with ON CONFLICT DO NOTHING', ({ code }) => {
    const inserts = code.match(/INSERT INTO/g) ?? [];
    const guarded = code.match(/ON CONFLICT \(lichess_game_id\) DO NOTHING/g) ?? [];
    expect(guarded).toHaveLength(inserts.length);
  });
});

// ---------------------------------------------------------------------------
// Review fixes: preflight, failure ledger, loose hosts, column alignment
// ---------------------------------------------------------------------------

describe('schema preflight', () => {
  it('passes on the real schema', async () => {
    await expect(preflightSchema(pgliteAdapter(), true)).resolves.toBeUndefined();
  });

  it('aborts before inserting when the source check does not admit chesscom', async () => {
    const adapter: SqlAdapter = {
      query: async (text, params) => {
        const rows = await pgliteAdapter().query(text, params);
        if (!text.includes('pg_constraint')) return rows;
        return rows.map(row =>
          row.conname === 'games_source_check'
            ? { ...row, def: "CHECK ((source = ANY (ARRAY['otb'::text, 'lichess'::text])))" }
            : row
        );
      },
    };
    const { options, deps, queries } = harness({ adapter, cli: { write: true } });
    await expect(runRecovery(options, deps)).rejects.toThrow(/migration 010/);
    expect(queries.some(text => text.startsWith('INSERT'))).toBe(false);
    expect(await gameCount()).toBe(0);
  });

  it('aborts when a column the INSERT names is missing', async () => {
    const adapter: SqlAdapter = {
      query: async (text, params) => {
        const rows = await pgliteAdapter().query(text, params);
        return text.includes('information_schema.columns') ? rows.filter(r => r.column_name !== 'clock_40') : rows;
      },
    };
    const { options, deps } = harness({ adapter, cli: { write: false } });
    await expect(runRecovery(options, deps)).rejects.toThrow(/lacks columns: clock_40/);
  });
});

describe('failure ledger', () => {
  it('writes the --out report with the ids already inserted when a run fails mid-way', async () => {
    const manifest = manifestFor(BATCH_SIZE + 5, 0);
    const base = pgliteAdapter();
    let inserts = 0;
    const broken: SqlAdapter = {
      query: async (text, params) => {
        if (!text.startsWith('INSERT')) return base.query(text, params);
        inserts++;
        if (inserts === 1) return base.query(text, params);
        throw new Error('connection terminated unexpectedly');
      },
    };
    const written: string[] = [];
    const { options, deps } = harness({ manifest, adapter: broken, cli: { write: true, out: '/private/r.json' } });
    deps.openOut = async () => ({
      write: async body => {
        written.push(body);
      },
      close: async () => {},
    });
    await expect(runRecovery(options, deps)).rejects.toThrow(/Batch failed twice/);
    expect(written).toHaveLength(1);
    const report = JSON.parse(written[0]);
    expect(report.status).toBe('failed');
    expect(report.inserted).toBe(BATCH_SIZE);
    expect(new Set(report.insertedIds)).toEqual(new Set(await storedIds()));
  });
});

describe('--out reservation', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'recover-out-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('writes the report to a fresh owner-only file', async () => {
    const out = join(dir, 'report.json');
    const { options, deps } = harness({ cli: { write: true, out } });
    await runRecovery(options, deps);

    expect(JSON.parse(await readFile(out, 'utf8')).insertedIds).toHaveLength(5);
    expect((await stat(out)).mode & 0o777).toBe(0o600);
  });

  it('refuses an existing --out before any INSERT and leaves the old ledger intact', async () => {
    const out = join(dir, 'report.json');
    await writeFile(out, 'previous ledger');
    const { options, deps, queries, createAdapter } = harness({ cli: { write: true, out } });

    await expect(runRecovery(options, deps)).rejects.toThrow(/Cannot reserve --out .*EEXIST/);
    expect(createAdapter).not.toHaveBeenCalled();
    expect(queries.some(text => text.startsWith('INSERT'))).toBe(false);
    expect(await gameCount()).toBe(0);
    expect(await readFile(out, 'utf8')).toBe('previous ledger');
  });

  it('refuses an --out in a missing directory before any INSERT', async () => {
    const out = join(dir, 'missing', 'report.json');
    const { options, deps, queries, createAdapter } = harness({ cli: { write: true, out } });

    await expect(runRecovery(options, deps)).rejects.toThrow(/Cannot reserve --out .*ENOENT/);
    expect(createAdapter).not.toHaveBeenCalled();
    expect(queries.some(text => text.startsWith('INSERT'))).toBe(false);
    expect(await gameCount()).toBe(0);
  });

  it('prints the inserted ids when the final report write fails', async () => {
    const { options, deps, logs } = harness({ cli: { write: true, out: '/private/r.json' } });
    deps.openOut = async () => ({
      write: async () => {
        throw new Error('ENOSPC: no space left on device');
      },
      close: async () => {},
    });

    await expect(runRecovery(options, deps)).rejects.toThrow(/ENOSPC/);
    const stored = await storedIds();
    expect(stored).toHaveLength(5);
    const line = logs.find(message => message.startsWith('inserted ids: '));
    expect(new Set(line?.slice('inserted ids: '.length).split(', '))).toEqual(new Set(stored));
  });

  it('keeps the original error when both the run and the report write fail', async () => {
    const manifest = manifestFor(BATCH_SIZE + 5, 0);
    const base = pgliteAdapter();
    let inserts = 0;
    const broken: SqlAdapter = {
      query: async (text, params) => {
        if (!text.startsWith('INSERT')) return base.query(text, params);
        inserts++;
        if (inserts === 1) return base.query(text, params);
        throw new Error('connection terminated unexpectedly');
      },
    };
    const { options, deps, logs } = harness({ manifest, adapter: broken, cli: { write: true, out: '/private/r.json' } });
    deps.openOut = async () => ({
      write: async () => {
        throw new Error('EIO: i/o error, write');
      },
      close: async () => {},
    });

    const code = await runCli(argvOf(options), deps);
    expect(code).toBe(1);
    expect(logs.some(message => /Batch failed twice/.test(message))).toBe(true);
    expect(logs.some(message => /Could not write report .*EIO/.test(message))).toBe(true);
    const line = logs.find(message => message.startsWith('inserted ids: '));
    const stored = await storedIds();
    expect(stored).toHaveLength(BATCH_SIZE);
    expect(new Set(line?.slice('inserted ids: '.length).split(', '))).toEqual(new Set(stored));
  });
});

describe('redaction of bare hosts', () => {
  it('hides a Neon host that appears without a connection string', () => {
    const out = redact('getaddrinfo ENOTFOUND ep-damp-cake-afjuq6h8-pooler.c-2.us-west-2.aws.neon.tech');
    expect(out).not.toMatch(/ep-damp-cake|neon\.tech/);
    expect(out).toContain('[redacted-host]');
  });
});

describe('column alignment', () => {
  it('GAME_COLUMNS and gameColumnValues stay the same length and order', async () => {
    const { GAME_COLUMNS, gameColumnValues } = await import('../api/_gameInsert.js');
    const sample = { color: 'W', result: 'W', elo: 1500, opp: 'x', rated: true } as Parameters<
      typeof gameColumnValues
    >[0];
    expect(gameColumnValues(sample)).toHaveLength(GAME_COLUMNS.length);
    expect(GAME_COLUMNS.slice(0, 2)).toEqual(['lichess_game_id', 'source']);
    expect(GAME_COLUMNS.slice(-4)).toEqual(['round', 'clock_20', 'clock_30', 'clock_40']);
  });
});

describe('database close failures', () => {
  const closingBadly = (): { handle: AdapterHandle; closed: () => number } => {
    let calls = 0;
    return {
      handle: {
        adapter: pgliteAdapter(),
        close: async () => {
          calls++;
          throw new Error('close exploded postgresql://u:secret@ep-xyz.neon.tech/db');
        },
      },
      closed: () => calls,
    };
  };

  it('still writes the ledger with the inserted ids and logs them, then rethrows', async () => {
    const written: string[] = [];
    const { handle, closed } = closingBadly();
    const { options, deps, logs } = harness({ cli: { write: true, out: '/private/r.json' } });
    deps.createAdapter = async () => handle;
    deps.openOut = async () => ({
      write: async body => {
        written.push(body);
      },
      close: async () => {},
    });

    await expect(runRecovery(options, deps)).rejects.toThrow(/close exploded/);
    expect(closed()).toBe(1);
    const stored = await storedIds();
    expect(stored).toHaveLength(5);
    expect(written).toHaveLength(1);
    const report = JSON.parse(written[0]);
    expect(report.status).toBe('failed');
    expect(new Set(report.insertedIds)).toEqual(new Set(stored));
    const line = logs.find(message => message.startsWith('inserted ids: '));
    expect(new Set(line?.slice('inserted ids: '.length).split(', '))).toEqual(new Set(stored));
    expect(logs.join('\n')).not.toContain('secret');
    expect(written[0]).not.toContain('secret');
  });

  it('logs the ids even without --out', async () => {
    const { handle } = closingBadly();
    const { options, deps, logs } = harness({ cli: { write: true } });
    deps.createAdapter = async () => handle;
    await expect(runRecovery(options, deps)).rejects.toThrow(/close exploded/);
    expect(logs.some(message => message.startsWith('inserted ids: '))).toBe(true);
  });

  it('keeps the earlier failure when the close fails too', async () => {
    const { handle } = closingBadly();
    const { options, deps } = harness({ cli: { write: true, out: '/private/r.json' } });
    deps.createAdapter = async () => ({
      adapter: {
        query: async (text, params) => {
          if (text.startsWith('INSERT')) throw new Error('connection terminated unexpectedly');
          return handle.adapter.query(text, params);
        },
      },
      close: handle.close,
    });
    deps.openOut = async () => ({ write: async () => {}, close: async () => {} });
    await expect(runRecovery(options, deps)).rejects.toThrow(/Batch failed twice/);
  });
});

// ---------------------------------------------------------------------------
// Prod target: pinned to this one manifest, branch and endpoint
// ---------------------------------------------------------------------------

describe('prod target', () => {
  const PROD_ENV = { RECOVERY_DATABASE_URL: PROD_URL };
  const WRITE_ENV = { ...PROD_ENV, RECOVERY_ALLOW_PROD_WRITE: '1' };
  const prodCli = (over: Partial<CliOptions> = {}): Partial<CliOptions> => ({
    target: 'prod',
    confirmTarget: PROD_BRANCH_ID,
    ...over,
  });
  const writeCli = (over: Partial<CliOptions> = {}): Partial<CliOptions> =>
    prodCli({ write: true, out: '/private/r.json', confirmBackupBranch: BACKUP_BRANCH, ...over });

  /** A synthetic manifest that "hashes" to the pin only through the test-only digest hook. */
  const pinned = (cli: Partial<CliOptions>, env: Record<string, string | undefined>) => {
    const h = harness({ cli: { expectSha256: PROD_MANIFEST_SHA256, ...cli }, env });
    h.options.expectSha256 = PROD_MANIFEST_SHA256;
    h.deps.digestSha256 = () => PROD_MANIFEST_SHA256;
    h.deps.openOut = async () => ({ write: async () => {}, close: async () => {} });
    return h;
  };

  it('a valid write reaches the adapter with the prod decision, via the real argv', async () => {
    const h = pinned(writeCli(), WRITE_ENV);
    const code = await runCli(argvOf(h.options), h.deps);
    expect(code).toBe(0);
    expect(h.createAdapter).toHaveBeenCalledWith({ target: 'prod', driver: 'neon', url: PROD_URL });
    expect(await gameCount()).toBe(5);
    expect(h.queries.every(text => text.startsWith('SELECT') || text.startsWith('INSERT'))).toBe(true);
  });

  it('a valid dry run reaches the adapter and issues no INSERT, without any write flag', async () => {
    const h = pinned(prodCli(), PROD_ENV);
    const result = await runRecovery(h.options, h.deps);
    expect(h.createAdapter).toHaveBeenCalledWith({ target: 'prod', driver: 'neon', url: PROD_URL });
    expect(result.mode).toBe('dry-run');
    expect(result.target).toBe('prod');
    expect(h.queries.length).toBeGreaterThan(0);
    expect(h.queries.every(text => text.startsWith('SELECT'))).toBe(true);
    expect(await gameCount()).toBe(0);
  });

  it('a second write is idempotent', async () => {
    const first = pinned(writeCli(), WRITE_ENV);
    await runRecovery(first.options, first.deps);
    const second = pinned(writeCli(), WRITE_ENV);
    const result = await runRecovery(second.options, second.deps);
    expect(result.inserted).toBe(0);
    expect(result.alreadyPresent).toBe(5);
    expect(await gameCount()).toBe(5);
  });

  it('pins the literal branch, endpoint and hash of this recovery', () => {
    expect(PROD_BRANCH_ID).toBe('br-royal-pond-afkmp27d');
    expect(PROD_MANIFEST_SHA256).toBe('f75fdd7c306665ac0f9826adeb50724583905d676c071e1684b7df610461319d');
    expect(PROD_URL).toContain('ep-falling-thunder-af9y8mpb');
  });

  const OTHER_HASH = 'b'.repeat(64);
  const rejections: [string, Partial<CliOptions>, Record<string, string | undefined>, RegExp][] = [
    ['the wrong branch', writeCli({ confirmTarget: PREVIEW_BRANCH_ID }), WRITE_ENV, /--target prod requires --confirm-target/],
    ['no --confirm-target', writeCli({ confirmTarget: undefined }), WRITE_ENV, /--confirm-target is required/],
    ['a host that is not the prod endpoint', writeCli(),
      { ...WRITE_ENV, RECOVERY_DATABASE_URL: 'postgresql://u:p@ep-other-endpoint.aws.neon.tech/db' }, /host must be the br-royal-pond/],
    ['the preview endpoint', writeCli(), { ...WRITE_ENV, RECOVERY_DATABASE_URL: PREVIEW_URL }, /host must be the br-royal-pond/],
    ['prod text only in the path of another host', writeCli(),
      { ...WRITE_ENV, RECOVERY_DATABASE_URL: 'postgresql://u:p@ep-other.aws.neon.tech/ep-falling-thunder-af9y8mpb' }, /host must be the br-royal-pond/],
    ['no RECOVERY_DATABASE_URL', writeCli(), { RECOVERY_ALLOW_PROD_WRITE: '1' }, /RECOVERY_DATABASE_URL is not set/],
    ['an ambient DATABASE_URL', writeCli(), { ...WRITE_ENV, DATABASE_URL: 'postgresql://u:p@x/db' }, /ambient DATABASE_URL/],
    ['an ambient DATABASE_URL on a dry run', prodCli(), { ...PROD_ENV, DATABASE_URL: 'postgresql://u:p@x/db' }, /ambient DATABASE_URL/],
    ['a write without RECOVERY_ALLOW_PROD_WRITE', writeCli(), PROD_ENV, /RECOVERY_ALLOW_PROD_WRITE=1/],
    ['a write with only the preview write flag', writeCli(), { ...PROD_ENV, RECOVERY_ALLOW_PREVIEW_WRITE: '1' }, /RECOVERY_ALLOW_PROD_WRITE=1/],
    ['a write without --out', writeCli({ out: undefined }), WRITE_ENV, /requires --out/],
    ['a write without --confirm-backup-branch', writeCli({ confirmBackupBranch: undefined }), WRITE_ENV, /requires --confirm-backup-branch/],
    ['a backup branch that is not a branch id', writeCli({ confirmBackupBranch: 'my-backup' }), WRITE_ENV, /look like a Neon branch id/],
    ['the prod branch as backup', writeCli({ confirmBackupBranch: PROD_BRANCH_ID }), WRITE_ENV, /not the prod or preview branch/],
    ['the preview branch as backup', writeCli({ confirmBackupBranch: PREVIEW_BRANCH_ID }), WRITE_ENV, /not the prod or preview branch/],
    ['--pglite-dir', writeCli({ pgliteDir: 'memory://' }), WRITE_ENV, /only valid with --target local/],
    ['--expect-sha256 that is not the pin', writeCli({ expectSha256: OTHER_HASH }), WRITE_ENV, /is not its hash/],
    ['--expect-sha256 that is not the pin on a dry run', prodCli({ expectSha256: OTHER_HASH }), PROD_ENV, /is not its hash/],
  ];

  it.each(rejections)('aborts without connecting on %s', async (_name, cli, env, expected) => {
    const h = harness({ cli, env });
    h.options.expectSha256 = cli.expectSha256 ?? PROD_MANIFEST_SHA256;
    h.deps.digestSha256 = () => PROD_MANIFEST_SHA256;
    await expect(runRecovery(h.options, h.deps)).rejects.toThrow(expected);
    expect(h.createAdapter).not.toHaveBeenCalled();
    expect(h.fetchMock.calls).toHaveLength(0);
    expect(await gameCount()).toBe(0);
  });

  it('rejects a file that does not hash to the pin even when --expect-sha256 is the pin', async () => {
    const h = harness({ cli: writeCli(), env: WRITE_ENV });
    h.options.expectSha256 = PROD_MANIFEST_SHA256;
    await expect(runRecovery(h.options, h.deps)).rejects.toThrow(/does not match --expect-sha256/);
    expect(h.createAdapter).not.toHaveBeenCalled();
    expect(h.fetchMock.calls).toHaveLength(0);
  });

  it('rejects an alternative 78-game manifest with another real sha256, even if --expect-sha256 names it', async () => {
    const alternative = manifestFor(43, 35);
    const bytes = Buffer.from(JSON.stringify(alternative));
    const own = sha256(bytes);
    expect(own).not.toBe(PROD_MANIFEST_SHA256);
    const h = harness({ manifest: alternative, bytes, hash: own, cli: writeCli(), env: WRITE_ENV });
    await expect(runRecovery(h.options, h.deps)).rejects.toThrow(/is not its hash/);
    expect(h.createAdapter).not.toHaveBeenCalled();
    expect(h.fetchMock.calls).toHaveLength(0);
    expect(await gameCount()).toBe(0);
  });

  it('rejects the pin as --expect-sha256 over bytes that do not hash to it (no hook)', async () => {
    const alternative = manifestFor(43, 35);
    const bytes = Buffer.from(JSON.stringify(alternative));
    const h = harness({ manifest: alternative, bytes, hash: PROD_MANIFEST_SHA256, cli: writeCli(), env: WRITE_ENV });
    await expect(runRecovery(h.options, h.deps)).rejects.toThrow(/does not match --expect-sha256/);
    expect(h.createAdapter).not.toHaveBeenCalled();
  });

  it('still denies prod branch and endpoint to preview and local targets', async () => {
    const preview = harness({
      cli: { write: true, target: 'preview', confirmTarget: PREVIEW_BRANCH_ID },
      env: { RECOVERY_DATABASE_URL: PROD_URL, RECOVERY_ALLOW_PREVIEW_WRITE: '1' },
    });
    await expect(runRecovery(preview.options, preview.deps)).rejects.toThrow(/production branch or endpoint/);
    const previewBranch = harness({ cli: { write: true, target: 'preview', confirmTarget: PROD_BRANCH_ID }, env: {} });
    await expect(runRecovery(previewBranch.options, previewBranch.deps)).rejects.toThrow(/production branch or endpoint/);
    const local = harness({ cli: { target: 'local', confirmTarget: 'local', pgliteDir: `./${PROD_BRANCH_ID}` } });
    await expect(runRecovery(local.options, local.deps)).rejects.toThrow(/production branch or endpoint/);
    expect(preview.createAdapter).not.toHaveBeenCalled();
  });

  it('keeps the ledger reservation before connecting on a prod write', async () => {
    const h = pinned(writeCli(), WRITE_ENV);
    h.deps.openOut = async () => {
      throw new Error('EEXIST');
    };
    await expect(runRecovery(h.options, h.deps)).rejects.toThrow(/Cannot reserve --out/);
    expect(h.createAdapter).not.toHaveBeenCalled();
  });
});
