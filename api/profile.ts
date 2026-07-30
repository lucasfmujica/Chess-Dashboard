import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db.js';
import { requireApiKey } from './_auth.js';
import { fetchFideRatings } from './_fide.js';
import { pickLastTournament, type TournamentEloRow } from './_lastTournament.js';

interface ProfileRow {
  current_elo: number;
  elo_change_last_tournament: number | null;
  last_tournament: string | null;
  updated_at: string | Date | null;
}

const rowToProfile = (row: ProfileRow) => ({
  current_elo: row.current_elo,
  elo_change_last_tournament: row.elo_change_last_tournament ?? 0,
  last_tournament: row.last_tournament ?? '',
  updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
});

/** Postgres returns NUMERIC and SUM() as strings; nulls must survive as nulls. */
const toNumber = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);

/** The tournaments as the picker needs them: one row per event, with both
 *  candidate figures for the rating change. */
const tournamentEloRows = async (): Promise<TournamentEloRow[]> => {
  const rows = (await sql`
    SELECT
      t.name,
      to_char(coalesce(t.end_date, t.start_date), 'YYYY-MM-DD') AS date,
      t.affects_elo,
      t.elo_change,
      (
        SELECT sum(g.elo_change) FROM games g
        WHERE g.tournament = t.name AND coalesce(g.affects_elo, true)
      ) AS games_change
    FROM tournaments t
  `) as {
    name: string;
    date: string | null;
    affects_elo: boolean;
    elo_change: string | number | null;
    games_change: string | number | null;
  }[];

  return rows.map(row => ({
    name: row.name,
    date: row.date,
    affectsElo: row.affects_elo,
    eloChange: toNumber(row.elo_change),
    gamesChange: toNumber(row.games_change),
  }));
};

/**
 * Bring the profile in line with the sources that actually know: FIDE for the
 * current standard rating, the tournaments table for which event last moved it.
 *
 * All three fields were maintained by hand and all three had drifted —
 * `current_elo` held the rating going *into* the last tournament, so it was
 * stale by that tournament's own result. The whole dashboard keys on these
 * (sidebar, overview badge, goal projections).
 *
 * Anything that can't be determined right now — a FIDE page that no longer
 * parses, an empty tournaments table — leaves the stored value alone. A null
 * is missing data, not a zero.
 */
export const refreshProfile = async () => {
  const ratings = await fetchFideRatings();
  const lastTournament = pickLastTournament(await tournamentEloRows());

  const existing = ((await sql`SELECT * FROM profile WHERE id = 1`) as ProfileRow[])[0];

  const currentElo = ratings.standard ?? existing?.current_elo;
  if (currentElo === undefined) {
    // Nothing stored and nothing parsed: there is no rating to write, and
    // current_elo is NOT NULL.
    return { updated: false, ratings, lastTournament };
  }

  const eloChange = lastTournament?.eloChange ?? existing?.elo_change_last_tournament ?? null;
  const name = lastTournament?.name ?? existing?.last_tournament ?? null;

  const rows = (await sql`
    INSERT INTO profile (id, current_elo, elo_change_last_tournament, last_tournament, updated_at)
    VALUES (1, ${currentElo}, ${eloChange}, ${name}, now())
    ON CONFLICT (id) DO UPDATE SET
      current_elo = EXCLUDED.current_elo,
      elo_change_last_tournament = EXCLUDED.elo_change_last_tournament,
      last_tournament = EXCLUDED.last_tournament,
      updated_at = now()
    RETURNING *
  `) as ProfileRow[];

  return { updated: true, ratings, lastTournament, profile: rowToProfile(rows[0]) };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const rows = (await sql`SELECT * FROM profile WHERE id = 1`) as ProfileRow[];
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Profile not set up yet' });
    }
    return res.status(200).json(rowToProfile(rows[0]));
  }

  // Derive the profile from FIDE and the tournaments table instead of being
  // told what it is.
  if (req.method === 'POST') {
    if (!requireApiKey(req, res)) return;
    try {
      const result = await refreshProfile();
      return res.status(200).json(result);
    } catch (err) {
      return res
        .status(502)
        .json({ error: err instanceof Error ? err.message : 'FIDE fetch failed' });
    }
  }

  if (req.method === 'PUT') {
    if (!requireApiKey(req, res)) return;
    const { current_elo, elo_change_last_tournament, last_tournament } = req.body as {
      current_elo: number;
      elo_change_last_tournament?: number;
      last_tournament?: string;
    };
    const rows = (await sql`
      INSERT INTO profile (id, current_elo, elo_change_last_tournament, last_tournament, updated_at)
      VALUES (1, ${current_elo}, ${elo_change_last_tournament ?? null}, ${last_tournament ?? null}, now())
      ON CONFLICT (id) DO UPDATE SET
        current_elo = EXCLUDED.current_elo,
        elo_change_last_tournament = EXCLUDED.elo_change_last_tournament,
        last_tournament = EXCLUDED.last_tournament,
        updated_at = now()
      RETURNING *
    `) as ProfileRow[];
    return res.status(200).json(rowToProfile(rows[0]));
  }

  res.setHeader('Allow', 'GET, POST, PUT');
  return res.status(405).json({ error: 'Method not allowed' });
}
