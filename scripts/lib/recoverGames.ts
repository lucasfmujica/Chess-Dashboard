/**
 * Closed-manifest importer: pure, injectable logic behind
 * scripts/recover-games-from-manifest.mts.
 *
 * The run is closed: a private manifest pinned by its SHA-256 lists exactly
 * which native game ids may be imported. Anything that does not line up —
 * a hash mismatch, a malformed entry, a provider game whose metadata
 * contradicts the manifest, a manifest id the provider never returned — stops
 * the whole run before a single row is written. The only statements this file
 * ever issues are SELECT and INSERT ... ON CONFLICT DO NOTHING; see the
 * write-surface test in scripts/recover-games-from-manifest.test.ts.
 *
 * Everything the outside world touches (fetch, the sql adapter, the clock, the
 * logger, the filesystem) is injected, so the tests run against an in-process
 * Postgres with a mocked fetch and never reach the network or Neon.

 *
 * The target guard is by flags, environment and a host pin (preview or prod
 * endpoint id; prod is denylisted for every other target). `--target prod` is
 * additionally pinned to this one manifest's SHA-256 and to a named backup
 * branch. It does not ask Neon which branch it is connected to: that needs API
 * access the importer deliberately lacks.
 * Before any write a read-only preflight checks the destination schema.
 */
import { createHash } from 'node:crypto';
import { readFile, open } from 'node:fs/promises';

import { transformLichessGames, type LichessRawGame } from '../../src/utils/lichessApi.js';
import { transformChessComGames, type ChessComRawGame } from '../../src/utils/chessComApi.js';
import type { GameInput } from '../../api/_gameMapper.js';
import { GAME_COLUMNS, gameColumnValues } from '../../api/_gameInsert.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Identifying UA for both public APIs, same string the cron sends. */
export const USER_AGENT =
  'Chess-Dashboard/1.0 (github.com/lucasfmujica/Chess-Dashboard; contact via GitHub issues)';

export const LICHESS_IDS_ENDPOINT = 'https://lichess.org/api/games/export/_ids';
export const LICHESS_QUERY = 'moves=true&pgnInJson=true&clocks=true&evals=false&opening=true&ratingDiff=true';
/** Lichess accepts at most 300 ids per `_ids` request. */
export const LICHESS_IDS_PER_REQUEST = 300;

export const CHESSCOM_ARCHIVE_BASE = 'https://api.chess.com/pub/player';
/** Chess.com asks for serial requests; archives are never hit in a burst. */
export const CHESSCOM_DELAY_MS = 1000;

export const REQUEST_TIMEOUT_MS = 30_000;
/** Retries *after* the first attempt, only for 429 / 5xx / network errors. */
export const MAX_RETRIES = 2;

/** Rows per INSERT statement. */
export const BATCH_SIZE = 25;

/** Prod branch and endpoint. Never a valid destination for this importer. */
export const PROD_DENYLIST = ['br-royal-pond-afkmp27d', 'ep-falling-thunder-af9y8mpb'];
/** The one Neon branch `--target prod` may point at, and its endpoint. */
export const PROD_BRANCH_ID = 'br-royal-pond-afkmp27d';
export const PROD_ENDPOINT_PREFIX = 'ep-falling-thunder-af9y8mpb';
/** `--target prod` only runs this manifest: the hash is not configurable. */
export const PROD_MANIFEST_SHA256 = 'f75fdd7c306665ac0f9826adeb50724583905d676c071e1684b7df610461319d';
/** The one Neon branch `--target preview` may point at. */
export const PREVIEW_BRANCH_ID = 'br-wispy-meadow-af1r6nk7';
/** Its endpoint: the host has to match the confirmed branch, not just any preview. */
export const PREVIEW_ENDPOINT_PREFIX = 'ep-damp-cake-afjuq6h8';

const MANIFEST_NAME = 'chess-recovery-78';
const MANIFEST_VERSION = 1;
const PROVIDERS = ['lichess', 'chesscom'] as const;
/** The variant each provider calls "standard chess". */
const VARIANT_BY_PROVIDER: Record<Provider, string> = { lichess: 'standard', chesscom: 'chess' };
const ART_TIME_ZONE = 'America/Argentina/Buenos_Aires';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SHA256_RE = /^[0-9a-f]{64}$/i;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Provider = (typeof PROVIDERS)[number];

export interface ManifestGame {
  provider: Provider;
  source: Provider;
  id: string;
  date: string;
  speed: string;
  rated: boolean;
  variant: string;
  user: string;
}

export interface ManifestScope {
  user: string;
  providers: Provider[];
  rated: boolean;
  variant: string;
  speed: string;
  date_from_utc_inclusive: string;
  date_to_utc_inclusive: string;
}

export interface Manifest {
  manifest: string;
  version: number;
  scope: ManifestScope;
  counts: Record<string, number>;
  total: number;
  games: ManifestGame[];
}

/** The slice of a sql client this importer needs. Both drivers adapt to it. */
export interface SqlAdapter {
  query: (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
}

export interface AdapterHandle {
  adapter: SqlAdapter;
  close: () => Promise<void>;
}

export type TargetDecision =
  | { target: 'local'; driver: 'pglite'; dataDir: string }
  | { target: 'preview'; driver: 'neon'; url: string }
  | { target: 'prod'; driver: 'neon'; url: string };

export interface CliOptions {
  manifest?: string;
  expectSha256?: string;
  write: boolean;
  target?: string;
  confirmTarget?: string;
  confirmBackupBranch?: string;
  pgliteDir?: string;
  out?: string;
}

export interface RecoverDeps {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  log?: (message: string) => void;
  sleep?: (ms: number) => Promise<void>;
  createAdapter?: (decision: TargetDecision) => Promise<AdapterHandle>;
  readManifest?: (path: string) => Promise<Buffer>;
  /** Reserves the --out file before the run touches the database. Must fail if the path exists. */
  openOut?: (path: string) => Promise<ReportSink>;
  now?: () => Date;
  chesscomDelayMs?: number;
  /** Tests only: replaces the manifest digest so a synthetic file can hash to the prod pin. */
  digestSha256?: (bytes: Buffer | Uint8Array) => string;
}

/** A reserved --out file: the report is written to it once, at the end of the run. */
export interface ReportSink {
  write: (body: string) => Promise<void>;
  close: () => Promise<void>;
}

export interface RecoverResult {
  mode: 'dry-run' | 'write';
  target: 'local' | 'preview' | 'prod' | null;
  requested: number;
  /** Manifest ids already in `games` before this run. Null when offline. */
  alreadyPresent: number | null;
  alreadyPresentIds: string[];
  /** Games not already present when the run started (what a write would attempt). */
  wouldInsert: number;
  /** Rows this run created: INSERT ... RETURNING, plus any recovered after a client-side error. */
  inserted: number;
  /** pending − inserted: games attempted but skipped by ON CONFLICT (a concurrent run won). 0 in dry-run. */
  skippedConflict: number;
  insertedIds: string[];
  /** Subset of insertedIds found committed after the client saw the INSERT fail. */
  recoveredAfterError: string[];
  status: 'ok' | 'failed';
  startedAt: string;
  finishedAt: string;
}

/** Anything this importer refuses to do. Carries ids already written, if any. */
export class RecoveryError extends Error {
  readonly insertedIds: string[];
  constructor(message: string, insertedIds: string[] = []) {
    super(message);
    this.name = 'RecoveryError';
    this.insertedIds = insertedIds;
  }
}

function fail(message: string, insertedIds: string[] = []): never {
  throw new RecoveryError(message, insertedIds);
}

// ---------------------------------------------------------------------------
// Redaction
// ---------------------------------------------------------------------------

const CONNECTION_URL_RE = /postgres(?:ql)?:\/\/[^\s'"`,)]+/gi;
const SECRET_PARAM_RE = /\b(password|pass|pwd|token|api[_-]?key|secret|access[_-]?key)\s*=\s*[^\s&'"`,;)]+/gi;
const BEARER_RE = /\bBearer\s+[^\s'"`,;)]+/gi;
/** Bare Neon hosts / endpoint ids (e.g. in a getaddrinfo error), with or without a domain. */
const NEON_HOST_RE = /\bep-[a-z0-9-]+(?:\.[a-z0-9.-]+)?\b|\b[a-z0-9.-]+\.neon\.tech\b/gi;

/**
 * Flattens anything printable to a string with connection strings, passwords
 * and tokens taken out. `secrets` are extra literals (the configured
 * RECOVERY_DATABASE_URL) blanked wherever they appear verbatim.
 */
export function redact(value: unknown, secrets: (string | undefined)[] = []): string {
  let text: string;
  if (value instanceof Error) {
    // A stack already starts with "Name: message"; fall back when there is none.
    text = value.stack ?? `${value.name}: ${value.message}`;
  } else if (typeof value === 'string') {
    text = value;
  } else {
    try {
      text = JSON.stringify(value) ?? String(value);
    } catch {
      text = String(value);
    }
  }
  for (const secret of secrets) {
    if (secret && secret.length > 0) text = text.split(secret).join('[redacted]');
  }
  return text
    .replace(CONNECTION_URL_RE, 'postgres://[redacted]')
    .replace(SECRET_PARAM_RE, (_m, key: string) => `${key}=[redacted]`)
    .replace(BEARER_RE, 'Bearer [redacted]')
    .replace(NEON_HOST_RE, '[redacted-host]');
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const VALUE_FLAGS: Record<string, keyof CliOptions> = {
  '--manifest': 'manifest',
  '--expect-sha256': 'expectSha256',
  '--target': 'target',
  '--confirm-target': 'confirmTarget',
  '--confirm-backup-branch': 'confirmBackupBranch',
  '--pglite-dir': 'pgliteDir',
  '--out': 'out',
};

export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { write: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--write') {
      options.write = true;
      continue;
    }
    const key = VALUE_FLAGS[arg];
    if (!key) fail(`Unknown argument: ${arg}`);
    const value = argv[++i];
    if (value === undefined || value.startsWith('--')) fail(`${arg} needs a value`);
    (options as unknown as Record<string, unknown>)[key] = value;
  }
  return options;
}

// ---------------------------------------------------------------------------
// Manifest: hash + strict validation
// ---------------------------------------------------------------------------

export const sha256 = (bytes: Buffer | Uint8Array): string =>
  createHash('sha256').update(bytes).digest('hex');

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown, where: string): string => {
  if (typeof v !== 'string' || v.length === 0) fail(`${where} must be a non-empty string`);
  return v;
};

const isProvider = (v: unknown): v is Provider => (PROVIDERS as readonly string[]).includes(v as string);

/**
 * Parses the manifest bytes and checks every invariant the run depends on.
 * Nothing here is specific to a count: the expected total comes from the
 * manifest itself, so fixtures are small manifests with their own hash.
 */
export function parseManifest(bytes: Buffer | Uint8Array): Manifest {
  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (err) {
    return fail(`Manifest is not valid JSON: ${(err as Error).message}`);
  }
  if (!isObject(raw)) return fail('Manifest must be a JSON object');
  if (raw.manifest !== MANIFEST_NAME) return fail(`Manifest must be "${MANIFEST_NAME}"`);
  if (raw.version !== MANIFEST_VERSION) return fail(`Manifest version must be ${MANIFEST_VERSION}`);

  if (!isObject(raw.scope)) return fail('Manifest scope must be an object');
  const rawScope = raw.scope;
  const user = str(rawScope.user, 'scope.user');
  if (!Array.isArray(rawScope.providers) || rawScope.providers.length === 0) {
    return fail('scope.providers must be a non-empty array');
  }
  for (const p of rawScope.providers) {
    if (!isProvider(p)) return fail(`scope.providers has an unknown provider: ${String(p)}`);
  }
  const providers = rawScope.providers as Provider[];
  if (rawScope.rated !== true) return fail('scope.rated must be true');
  const variant = str(rawScope.variant, 'scope.variant');
  const speed = str(rawScope.speed, 'scope.speed');
  const from = str(rawScope.date_from_utc_inclusive, 'scope.date_from_utc_inclusive');
  const to = str(rawScope.date_to_utc_inclusive, 'scope.date_to_utc_inclusive');
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) return fail('scope dates must be YYYY-MM-DD');
  if (from > to) return fail('scope.date_from_utc_inclusive is after date_to_utc_inclusive');

  if (!isObject(raw.counts)) return fail('Manifest counts must be an object');
  const counts: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw.counts)) {
    if (!isProvider(key)) return fail(`counts has an unknown provider: ${key}`);
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
      return fail(`counts.${key} must be a non-negative integer`);
    }
    counts[key] = value;
  }
  if (typeof raw.total !== 'number' || !Number.isInteger(raw.total) || raw.total < 0) {
    return fail('Manifest total must be a non-negative integer');
  }
  if (!Array.isArray(raw.games)) return fail('Manifest games must be an array');
  if (raw.total !== raw.games.length) {
    return fail(`Manifest total (${raw.total}) does not match games.length (${raw.games.length})`);
  }

  const scope: ManifestScope = {
    user,
    providers,
    rated: true,
    variant,
    speed,
    date_from_utc_inclusive: from,
    date_to_utc_inclusive: to,
  };

  const seen = new Set<string>();
  const perProvider: Record<string, number> = {};
  const games: ManifestGame[] = raw.games.map((entry, index) => {
    const where = `games[${index}]`;
    if (!isObject(entry)) return fail(`${where} must be an object`);
    const provider = entry.provider;
    if (!isProvider(provider)) return fail(`${where}.provider is not a known provider`);
    if (entry.source !== provider) return fail(`${where}.source does not match ${where}.provider`);
    if (!providers.includes(provider)) return fail(`${where}.provider is outside scope.providers`);
    const id = str(entry.id, `${where}.id`);
    if (seen.has(id)) return fail(`${where}.id is a duplicate: ${id}`);
    seen.add(id);
    const date = str(entry.date, `${where}.date`);
    if (!DATE_RE.test(date)) return fail(`${where}.date must be YYYY-MM-DD`);
    if (date < from || date > to) return fail(`${where}.date ${date} is outside the manifest scope`);
    if (entry.speed !== speed) return fail(`${where}.speed must be ${speed}`);
    if (entry.rated !== true) return fail(`${where}.rated must be true`);
    if (entry.variant !== VARIANT_BY_PROVIDER[provider]) {
      return fail(`${where}.variant must be ${VARIANT_BY_PROVIDER[provider]} for ${provider}`);
    }
    if (entry.user !== user) return fail(`${where}.user does not match scope.user`);
    perProvider[provider] = (perProvider[provider] ?? 0) + 1;
    return { provider, source: provider, id, date, speed, rated: true, variant: entry.variant, user };
  });

  for (const provider of new Set([...Object.keys(counts), ...Object.keys(perProvider)])) {
    const declared = counts[provider] ?? 0;
    const actual = perProvider[provider] ?? 0;
    if (declared !== actual) {
      return fail(`counts.${provider} says ${declared} but games has ${actual}`);
    }
  }
  const countsTotal = Object.values(counts).reduce((a, b) => a + b, 0);
  if (countsTotal !== raw.total) {
    return fail(`counts sum to ${countsTotal} but total is ${raw.total}`);
  }

  return { manifest: MANIFEST_NAME, version: MANIFEST_VERSION, scope, counts, total: raw.total, games };
}

// ---------------------------------------------------------------------------
// Target guard
// ---------------------------------------------------------------------------

const BRANCH_ID_RE = /^br-[a-z0-9]+(?:-[a-z0-9]+)+$/;

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
};

/**
 * Decides where this run is allowed to connect, fail-closed, before any
 * adapter exists. The connection string is only ever read from
 * RECOVERY_DATABASE_URL; an ambient DATABASE_URL (the app's own, usually prod)
 * stops the run outright rather than being quietly ignored.
 */
export function resolveTarget(
  options: CliOptions,
  env: Record<string, string | undefined>
): TargetDecision {
  const { target, confirmTarget, pgliteDir } = options;
  if (target !== 'preview' && target !== 'local' && target !== 'prod') {
    return fail('--target must be preview, local or prod');
  }
  if (!confirmTarget) return fail('--confirm-target is required');
  if (env.DATABASE_URL) {
    return fail('An ambient DATABASE_URL is set; unset it and use RECOVERY_DATABASE_URL only');
  }

  const recoveryUrl = env.RECOVERY_DATABASE_URL ?? '';

  if (target === 'prod') {
    // The denylist does not apply here: the pins below are stricter than it.
    if (pgliteDir) return fail('--pglite-dir is only valid with --target local');
    if (confirmTarget !== PROD_BRANCH_ID) {
      return fail(`--target prod requires --confirm-target ${PROD_BRANCH_ID}`);
    }
    if (!recoveryUrl) return fail('RECOVERY_DATABASE_URL is not set');
    if (!hostOf(recoveryUrl).startsWith(PROD_ENDPOINT_PREFIX)) {
      return fail(`RECOVERY_DATABASE_URL host must be the ${PROD_BRANCH_ID} endpoint`);
    }
    if (options.write) {
      if (env.RECOVERY_ALLOW_PROD_WRITE !== '1') {
        return fail('Writing to prod additionally needs RECOVERY_ALLOW_PROD_WRITE=1');
      }
      if (!options.out) return fail('Writing to prod requires --out <private path> (the rollback ledger)');
      const backup = options.confirmBackupBranch;
      if (!backup) return fail('Writing to prod requires --confirm-backup-branch <br-...> (an existing Neon backup branch)');
      if (!BRANCH_ID_RE.test(backup)) return fail('--confirm-backup-branch must look like a Neon branch id (br-...)');
      if (backup === PROD_BRANCH_ID || backup === PREVIEW_BRANCH_ID) {
        return fail('--confirm-backup-branch must be a backup branch, not the prod or preview branch');
      }
    }
    return { target: 'prod', driver: 'neon', url: recoveryUrl };
  }
  for (const denied of PROD_DENYLIST) {
    if (confirmTarget.includes(denied) || recoveryUrl.includes(denied) || (pgliteDir ?? '').includes(denied)) {
      return fail(`Refusing to run against the production branch or endpoint (${denied})`);
    }
  }

  if (target === 'local') {
    if (confirmTarget !== 'local') return fail("--target local requires --confirm-target local");
    // Local means an in-process pglite only: a connection string here would be ambiguous.
    if (recoveryUrl) return fail('--target local does not take RECOVERY_DATABASE_URL; use --pglite-dir');
    if (!pgliteDir) return fail('--target local requires --pglite-dir <path|memory://>');
    return { target: 'local', driver: 'pglite', dataDir: pgliteDir };
  }

  if (pgliteDir) return fail('--pglite-dir is only valid with --target local');
  if (confirmTarget !== PREVIEW_BRANCH_ID) {
    return fail(`--target preview requires --confirm-target ${PREVIEW_BRANCH_ID}`);
  }
  if (!recoveryUrl) return fail('RECOVERY_DATABASE_URL is not set');
  if (!hostOf(recoveryUrl).startsWith(PREVIEW_ENDPOINT_PREFIX)) {
    return fail(`RECOVERY_DATABASE_URL host must be the ${PREVIEW_BRANCH_ID} endpoint`);
  }
  if (options.write && env.RECOVERY_ALLOW_PREVIEW_WRITE !== '1') {
    return fail('Writing to preview additionally needs RECOVERY_ALLOW_PREVIEW_WRITE=1');
  }
  return { target: 'preview', driver: 'neon', url: recoveryUrl };
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

/** Raw Lichess game as the `_ids` export returns it (only what is validated). */
interface LichessExportGame {
  id: string;
  rated?: boolean;
  variant?: string;
  speed?: string;
  perf?: string;
  createdAt?: number;
  players?: { white?: { user?: { name?: string } }; black?: { user?: { name?: string } } };
  [key: string]: unknown;
}

interface ChessComArchiveGame {
  uuid: string;
  rated?: boolean;
  rules?: string;
  time_class?: string;
  end_time?: number;
  white?: { username?: string };
  black?: { username?: string };
  [key: string]: unknown;
}

const defaultSleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const isRetriable = (status: number): boolean => status === 429 || status >= 500;

interface RequestDeps {
  fetchImpl: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  log: (message: string) => void;
}

/**
 * One HTTP request with a 30 s abort and bounded retries. 429 and 5xx back
 * off and try again; any other 4xx is final, because retrying a 404 just
 * burns the provider's rate limit.
 */
async function request(url: string, init: RequestInit, deps: RequestDeps, label: string): Promise<string> {
  let lastError = '';
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await deps.sleep(500 * 2 ** (attempt - 1));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await deps.fetchImpl(url, { ...init, signal: controller.signal });
      if (response.ok) return await response.text();
      if (!isRetriable(response.status)) {
        return fail(`${label} failed with ${response.status} ${response.statusText}`);
      }
      lastError = `${response.status} ${response.statusText}`;
    } catch (err) {
      if (err instanceof RecoveryError) throw err;
      lastError = controller.signal.aborted
        ? `timed out after ${REQUEST_TIMEOUT_MS / 1000}s`
        : (err as Error).message;
    } finally {
      clearTimeout(timer);
    }
    deps.log(`${label}: attempt ${attempt + 1} failed (${lastError})`);
  }
  return fail(`${label} failed after ${MAX_RETRIES + 1} attempts: ${lastError}`);
}

const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

export async function fetchLichess(ids: string[], deps: RequestDeps): Promise<LichessExportGame[]> {
  const games: LichessExportGame[] = [];
  for (const group of chunk(ids, LICHESS_IDS_PER_REQUEST)) {
    const body = await request(
      `${LICHESS_IDS_ENDPOINT}?${LICHESS_QUERY}`,
      {
        method: 'POST',
        body: group.join(','),
        headers: {
          Accept: 'application/x-ndjson',
          'Content-Type': 'text/plain',
          'User-Agent': USER_AGENT,
        },
      },
      deps,
      `Lichess export of ${group.length} ids`
    );
    for (const [index, line] of body.split('\n').entries()) {
      if (!line.trim()) continue;
      try {
        games.push(JSON.parse(line) as LichessExportGame);
      } catch {
        // A closed run cannot shrug off an unreadable line: it might be one of
        // the games we are supposed to import.
        fail(`Lichess returned an NDJSON line that does not parse (line ${index + 1})`);
      }
    }
  }
  return games;
}

/** `YYYY/MM` for every UTC month the manifest's Chess.com games fall in. */
export const chesscomMonths = (games: ManifestGame[]): string[] =>
  [...new Set(games.filter(g => g.provider === 'chesscom').map(g => g.date.slice(0, 7)))]
    .sort()
    .map(month => month.replace('-', '/'));

export async function fetchChessCom(
  user: string,
  months: string[],
  wantedIds: Set<string>,
  deps: RequestDeps,
  delayMs: number
): Promise<ChessComArchiveGame[]> {
  const games: ChessComArchiveGame[] = [];
  for (const [index, month] of months.entries()) {
    if (index > 0) await deps.sleep(delayMs);
    const url = `${CHESSCOM_ARCHIVE_BASE}/${encodeURIComponent(user.toLowerCase())}/games/${month}`;
    const body = await request(
      url,
      { headers: { Accept: 'application/json', 'User-Agent': USER_AGENT } },
      deps,
      `Chess.com archive ${month}`
    );
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      return fail(`Chess.com archive ${month} did not return valid JSON`);
    }
    const monthGames = isObject(parsed) && Array.isArray(parsed.games) ? parsed.games : [];
    for (const game of monthGames as ChessComArchiveGame[]) {
      if (isObject(game) && typeof game.uuid === 'string' && wantedIds.has(game.uuid)) games.push(game);
    }
  }
  return games;
}

// ---------------------------------------------------------------------------
// Validation of fetched games against the manifest
// ---------------------------------------------------------------------------

const utcDate = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

const sameUser = (a: string | undefined, b: string): boolean =>
  typeof a === 'string' && a.toLowerCase() === b.toLowerCase();

function checkLichess(raw: LichessExportGame, expected: ManifestGame, user: string): void {
  const where = `Lichess ${expected.id}`;
  if (raw.rated !== true) fail(`${where}: the fetched game is not rated`);
  if (raw.variant !== 'standard') fail(`${where}: variant is ${String(raw.variant)}, not standard`);
  const speed = raw.speed ?? raw.perf;
  if (raw.speed !== undefined && raw.perf !== undefined && raw.speed !== raw.perf) {
    fail(`${where}: speed and perf disagree`);
  }
  if (speed !== 'rapid') fail(`${where}: speed is ${String(speed)}, not rapid`);
  if (typeof raw.createdAt !== 'number') fail(`${where}: createdAt is missing`);
  const date = utcDate(raw.createdAt);
  if (date !== expected.date) fail(`${where}: UTC date ${date} does not match the manifest`);
  const white = raw.players?.white?.user?.name;
  const black = raw.players?.black?.user?.name;
  if (!sameUser(white, user) && !sameUser(black, user)) fail(`${where}: the manifest user did not play it`);
}

function checkChessCom(raw: ChessComArchiveGame, expected: ManifestGame, user: string): void {
  const where = `Chess.com ${expected.id}`;
  if (raw.rated !== true) fail(`${where}: the fetched game is not rated`);
  if (raw.rules !== 'chess') fail(`${where}: rules is ${String(raw.rules)}, not chess`);
  if (raw.time_class !== 'rapid') fail(`${where}: time_class is ${String(raw.time_class)}, not rapid`);
  if (typeof raw.end_time !== 'number') fail(`${where}: end_time is missing`);
  const date = utcDate(raw.end_time * 1000);
  if (date !== expected.date) fail(`${where}: UTC date ${date} does not match the manifest`);
  if (!sameUser(raw.white?.username, user) && !sameUser(raw.black?.username, user)) {
    fail(`${where}: the manifest user did not play it`);
  }
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

/** Same shape the cron stores ("03:05 PM"), in Argentina time. */
const artTime = (ms: number): string =>
  new Date(ms).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: ART_TIME_ZONE });

/**
 * Maps the fetched games through the app's own transforms. Lichess played_time
 * is re-stamped in Argentina time the way api/_lichessSync.ts does (the
 * transform formats it in whatever zone the process runs in). Chess.com keeps
 * what transformChessComGames produces (UTC, 24h), which is how every chesscom
 * row already stored was written by the manual panel.
 */
export function mapGames(
  manifest: Manifest,
  lichess: LichessExportGame[],
  chesscom: ChessComArchiveGame[]
): GameInput[] {
  const user = manifest.scope.user;
  const byId = new Map<string, GameInput>();

  const lichessGames = transformLichessGames(lichess as unknown as LichessRawGame[], user) as GameInput[];
  const createdAtById = new Map(lichess.map(g => [g.id, g.createdAt as number]));
  for (const game of lichessGames) {
    byId.set(game.gameId as string, { ...game, time: artTime(createdAtById.get(game.gameId as string) as number) });
  }

  const chesscomGames = transformChessComGames(chesscom as unknown as ChessComRawGame[], user) as GameInput[];
  for (const game of chesscomGames) byId.set(game.gameId as string, game);

  return manifest.games.map(entry => {
    const mapped = byId.get(entry.id);
    if (!mapped) return fail(`No mapped game for manifest id ${entry.id}`);
    return mapped;
  });
}

// ---------------------------------------------------------------------------
// SQL
// ---------------------------------------------------------------------------

const EXISTING_IDS_SQL = 'SELECT lichess_game_id FROM games WHERE lichess_game_id = ANY($1)';

async function existingIds(adapter: SqlAdapter, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await adapter.query(EXISTING_IDS_SQL, [ids]);
  return new Set(rows.map(row => String(row.lichess_game_id)));
}

/** The one write statement this importer owns: insert-only, conflicts ignored. */
export function buildInsert(games: GameInput[]): { text: string; params: unknown[] } {
  const params: unknown[] = [];
  const tuples = games.map(game => {
    const values = gameColumnValues(game);
    const placeholders = values.map(value => {
      params.push(value);
      return `$${params.length}`;
    });
    return `(${placeholders.join(', ')})`;
  });
  const text =
    `INSERT INTO games (${GAME_COLUMNS.join(', ')}) VALUES ${tuples.join(', ')} ` +
    'ON CONFLICT (lichess_game_id) DO NOTHING RETURNING lichess_game_id';
  return { text, params };
}

/**
 * Read-only check that the destination has the shape the INSERT needs:
 * the columns it names, the UNIQUE key it relies on for idempotence and, when
 * the manifest has Chess.com games, a source CHECK that admits 'chesscom'
 * (migration 010). Runs in dry-run too: it is only SELECTs.
 */
export async function preflightSchema(adapter: SqlAdapter, needsChesscom: boolean): Promise<void> {
  const cols = await adapter.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'games' AND table_schema = current_schema()",
    []
  );
  const have = new Set(cols.map(row => String(row.column_name)));
  const missingCols = GAME_COLUMNS.filter(col => !have.has(col));
  if (missingCols.length > 0) fail(`Destination games table lacks columns: ${missingCols.join(', ')}`);

  const constraints = await adapter.query(
    "SELECT conname, contype, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = 'games'::regclass",
    []
  );
  const unique = constraints.some(
    row => String(row.contype) === 'u' && /^UNIQUE \(lichess_game_id\)$/.test(String(row.def))
  );
  if (!unique) fail('Destination games table has no UNIQUE (lichess_game_id) constraint');
  if (needsChesscom) {
    const check = constraints.find(row => String(row.conname) === 'games_source_check');
    if (!check || !String(check.def).includes("'chesscom'")) {
      fail("Destination games_source_check does not admit 'chesscom' (migration 010 missing)");
    }
  }
}

interface BatchOutcome {
  ids: string[];
  /** Ids this run wrote although the client saw the INSERT fail. */
  recovered: string[];
}

/**
 * Inserts one batch. Every game in `batch` was absent when the run started, so
 * if the INSERT errors and the re-check finds some of them present, those rows
 * were committed by this run (or by a concurrent run of the same manifest) and
 * are counted in the ledger as `recovered`, so the inserted ids stay the exact
 * set of rows created.
 */
async function insertBatch(
  adapter: SqlAdapter,
  batch: GameInput[],
  insertedSoFar: string[],
  log: (message: string) => void
): Promise<BatchOutcome> {
  const { text, params } = buildInsert(batch);
  try {
    const rows = await adapter.query(text, params);
    return { ids: rows.map(row => String(row.lichess_game_id)), recovered: [] };
  } catch (err) {
    if (err instanceof RecoveryError) throw err;
    log(`Batch of ${batch.length} failed; re-checking which ids landed`);
    let recovered: string[] = [];
    try {
      const ids = batch.map(game => game.gameId as string);
      const present = await existingIds(adapter, ids);
      recovered = ids.filter(id => present.has(id));
      const missing = batch.filter(game => !present.has(game.gameId as string));
      if (missing.length === 0) return { ids: recovered, recovered };
      const retry = buildInsert(missing);
      const rows = await adapter.query(retry.text, retry.params);
      return { ids: recovered.concat(rows.map(row => String(row.lichess_game_id))), recovered };
    } catch (retryErr) {
      return fail(
        `Batch failed twice (${(retryErr as Error).message}); stopping with ${insertedSoFar.length + recovered.length} ids inserted`,
        insertedSoFar.concat(recovered)
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------

async function defaultCreateAdapter(decision: TargetDecision): Promise<AdapterHandle> {
  if (decision.driver === 'pglite') {
    const { PGlite } = await import('@electric-sql/pglite');
    const db = decision.dataDir === 'memory://' ? new PGlite() : new PGlite(decision.dataDir);
    await db.waitReady;
    return {
      adapter: {
        query: async (text, params) =>
          (await db.query(text, params as unknown[])).rows as Record<string, unknown>[],
      },
      close: () => db.close(),
    };
  }
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(decision.url);
  return {
    adapter: {
      query: async (text, params) => (await sql.query(text, params)) as Record<string, unknown>[],
    },
    close: async () => {},
  };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

/**
 * Runs the importer end to end. Without `--write` it stops after reporting
 * what it would insert, having issued nothing but a SELECT.
 */
export async function runRecovery(options: CliOptions, deps: RecoverDeps = {}): Promise<RecoverResult> {
  const env = deps.env ?? process.env;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const sleep = deps.sleep ?? defaultSleep;
  const now = deps.now ?? (() => new Date());
  const secrets = [env.RECOVERY_DATABASE_URL];
  const rawLog = deps.log ?? ((message: string) => console.log(message));
  const log = (message: string): void => rawLog(redact(message, secrets));
  const startedAt = now().toISOString();

  // The guard runs first and connects to nothing: a bad destination must stop
  // the run before it so much as asks a provider for data.
  const decision = options.target || options.confirmTarget || options.write
    ? resolveTarget(options, env)
    : null;

  if (!options.manifest) fail('--manifest is required');
  if (!options.expectSha256) fail('--expect-sha256 is required');
  if (!SHA256_RE.test(options.expectSha256)) fail('--expect-sha256 must be 64 hex characters');
  if (decision?.target === 'prod' && options.expectSha256.toLowerCase() !== PROD_MANIFEST_SHA256) {
    fail('--target prod only runs the pinned manifest: --expect-sha256 is not its hash');
  }

  const readManifest = deps.readManifest ?? (path => readFile(path));
  const bytes = await readManifest(options.manifest);
  const actualHash = (deps.digestSha256 ?? sha256)(bytes);
  if (actualHash !== options.expectSha256.toLowerCase()) {
    fail(`Manifest sha256 ${actualHash} does not match --expect-sha256`);
  }
  if (decision?.target === 'prod' && actualHash !== PROD_MANIFEST_SHA256) {
    fail('--target prod only runs the pinned manifest: the file does not hash to it');
  }
  const manifest = parseManifest(bytes);
  log(`Manifest verified: ${manifest.total} games (${JSON.stringify(manifest.counts)})`);

  const requestDeps: RequestDeps = { fetchImpl, sleep, log };
  const lichessIds = manifest.games.filter(g => g.provider === 'lichess').map(g => g.id);
  const chesscomIds = manifest.games.filter(g => g.provider === 'chesscom').map(g => g.id);

  const lichessRaw = lichessIds.length > 0 ? await fetchLichess(lichessIds, requestDeps) : [];
  const chesscomRaw =
    chesscomIds.length > 0
      ? await fetchChessCom(
          manifest.scope.user,
          chesscomMonths(manifest.games),
          new Set(chesscomIds),
          requestDeps,
          deps.chesscomDelayMs ?? CHESSCOM_DELAY_MS
        )
      : [];
  log(`Fetched ${lichessRaw.length} Lichess and ${chesscomRaw.length} Chess.com games`);

  const lichessById = new Map(lichessRaw.map(g => [g.id, g]));
  const chesscomById = new Map(chesscomRaw.map(g => [g.uuid, g]));
  const manifestIds = new Set(manifest.games.map(g => g.id));
  for (const id of [...lichessById.keys(), ...chesscomById.keys()]) {
    if (!manifestIds.has(id)) fail(`Fetched a game that is not in the manifest: ${id}`);
  }
  const missing = manifest.games
    .filter(g => !(g.provider === 'lichess' ? lichessById : chesscomById).has(g.id))
    .map(g => g.id);
  if (missing.length > 0) fail(`The provider did not return ${missing.length} manifest ids: ${missing.join(', ')}`);

  for (const entry of manifest.games) {
    if (entry.provider === 'lichess') {
      checkLichess(lichessById.get(entry.id) as LichessExportGame, entry, manifest.scope.user);
    } else {
      checkChessCom(chesscomById.get(entry.id) as ChessComArchiveGame, entry, manifest.scope.user);
    }
  }
  const games = mapGames(manifest, lichessRaw, chesscomRaw);
  log(`Validated and mapped ${games.length} games`);

  // The report is the rollback ledger, so its file is claimed before the run
  // connects: an existing --out (a previous run's ledger) or an unwritable
  // path stops the run with nothing written to the database.
  let report: ReportSink | null = null;
  if (options.out) {
    try {
      report = await (deps.openOut ?? reserveOwnerOnly)(options.out);
    } catch (err) {
      fail(`Cannot reserve --out ${options.out}: ${(err as Error).message}`);
    }
  }

  let handle: AdapterHandle | null = null;
  let alreadyPresentIds: string[] = [];
  let insertedIds: string[] = [];
  let recoveredAfterError: string[] = [];
  let pendingCount = games.length;
  let failure: unknown = null;
  let closeError: unknown = null;
  try {
    if (decision) {
      handle = await (deps.createAdapter ?? defaultCreateAdapter)(decision);
      await preflightSchema(handle.adapter, chesscomIds.length > 0);
      const present = await existingIds(handle.adapter, [...manifestIds]);
      alreadyPresentIds = manifest.games.map(g => g.id).filter(id => present.has(id));
      pendingCount = games.length - alreadyPresentIds.length;
      log(`${alreadyPresentIds.length} of ${manifest.total} manifest ids are already stored`);
    } else {
      log('No target configured: reporting without consulting the database');
    }

    if (options.write && handle) {
      const present = new Set(alreadyPresentIds);
      const pending = games.filter(game => !present.has(game.gameId as string));
      for (const batch of chunk(pending, BATCH_SIZE)) {
        try {
          const outcome = await insertBatch(handle.adapter, batch, insertedIds, log);
          insertedIds = insertedIds.concat(outcome.ids);
          recoveredAfterError = recoveredAfterError.concat(outcome.recovered);
          log(`Batch of ${batch.length}: ${outcome.ids.length} inserted`);
        } catch (err) {
          if (err instanceof RecoveryError) insertedIds = err.insertedIds;
          throw err;
        }
      }
    } else {
      log(`Dry run: ${pendingCount} games would be inserted`);
    }
  } catch (err) {
    failure = err;
  } finally {
    // A close that throws must not skip the ledger below: it is rethrown after.
    if (handle) {
      try {
        await handle.close();
      } catch (err) {
        closeError = err;
        log(`Could not close the database connection: ${redact(err, secrets)}`);
      }
    }
  }

  const writing = options.write && Boolean(decision);
  const result: RecoverResult = {
    mode: options.write ? 'write' : 'dry-run',
    target: decision?.target ?? null,
    requested: manifest.total,
    alreadyPresent: decision ? alreadyPresentIds.length : null,
    alreadyPresentIds,
    wouldInsert: pendingCount,
    inserted: insertedIds.length,
    skippedConflict: writing && !failure ? pendingCount - insertedIds.length : 0,
    insertedIds,
    recoveredAfterError,
    status: failure || closeError ? 'failed' : 'ok',
    startedAt,
    finishedAt: now().toISOString(),
  };

  // The report is the rollback ledger: it is written on failure too.
  const reportedError = failure ?? closeError;
  let reportError: unknown = null;
  if (report) {
    const body = JSON.stringify(
      {
        status: result.status,
        error: reportedError ? redact(reportedError instanceof Error ? reportedError.message : reportedError, secrets) : undefined,
        startedAt: result.startedAt,
        finishedAt: result.finishedAt,
        requested: result.requested,
        alreadyPresent: result.alreadyPresent,
        wouldInsert: result.wouldInsert,
        inserted: result.inserted,
        skippedConflict: result.skippedConflict,
        insertedIds: result.insertedIds,
        recoveredAfterError: result.recoveredAfterError,
        alreadyPresentIds: result.alreadyPresentIds,
      },
      null,
      2
    );
    try {
      await report.write(body);
    } catch (err) {
      reportError = err;
    }
    try {
      await report.close();
    } catch (err) {
      reportError ??= err;
    }
    if (reportError) {
      // Without the ledger these lines are the only record of what to undo.
      log(`Could not write report to ${options.out}: ${(reportError as Error).message}`);
      log(`inserted ids: ${result.insertedIds.join(', ') || '(none)'}`);
      if (result.recoveredAfterError.length > 0) {
        log(`recovered after error: ${result.recoveredAfterError.join(', ')}`);
      }
    } else {
      log(`Report written to ${options.out}`);
    }
  }

  if (failure) throw failure;
  if (reportError) throw reportError;
  if (closeError) {
    if (result.insertedIds.length > 0) log(`inserted ids: ${result.insertedIds.join(', ')}`);
    throw closeError;
  }

  log(
    `requested=${result.requested} alreadyPresent=${result.alreadyPresent ?? 'unknown'} ` +
      `wouldInsert=${result.wouldInsert} inserted=${result.inserted} skippedConflict=${result.skippedConflict}`
  );
  if (result.insertedIds.length > 0) log(`inserted ids: ${result.insertedIds.join(', ')}`);
  if (result.recoveredAfterError.length > 0) {
    log(`recovered after error: ${result.recoveredAfterError.join(', ')}`);
  }
  return result;
}

/**
 * Report file, readable only by the user running the importer. Created with
 * 'wx' so it never replaces an earlier run's ledger.
 */
async function reserveOwnerOnly(path: string): Promise<ReportSink> {
  const handle = await open(path, 'wx', 0o600);
  try {
    await handle.chmod(0o600);
  } catch (err) {
    await handle.close();
    throw err;
  }
  return {
    write: body => handle.writeFile(body, 'utf8'),
    close: () => handle.close(),
  };
}

/**
 * CLI entry point. Returns the process exit code and never lets an error
 * escape unredacted.
 */
export async function runCli(argv: string[], deps: RecoverDeps = {}): Promise<number> {
  const env = deps.env ?? process.env;
  const secrets = [env.RECOVERY_DATABASE_URL];
  const log = deps.log ?? ((message: string) => console.log(message));
  try {
    await runRecovery(parseArgs(argv), deps);
    return 0;
  } catch (err) {
    log(redact(err, secrets));
    if (err instanceof RecoveryError && err.insertedIds.length > 0) {
      log(redact(`already inserted: ${err.insertedIds.join(', ')}`, secrets));
    }
    return 1;
  }
}
