import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db.js';
import { requireApiKey } from '../_auth.js';
import { rowToGame, type GameRow } from '../_gameMapper.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing id' });
  }

  if (req.method === 'PATCH') {
    if (!requireApiKey(req, res)) return;
    const { pgn } = req.body as { pgn?: string | null };
    const rows = (await sql`
      UPDATE games SET pgn = ${pgn ?? null} WHERE id = ${id} RETURNING *
    `) as GameRow[];
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    return res.status(200).json(rowToGame(rows[0]));
  }

  res.setHeader('Allow', 'PATCH');
  return res.status(405).json({ error: 'Method not allowed' });
}
