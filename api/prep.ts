import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db.js';
import { requireApiKey } from './_auth.js';
import { rowToBlunderDrill, type BlunderDrillRow } from './_blunderDrillMapper.js';
import { rowToScoutingTarget, type ScoutingTargetRow } from './_scoutingTargetMapper.js';
import { rowToEndgameDrill, type EndgameDrillRow } from './_endgameDrillMapper.js';

// Several small, unrelated resources (Blunder Drills / Opponent Prep /
// Endgame Drills / Norm Tracker) merged into one Vercel function — each as
// its own file would push this project over the Hobby-plan serverless
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

interface MinedEndgameInput {
  gameId: string;
  ply: number;
  fen: string;
  materialDelta: number;
  endgameType: string;
}

interface EndgameDrillPatch {
  confidence?: number;
  lastReviewed?: number;
  reviewCount?: number;
  archived?: boolean;
}

const endgameDrills = async (req: VercelRequest, res: VercelResponse, id: string | undefined) => {
  if (id) {
    if (req.method === 'PUT') {
      if (!requireApiKey(req, res)) return;
      const d = req.body as EndgameDrillPatch;
      await sql`
        UPDATE endgame_drills SET
          confidence = COALESCE(${d.confidence ?? null}, confidence),
          last_reviewed = COALESCE(${d.lastReviewed ? new Date(d.lastReviewed).toISOString() : null}, last_reviewed),
          review_count = COALESCE(${d.reviewCount ?? null}, review_count),
          archived = COALESCE(${d.archived ?? null}, archived)
        WHERE id = ${id}
      `;
      const rows = (await sql`
        SELECT ed.*, g.opponent, g.played_date, g.eco, g.opening_name, g.color, g.result
        FROM endgame_drills ed JOIN games g ON g.id = ed.game_id WHERE ed.id = ${id}
      `) as EndgameDrillRow[];
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Endgame drill not found' });
      }
      return res.status(200).json(rowToEndgameDrill(rows[0]));
    }

    if (req.method === 'DELETE') {
      if (!requireApiKey(req, res)) return;
      const rows = await sql`DELETE FROM endgame_drills WHERE id = ${id} RETURNING id`;
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Endgame drill not found' });
      }
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    const rows = (await sql`
      SELECT ed.*, g.opponent, g.played_date, g.eco, g.opening_name, g.color, g.result
      FROM endgame_drills ed
      JOIN games g ON g.id = ed.game_id
      WHERE ed.archived = false
      ORDER BY ed.created_at DESC
    `) as EndgameDrillRow[];
    return res.status(200).json(rows.map(rowToEndgameDrill));
  }

  if (req.method === 'POST') {
    if (!requireApiKey(req, res)) return;
    const drills = req.body as MinedEndgameInput[];
    if (!Array.isArray(drills)) {
      return res.status(400).json({ error: 'Expected an array of mined endgames' });
    }
    const queries = drills.map(e => sql`
      INSERT INTO endgame_drills (game_id, ply, fen, material_delta, endgame_type)
      VALUES (${e.gameId}, ${e.ply}, ${e.fen}, ${e.materialDelta}, ${e.endgameType})
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

interface NormAttemptInput {
  tournament: string;
  titleTarget: string;
  gamesCount?: number;
  performanceRating?: number;
  titledOpponents?: number;
  foreignOpponents?: number;
  notes?: string;
}

interface NormAttemptRow {
  id: string;
  tournament: string;
  title_target: string;
  games_count: number | null;
  performance_rating: number | null;
  titled_opponents: number | null;
  foreign_opponents: number | null;
  notes: string | null;
  created_at: string;
}

const rowToNormAttempt = (row: NormAttemptRow) => ({
  id: row.id,
  tournament: row.tournament,
  titleTarget: row.title_target as 'IM' | 'GM' | 'WIM' | 'WGM',
  gamesCount: row.games_count ?? undefined,
  performanceRating: row.performance_rating ?? undefined,
  titledOpponents: row.titled_opponents ?? undefined,
  foreignOpponents: row.foreign_opponents ?? undefined,
  notes: row.notes ?? undefined,
  createdAt: new Date(row.created_at).getTime(),
});

const normAttempts = async (req: VercelRequest, res: VercelResponse, id: string | undefined) => {
  if (id) {
    if (req.method === 'PUT') {
      if (!requireApiKey(req, res)) return;
      const a = req.body as NormAttemptInput;
      const rows = (await sql`
        UPDATE norm_attempts SET
          tournament = ${a.tournament}, title_target = ${a.titleTarget},
          games_count = ${a.gamesCount ?? null}, performance_rating = ${a.performanceRating ?? null},
          titled_opponents = ${a.titledOpponents ?? null}, foreign_opponents = ${a.foreignOpponents ?? null},
          notes = ${a.notes ?? null}
        WHERE id = ${id}
        RETURNING *
      `) as NormAttemptRow[];
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Norm attempt not found' });
      }
      return res.status(200).json(rowToNormAttempt(rows[0]));
    }

    if (req.method === 'DELETE') {
      if (!requireApiKey(req, res)) return;
      const rows = await sql`DELETE FROM norm_attempts WHERE id = ${id} RETURNING id`;
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Norm attempt not found' });
      }
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    const rows = (await sql`SELECT * FROM norm_attempts ORDER BY created_at DESC`) as NormAttemptRow[];
    return res.status(200).json(rows.map(rowToNormAttempt));
  }

  if (req.method === 'POST') {
    if (!requireApiKey(req, res)) return;
    const a = req.body as NormAttemptInput;
    const rows = (await sql`
      INSERT INTO norm_attempts (
        tournament, title_target, games_count, performance_rating, titled_opponents, foreign_opponents, notes
      ) VALUES (
        ${a.tournament}, ${a.titleTarget}, ${a.gamesCount ?? null}, ${a.performanceRating ?? null},
        ${a.titledOpponents ?? null}, ${a.foreignOpponents ?? null}, ${a.notes ?? null}
      ) RETURNING *
    `) as NormAttemptRow[];
    return res.status(201).json(rowToNormAttempt(rows[0]));
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};

interface NormThresholdsRow {
  im_performance: number;
  gm_performance: number;
  wim_performance: number;
  wgm_performance: number;
}

const rowToNormThresholds = (row: NormThresholdsRow) => ({
  IM: row.im_performance,
  GM: row.gm_performance,
  WIM: row.wim_performance,
  WGM: row.wgm_performance,
});

const normThresholds = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method === 'GET') {
    const rows = (await sql`SELECT * FROM norm_thresholds WHERE id = 1`) as NormThresholdsRow[];
    if (rows.length === 0) {
      const seeded = (await sql`INSERT INTO norm_thresholds (id) VALUES (1) RETURNING *`) as NormThresholdsRow[];
      return res.status(200).json(rowToNormThresholds(seeded[0]));
    }
    return res.status(200).json(rowToNormThresholds(rows[0]));
  }

  if (req.method === 'PUT') {
    if (!requireApiKey(req, res)) return;
    const t = req.body as { IM: number; GM: number; WIM: number; WGM: number };
    const rows = (await sql`
      INSERT INTO norm_thresholds (id, im_performance, gm_performance, wim_performance, wgm_performance)
      VALUES (1, ${t.IM}, ${t.GM}, ${t.WIM}, ${t.WGM})
      ON CONFLICT (id) DO UPDATE SET
        im_performance = EXCLUDED.im_performance, gm_performance = EXCLUDED.gm_performance,
        wim_performance = EXCLUDED.wim_performance, wgm_performance = EXCLUDED.wgm_performance
      RETURNING *
    `) as NormThresholdsRow[];
    return res.status(200).json(rowToNormThresholds(rows[0]));
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'Method not allowed' });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { resource, id } = req.query;
  const itemId = typeof id === 'string' ? id : undefined;

  if (resource === 'blunder-drills') return blunderDrills(req, res, itemId);
  if (resource === 'scouting-targets') return scoutingTargets(req, res, itemId);
  if (resource === 'endgame-drills') return endgameDrills(req, res, itemId);
  if (resource === 'norm-attempts') return normAttempts(req, res, itemId);
  if (resource === 'norm-thresholds') return normThresholds(req, res);
  return res.status(400).json({
    error:
      'Unknown or missing ?resource= (expected blunder-drills, scouting-targets, endgame-drills, norm-attempts, or norm-thresholds)',
  });
}
