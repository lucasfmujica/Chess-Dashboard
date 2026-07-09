import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db.js';
import { requireApiKey } from './_auth.js';

interface ProfileRow {
  current_elo: number;
  elo_change_last_tournament: number | null;
  last_tournament: string | null;
}

const rowToProfile = (row: ProfileRow) => ({
  current_elo: row.current_elo,
  elo_change_last_tournament: row.elo_change_last_tournament ?? 0,
  last_tournament: row.last_tournament ?? '',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const rows = (await sql`SELECT * FROM profile WHERE id = 1`) as ProfileRow[];
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Profile not set up yet' });
    }
    return res.status(200).json(rowToProfile(rows[0]));
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

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'Method not allowed' });
}
