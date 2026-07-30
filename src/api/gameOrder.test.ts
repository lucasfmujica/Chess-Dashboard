import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchGames } from './client';

/**
 * fetchGames puts games in play order, which every chronological feature relies
 * on (ELO progression, streaks, recent form, the per-tournament trend). The
 * database returns them in insert order, which a bulk Lichess sync scrambles.
 *
 * This is regression cover for a silent failure: `played_date` reached the
 * client as a full timestamp, `new Date(`${date}T00:00:00Z`)` became an Invalid
 * Date, and the resulting NaN comparator left Array.sort's input order
 * untouched — so 442 online games sat in database order while looking sorted.
 * NaN keys make sort a no-op rather than an error, so nothing surfaced.
 */
const row = (date: string | null, time: string | undefined, opp: string) => ({
  id: opp,
  source: 'lichess',
  color: 'W',
  result: 'W',
  elo: 2000,
  opp,
  opp_elo: 2000,
  rated: true,
  date,
  time,
});

const stubFetch = (rows: unknown[]) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, status: 200, json: async () => rows })) as unknown as typeof fetch
  );
};

afterEach(() => vi.unstubAllGlobals());

describe('fetchGames ordering', () => {
  it('sorts plain YYYY-MM-DD dates chronologically', async () => {
    stubFetch([
      row('2026-07-29', '09:07 PM', 'newest'),
      row('2025-01-01', '08:33 PM', 'oldest'),
      row('2025-10-15', '12:55 PM', 'middle'),
    ]);
    const games = await fetchGames();
    expect(games.map(g => g.opp)).toEqual(['oldest', 'middle', 'newest']);
  });

  it('still sorts when the date arrives as a full timestamp', async () => {
    // The exact shape that broke it. Even with the mapper normalising dates now,
    // the sort key must not depend on that to avoid a silent NaN regression.
    stubFetch([
      row('2026-07-29T03:00:00.000Z', '09:07 PM', 'newest'),
      row('2025-01-01T03:00:00.000Z', '08:33 PM', 'oldest'),
      row('2025-10-15T03:00:00.000Z', '12:55 PM', 'middle'),
    ]);
    const games = await fetchGames();
    expect(games.map(g => g.opp)).toEqual(['oldest', 'middle', 'newest']);
  });

  it('orders games played on the same day by time of day', async () => {
    stubFetch([
      row('2025-10-23', '01:06 PM', 'second'),
      row('2025-10-23', '09:49 AM', 'first'),
      row('2025-10-23', '08:15 PM', 'third'),
    ]);
    const games = await fetchGames();
    expect(games.map(g => g.opp)).toEqual(['first', 'second', 'third']);
  });

  it('reads 12-hour times correctly around noon and midnight', async () => {
    stubFetch([
      row('2025-10-23', '12:30 PM', 'half past noon'),
      row('2025-10-23', '12:30 AM', 'half past midnight'),
    ]);
    const games = await fetchGames();
    expect(games.map(g => g.opp)).toEqual(['half past midnight', 'half past noon']);
  });

  it('keeps undated games first rather than dropping them', async () => {
    stubFetch([row('2025-10-15', '12:55 PM', 'dated'), row(null, undefined, 'undated')]);
    const games = await fetchGames();
    expect(games.map(g => g.opp)).toEqual(['undated', 'dated']);
  });
});
