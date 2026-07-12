import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db.js';
import { requireApiKey } from './_auth.js';
import { rowToRepertoireLine, type RepertoireLineRow } from './_repertoireLineMapper.js';

interface RepertoireLineInput {
  color: 'W' | 'B';
  vsMove?: string;
  eco?: string;
  lineName?: string;
  movesSan?: string;
  keyFen?: string;
  plan?: string;
  goldenRule?: string;
  priority?: number;
  confidence?: number;
  lichessUrl?: string;
  lastReviewed?: number;
  notes?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (typeof id === 'string') {
    if (req.method === 'PUT') {
      if (!requireApiKey(req, res)) return;
      const l = req.body as RepertoireLineInput;
      const rows = (await sql`
        UPDATE repertoire_lines SET
          color = ${l.color}, vs_move = ${l.vsMove ?? null}, eco = ${l.eco ?? null},
          line_name = ${l.lineName ?? null}, moves_san = ${l.movesSan ?? null},
          key_fen = ${l.keyFen ?? null}, plan = ${l.plan ?? null}, golden_rule = ${l.goldenRule ?? null},
          priority = ${l.priority ?? null}, confidence = ${l.confidence ?? null},
          lichess_url = ${l.lichessUrl ?? null},
          last_reviewed = ${l.lastReviewed ? new Date(l.lastReviewed).toISOString() : null},
          notes = ${l.notes ?? null}
        WHERE id = ${id}
        RETURNING *
      `) as RepertoireLineRow[];
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Repertoire line not found' });
      }
      return res.status(200).json(rowToRepertoireLine(rows[0]));
    }

    if (req.method === 'DELETE') {
      if (!requireApiKey(req, res)) return;
      const rows = await sql`DELETE FROM repertoire_lines WHERE id = ${id} RETURNING id`;
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Repertoire line not found' });
      }
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    const rows = (await sql`
      SELECT * FROM repertoire_lines ORDER BY priority ASC NULLS LAST, created_at ASC
    `) as RepertoireLineRow[];
    return res.status(200).json(rows.map(rowToRepertoireLine));
  }

  if (req.method === 'POST') {
    if (!requireApiKey(req, res)) return;
    const l = req.body as RepertoireLineInput;
    const rows = (await sql`
      INSERT INTO repertoire_lines (
        color, vs_move, eco, line_name, moves_san, key_fen, plan, golden_rule,
        priority, confidence, lichess_url, last_reviewed, notes
      ) VALUES (
        ${l.color}, ${l.vsMove ?? null}, ${l.eco ?? null}, ${l.lineName ?? null},
        ${l.movesSan ?? null}, ${l.keyFen ?? null}, ${l.plan ?? null}, ${l.goldenRule ?? null},
        ${l.priority ?? null}, ${l.confidence ?? null}, ${l.lichessUrl ?? null},
        ${l.lastReviewed ? new Date(l.lastReviewed).toISOString() : null}, ${l.notes ?? null}
      ) RETURNING *
    `) as RepertoireLineRow[];
    return res.status(201).json(rowToRepertoireLine(rows[0]));
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
