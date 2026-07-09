import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db.js';
import { requireApiKey } from '../_auth.js';
import { rowToAnnotation, type AnnotationRow } from '../_annotationMapper.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing id' });
  }

  if (req.method === 'PUT') {
    if (!requireApiKey(req, res)) return;
    const a = req.body as {
      gameName?: string;
      opponent?: string;
      date?: string;
      opening?: string;
      eco?: string;
      result?: string;
      rating?: number;
      tags?: string[];
      notes?: string;
      keyMoments?: unknown[];
      pgn?: string;
    };
    const rows = (await sql`
      UPDATE annotated_games SET
        game_name = ${a.gameName ?? null}, opponent = ${a.opponent ?? null},
        played_date = ${a.date ?? null}, opening = ${a.opening ?? null}, eco = ${a.eco ?? null},
        result = ${a.result ?? null}, rating = ${a.rating ?? null}, tags = ${a.tags ?? []},
        notes = ${a.notes ?? null}, key_moments = ${JSON.stringify(a.keyMoments ?? [])},
        pgn = ${a.pgn ?? null}
      WHERE id = ${id}
      RETURNING *
    `) as AnnotationRow[];
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Annotation not found' });
    }
    return res.status(200).json(rowToAnnotation(rows[0]));
  }

  if (req.method === 'DELETE') {
    if (!requireApiKey(req, res)) return;
    const rows = await sql`DELETE FROM annotated_games WHERE id = ${id} RETURNING id`;
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Annotation not found' });
    }
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'PUT, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
