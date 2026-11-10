import { transformLichessGames, type LichessRawGame } from '../src/utils/lichessApi.js';
import { insertGames, type GameSql } from './_gameInsert.js';
import type { GameInput } from './_gameMapper.js';

/**
 * Weekly Lichess pull for the cron. Same endpoint and parameters as the manual
 * sync in src/utils/lichessApi.ts (kept separate on purpose: that file is the
 * browser path and is not touched here), but server-side and bounded.
 *
 * Games inserted here are not linked to the repertoire: that matching runs
 * client-side (refetchAndLinkGames), so they link the next time the client
 * runs the matcher.
 */

/** Same public default the sync panel uses. */
export const LICHESS_USERNAME = 'lmujica24';

/**
 * Games per run. Games are requested oldest first (sort=dateAsc), so hitting it
 * keeps the oldest of the window and reports `truncated`; the next run starts
 * from the last stored day and continues from there.
 */
export const MAX_GAMES = 300;

/** Covers the request and the body read together. */
export const FETCH_TIMEOUT_MS = 30_000;

/** Whole Lichess part: fetch + parse + select + insert. */
export const TOTAL_DEADLINE_MS = 60_000;

export const USER_AGENT =
  'Chess-Dashboard/1.0 (github.com/lucasfmujica/Chess-Dashboard; contact via GitHub issues)';

export interface LichessSyncResult {
  since: string | null;
  fetched: number;
  inserted: number;
  skippedExisting: number;
  badLines: number;
  truncated: boolean;
}

type Sql = GameSql & ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>);

const DAY_MS = 86_400_000;

/** Same shape the client produces ("03:05 PM"), but in Argentina time. */
const artTime = (createdAt: number): string =>
  new Date(createdAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });

/** Rejects (without cancelling the work) once `ms` pass. */
async function withDeadline<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Lichess sync exceeded ${ms / 1000}s`)), ms);
  });
  try {
    return await Promise.race([work, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pulls games from the day before the newest stored Lichess game (played_date
 * is a UTC date, so the extra day is margin). Returns null when none are
 * stored: there is no automatic full backfill. Games already in the table are
 * skipped, so manual edits and earlier metadata are never rewritten. The whole
 * thing is bounded by TOTAL_DEADLINE_MS.
 */
export function syncLichess(sql: Sql): Promise<LichessSyncResult | null> {
  return withDeadline(runSync(sql), TOTAL_DEADLINE_MS);
}

async function runSync(sql: Sql): Promise<LichessSyncResult | null> {
  const [{ latest }] = (await sql`
    SELECT to_char(max(played_date), 'YYYY-MM-DD') AS latest FROM games WHERE source = 'lichess'
  `) as { latest: string | null }[];
  if (!latest) return null;

  const sinceMs = Date.parse(`${latest}T00:00:00Z`) - DAY_MS;
  const since = new Date(sinceMs).toISOString();

  const params = new URLSearchParams({
    rated: 'true',
    perfType: 'rapid,classical',
    moves: 'true',
    pgnInJson: 'true',
    clocks: 'true',
    evals: 'false',
    opening: 'true',
    ratingDiff: 'true',
    sort: 'dateAsc',
    max: String(MAX_GAMES),
    since: String(sinceMs),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let text: string;
  try {
    const res = await fetch(`https://lichess.org/api/games/user/${LICHESS_USERNAME}?${params}`, {
      headers: { Accept: 'application/x-ndjson', 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Lichess API error: ${res.status} ${res.statusText}`);
    text = await res.text();
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(`Lichess timed out after ${FETCH_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const raw: LichessRawGame[] = [];
  let badLines = 0;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      raw.push(JSON.parse(line));
    } catch {
      badLines++;
    }
  }

  const all = transformLichessGames(raw, LICHESS_USERNAME) as GameInput[];
  const createdAtById = new Map(raw.map(g => [g.id, g.createdAt]));

  let fresh = all;
  if (all.length > 0) {
    const ids = all.map(g => g.gameId);
    const rows = (await sql`
      SELECT lichess_game_id FROM games WHERE lichess_game_id = ANY(${ids})
    `) as { lichess_game_id: string }[];
    const existing = new Set(rows.map(r => r.lichess_game_id));
    fresh = all
      .filter(g => !existing.has(g.gameId as string))
      .map(g => {
        const createdAt = createdAtById.get(g.gameId as string);
        return createdAt == null ? g : { ...g, time: artTime(createdAt) };
      });
  }
  if (fresh.length > 0) await insertGames(sql, fresh);

  return {
    since,
    fetched: raw.length,
    inserted: fresh.length,
    skippedExisting: all.length - fresh.length,
    badLines,
    truncated: raw.length >= MAX_GAMES,
  };
}
