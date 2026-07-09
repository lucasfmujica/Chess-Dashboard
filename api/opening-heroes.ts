import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db.js';
import { requireApiKey } from './_auth.js';

interface OpeningHeroesRow {
  eco: string;
  heroes: string[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const rows = (await sql`SELECT * FROM opening_heroes`) as OpeningHeroesRow[];
    const map: Record<string, string[]> = {};
    for (const row of rows) map[row.eco] = row.heroes;
    return res.status(200).json(map);
  }

  if (req.method === 'PUT') {
    if (!requireApiKey(req, res)) return;
    const map = req.body as Record<string, string[]>;
    // Whole-object replace: clear and re-insert, matching localStorage semantics.
    await sql`DELETE FROM opening_heroes`;
    for (const [eco, heroes] of Object.entries(map)) {
      await sql`INSERT INTO opening_heroes (eco, heroes) VALUES (${eco}, ${heroes})`;
    }
    return res.status(200).json(map);
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'Method not allowed' });
}
