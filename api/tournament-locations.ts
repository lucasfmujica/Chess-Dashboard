import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db.js';
import { requireApiKey } from './_auth.js';

interface TournamentLocationRow {
  tournament: string;
  city_key: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const rows = (await sql`SELECT * FROM tournament_locations`) as TournamentLocationRow[];
    const map: Record<string, string> = {};
    for (const row of rows) map[row.tournament] = row.city_key;
    return res.status(200).json(map);
  }

  if (req.method === 'PUT') {
    if (!requireApiKey(req, res)) return;
    const map = req.body as Record<string, string>;
    // Whole-object replace: clear and re-insert, matching localStorage semantics.
    await sql`DELETE FROM tournament_locations`;
    for (const [tournament, cityKey] of Object.entries(map)) {
      await sql`INSERT INTO tournament_locations (tournament, city_key) VALUES (${tournament}, ${cityKey})`;
    }
    return res.status(200).json(map);
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'Method not allowed' });
}
