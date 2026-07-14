import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db.js';
import { requireApiKey } from './_auth.js';
import { rowToBlunderDrill, type BlunderDrillRow } from './_blunderDrillMapper.js';
import { rowToScoutingTarget, type ScoutingTargetRow } from './_scoutingTargetMapper.js';

// Blunder drills and scouting targets are two small, unrelated resources
// (Blunder Drills / Opponent Prep) merged into one Vercel function — each
// as its own file would push this project over the Hobby-plan serverless
// function limit. Dispatches on `?resource=`.

interface MinedBlunderInput {
  gameId: string;
  ply: number;
  fenBefore: string;
  playedSan: string;
  bestMoveUci: string;
  cpLoss: number;
  evalBefore: number;
  evalAfter: number;
}

interface BlunderDrillPatch {
  confidence?: number;
  lastReviewed?: number;
  reviewCount?: number;
  solvedCount?: number;
  archived?: boolean;
}

const blunderDrills = async (req: VercelRequest, res: VercelResponse, id: string | undefined) => {
  if (id) {
    if (req.method === 'PUT') {
      if (!requireApiKey(req, res)) return;
      const d = req.body as BlunderDrillPatch;
      await sql`
        UPDATE blunder_drills SET
          confidence = COALESCE(${d.confidence ?? null}, confidence),
          last_reviewed = COALESCE(${d.lastReviewed ? new Date(d.lastReviewed).toISOString() : null}, last_reviewed),
          review_count = COALESCE(${d.reviewCount ?? null}, review_count),
          solved_count = COALESCE(${d.solvedCount ?? null}, solved_count),
          archived = COALESCE(${d.archived ?? null}, archived)
        WHERE id = ${id}
      `;
      const rows = (await sql`
        SELECT bd.*, g.opponent, g.played_date, g.eco, g.opening_name, g.color, g.result
        FROM blunder_drills bd JOIN games g ON g.id = bd.game_id WHERE bd.id = ${id}
      `) as BlunderDrillRow[];
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Blunder drill not found' });
      }
      return res.status(200).json(rowToBlunderDrill(rows[0]));
    }

    if (req.method === 'DELETE') {
      if (!requireApiKey(req, res)) return;
      const rows = await sql`DELETE FROM blunder_drills WHERE id = ${id} RETURNING id`;
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Blunder drill not found' });
      }
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    const rows = (await sql`
      SELECT bd.*, g.opponent, g.played_date, g.eco, g.opening_name, g.color, g.result
      FROM blunder_drills bd
      JOIN games g ON g.id = bd.game_id
      WHERE bd.archived = false
      ORDER BY bd.created_at DESC
    `) as BlunderDrillRow[];
    return res.status(200).json(rows.map(rowToBlunderDrill));
  }

  if (req.method === 'POST') {
    if (!requireApiKey(req, res)) return;
    const drills = req.body as MinedBlunderInput[];
    if (!Array.isArray(drills)) {
      return res.status(400).json({ error: 'Expected an array of mined blunders' });
    }
    const queries = drills.map(b => sql`
      INSERT INTO blunder_drills (
        game_id, ply, fen_before, played_san, best_move_uci, cp_loss, eval_before, eval_after
      ) VALUES (
        ${b.gameId}, ${b.ply}, ${b.fenBefore}, ${b.playedSan}, ${b.bestMoveUci},
        ${b.cpLoss}, ${b.evalBefore}, ${b.evalAfter}
      )
      ON CONFLICT (game_id, ply) DO NOTHING
    `);
    if (queries.length > 0) {
      await sql.transaction(queries as Parameters<typeof sql.transaction>[0]);
    }
    return res.status(201).json({ inserted: drills.length });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};

interface ScoutingTargetInput {
  name: string;
  lichessUsername?: string;
  tournament?: string;
  notes?: string;
  lastScoutedAt?: number;
}

const scoutingTargets = async (req: VercelRequest, res: VercelResponse, id: string | undefined) => {
  if (id) {
    if (req.method === 'PUT') {
      if (!requireApiKey(req, res)) return;
      const t = req.body as ScoutingTargetInput;
      const rows = (await sql`
        UPDATE scouting_targets SET
          name = ${t.name}, lichess_username = ${t.lichessUsername ?? null},
          tournament = ${t.tournament ?? null}, notes = ${t.notes ?? null},
          last_scouted_at = ${t.lastScoutedAt ? new Date(t.lastScoutedAt).toISOString() : null}
        WHERE id = ${id}
        RETURNING *
      `) as ScoutingTargetRow[];
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Scouting target not found' });
      }
      return res.status(200).json(rowToScoutingTarget(rows[0]));
    }

    if (req.method === 'DELETE') {
      if (!requireApiKey(req, res)) return;
      const rows = await sql`DELETE FROM scouting_targets WHERE id = ${id} RETURNING id`;
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Scouting target not found' });
      }
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    const rows = (await sql`SELECT * FROM scouting_targets ORDER BY created_at DESC`) as ScoutingTargetRow[];
    return res.status(200).json(rows.map(rowToScoutingTarget));
  }

  if (req.method === 'POST') {
    if (!requireApiKey(req, res)) return;
    const t = req.body as ScoutingTargetInput;
    const rows = (await sql`
      INSERT INTO scouting_targets (name, lichess_username, tournament, notes, last_scouted_at)
      VALUES (
        ${t.name}, ${t.lichessUsername ?? null}, ${t.tournament ?? null}, ${t.notes ?? null},
        ${t.lastScoutedAt ? new Date(t.lastScoutedAt).toISOString() : null}
      ) RETURNING *
    `) as ScoutingTargetRow[];
    return res.status(201).json(rowToScoutingTarget(rows[0]));
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { resource, id } = req.query;
  const itemId = typeof id === 'string' ? id : undefined;

  if (resource === 'blunder-drills') return blunderDrills(req, res, itemId);
  if (resource === 'scouting-targets') return scoutingTargets(req, res, itemId);
  return res.status(400).json({ error: 'Unknown or missing ?resource= (expected blunder-drills or scouting-targets)' });
}
