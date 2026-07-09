import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db.js';
import { requireApiKey } from '../_auth.js';
import { rowToAnnotation, type AnnotationRow } from '../_annotationMapper.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const rows = (await sql`SELECT * FROM annotated_games ORDER BY created_at ASC`) as AnnotationRow[];
    return res.status(200).json(rows.map(rowToAnnotation));
  }

  if (req.method === 'POST') {
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
      INSERT INTO annotated_games (
        game_name, opponent, played_date, opening, eco, result, rating, tags, notes, key_moments, pgn
      ) VALUES (
        ${a.gameName ?? null}, ${a.opponent ?? null}, ${a.date ?? null}, ${a.opening ?? null},
        ${a.eco ?? null}, ${a.result ?? null}, ${a.rating ?? null}, ${a.tags ?? []},
        ${a.notes ?? null}, ${JSON.stringify(a.keyMoments ?? [])}, ${a.pgn ?? null}
      ) RETURNING *
    `) as AnnotationRow[];
    return res.status(201).json(rowToAnnotation(rows[0]));
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
