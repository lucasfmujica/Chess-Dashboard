import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db.js';
import { requireApiKey } from './_auth.js';

interface RepertoireRow {
  white_ecos: string[];
  black_ecos: string[];
}

const rowToRepertoire = (row: RepertoireRow) => ({
  white: row.white_ecos,
  black: row.black_ecos,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const rows = (await sql`SELECT * FROM repertoire WHERE id = 1`) as RepertoireRow[];
    if (rows.length === 0) {
      return res.status(200).json({ white: [], black: [] });
    }
    return res.status(200).json(rowToRepertoire(rows[0]));
  }

  if (req.method === 'PUT') {
    if (!requireApiKey(req, res)) return;
    const { white, black } = req.body as { white: string[]; black: string[] };
    const rows = (await sql`
      INSERT INTO repertoire (id, white_ecos, black_ecos)
      VALUES (1, ${white}, ${black})
      ON CONFLICT (id) DO UPDATE SET white_ecos = EXCLUDED.white_ecos, black_ecos = EXCLUDED.black_ecos
      RETURNING *
    `) as RepertoireRow[];
    return res.status(200).json(rowToRepertoire(rows[0]));
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'Method not allowed' });
}
