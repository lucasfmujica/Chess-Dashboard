import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db.js';
import { requireApiKey } from './_auth.js';
import { rowToBlunderDrill, type BlunderDrillRow } from './_blunderDrillMapper.js';
import { rowToScoutingTarget, type ScoutingTargetRow } from './_scoutingTargetMapper.js';
import { rowToEndgameDrill, type EndgameDrillRow } from './_endgameDrillMapper.js';
import {
  rowToPositionDiagnostic,
  type PositionDiagnosticRow,
} from './_positionDiagnosticMapper.js';
import Anthropic from '@anthropic-ai/sdk';
import {
  trainingSessions,
  trainingAttempts,
  books,
  concepts,
  homework,
  repertoireMoves,
} from './_trainingHandlers.js';
import { tournaments, modelGames } from './_tournamentHandlers.js';
import {
  parseStartList,
  matchOpponents,
  parsePlayerCard,
  normalizePlayerCardUrl,
  playerCardReconciles,
  parseGamePgn,
  toPgn,
  type PlayedOpponent,
} from './_chessResults.js';

// Several small, unrelated resources (Blunder Drills / Opponent Prep /
// Endgame Drills / Norm Tracker / Training log / Concepts) merged into one
// Vercel function — each as its own file would push this project over the
// Hobby-plan serverless function limit. Dispatches on `?resource=`. The
// bulkier training handlers live in _trainingHandlers.ts to keep this file
// readable; `_`-prefixed modules are not treated as routes.

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
  // Preferred over the absolute reviewCount/solvedCount above: the counters
  // are now bumped in SQL, so two screens drilling the same item (the drill
  // tab and the daily queue) can't clobber each other by both writing a
  // total derived from their own stale copy. The absolute fields are kept
  // for compatibility and win when both are sent.
  reviewCountInc?: number;
  solvedCountInc?: number;
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
          review_count = COALESCE(${d.reviewCount ?? null}, review_count + ${d.reviewCountInc ?? 0}),
          solved_count = COALESCE(${d.solvedCount ?? null}, solved_count + ${d.solvedCountInc ?? 0}),
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
  solvedCount?: number;
  archived?: boolean;
  /** See BlunderDrillPatch — server-side increment, preferred over the totals. */
  reviewCountInc?: number;
  solvedCountInc?: number;
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
          review_count = COALESCE(${d.reviewCount ?? null}, review_count + ${d.reviewCountInc ?? 0}),
          solved_count = COALESCE(${d.solvedCount ?? null}, solved_count + ${d.solvedCountInc ?? 0}),
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

/**
 * Reads a chess-results start list and reports which entrants are already in
 * `games`.
 *
 * Read-only on purpose. It proposes scouting targets rather than inserting
 * them: the source is someone else's HTML, so a layout change turns silent
 * inserts into junk rows in a table the user curates by hand.
 */
/**
 * Fetch a chess-results page, refusing anything else.
 *
 * The URL comes from the client, so the host allowlist is what keeps this
 * endpoint from being a general-purpose fetcher for the server. Returns either
 * the HTML or the response to send back.
 */
const fetchChessResults = async (
  rawUrl: unknown,
  transform: (url: URL) => string = url => url.toString()
): Promise<{ html: string } | { status: number; error: string }> => {
  const url = typeof rawUrl === 'string' ? rawUrl : undefined;
  if (!url) return { status: 400, error: 'url is required' };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { status: 400, error: 'url is not a valid URL' };
  }
  if (!/(^|\.)chess-results\.com$/i.test(parsed.hostname) || parsed.protocol !== 'https:') {
    return { status: 400, error: 'Only https chess-results.com URLs are supported' };
  }

  try {
    const upstream = await fetch(transform(parsed), {
      headers: { 'User-Agent': 'chess-dashboard/1.0 (personal tournament prep)' },
    });
    if (!upstream.ok) {
      return { status: 502, error: `chess-results returned ${upstream.status}` };
    }
    return { html: await upstream.text() };
  } catch (err) {
    return {
      status: 502,
      error: err instanceof Error ? err.message : 'Could not reach chess-results',
    };
  }
};

const chessResults = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const fetched = await fetchChessResults(req.query.url);
  if ('error' in fetched) return res.status(fetched.status).json({ error: fetched.error });
  const { html } = fetched;

  const entries = parseStartList(html);
  if (entries.length === 0) {
    return res.status(200).json({
      entries: [],
      matches: [],
      warning:
        'No se encontró una lista de inscriptos en esa página. Probá con el enlace a la lista de ranking inicial (art=0).',
    });
  }

  const played = (await sql`
    SELECT opponent,
           count(*)::int AS games,
           sum(CASE result WHEN 'W' THEN 1 WHEN 'D' THEN 0.5 ELSE 0 END)::float AS score
    FROM games
    WHERE opponent IS NOT NULL AND opponent <> ''
    GROUP BY opponent
  `) as PlayedOpponent[];

  return res.status(200).json({ entries, matches: matchOpponents(entries, played) });
};

/**
 * Reads one player's card for a played tournament: the official performance,
 * points, place and starting rank, plus the round-by-round record.
 *
 * Read-only, like the start-list endpoint. It reports `reconciles` rather than
 * deciding for the caller: the rounds and the official points come from
 * different parts of someone else's HTML, and a card that half-parsed still
 * looks plausible, so the caller confirms before any of it is stored.
 */
const chessResultsCard = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const fetched = await fetchChessResults(req.query.url, normalizePlayerCardUrl);
  if ('error' in fetched) return res.status(fetched.status).json({ error: fetched.error });

  const card = parsePlayerCard(fetched.html);
  if (card.rounds.length === 0) {
    return res.status(200).json({
      card,
      reconciles: false,
      warning:
        'No se encontró la tabla de rondas en esa página. Revisá que el enlace sea la ficha del jugador (art=9) e incluya su número de inicio (snr=).',
    });
  }

  // The viewer link is relative on the page and chess-results shards across
  // s1/s2/s3, so resolve it here against the card's own origin rather than
  // making the client guess which server this tournament lives on.
  const origin = new URL(normalizePlayerCardUrl(req.query.url as string)).origin;
  const rounds = card.rounds.map(round =>
    round.pgnId
      ? { ...round, pgnUrl: `${origin}/PartieSuche.aspx?lan=2&art=36&id=${round.pgnId}` }
      : round
  );

  return res
    .status(200)
    .json({ card: { ...card, rounds }, reconciles: playerCardReconciles(card) });
};

/**
 * Reads one game's moves off the viewer page a player card links to, and
 * returns them as a PGN.
 *
 * Read-only: it hands back the PGN for the caller to attach to a game it has
 * already matched. Nothing here knows which stored game this is.
 */
const chessResultsPgn = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const fetched = await fetchChessResults(req.query.url);
  if ('error' in fetched) return res.status(fetched.status).json({ error: fetched.error });

  const game = parseGamePgn(fetched.html);
  if (!game) {
    return res.status(200).json({
      warning: 'Esa página no tiene movimientos: el torneo no publicó el PGN de esta partida.',
    });
  }

  return res.status(200).json({ game, pgn: toPgn(game) });
};

/**
 * Diagnóstico de posiciones: divergencias entre Stockfish y Maia-1900.
 *
 * El análisis NO corre acá. Necesita Stockfish y lc0 con los pesos de Maia,
 * minutos de CPU por partida, así que vive en scripts/position_diagnostics.py y
 * corre en la máquina local. Este endpoint solo lee resultados y encola pedidos:
 * el POST marca una partida, y el script la levanta con --requested.
 *
 *   GET  ?resource=position-diagnostics&gameId=<uuid>  divergencias de esa partida
 *   GET  ?resource=position-diagnostics                estado de la cola
 *   POST ?resource=position-diagnostics  {gameId, force?}  encolar
 */
const positionDiagnostics = async (req: VercelRequest, res: VercelResponse) => {
  const gameId = typeof req.query.gameId === 'string' ? req.query.gameId : undefined;

  if (req.method === 'GET') {
    // ?all=1 trae el corpus entero, que es lo que necesita la vista propia: el
    // valor de esto está en cruzar partidas, no en mirar una. Va acotado y
    // ordenado por pérdida porque nadie lee 183 filas en orden de partida.
    if (!gameId && req.query.all) {
      const limit = Math.min(500, Number(req.query.limit) || 200);
      const rows = (await sql`
        SELECT d.*, g.opponent, g.opponent_elo, g.played_date, g.tournament,
               g.color, g.result, g.eco, g.opening_name
          FROM position_diagnostics d
          JOIN games g ON g.id = d.game_id
         ORDER BY d.cp_loss DESC
         LIMIT ${limit}
      `) as PositionDiagnosticRow[];
      return res.status(200).json(rows.map(rowToPositionDiagnostic));
    }
    if (!gameId) {
      // Sin gameId: qué está pedido y qué ya se analizó, para que la app pueda
      // mostrar el estado del botón sin traerse todas las divergencias.
      const [requested, analyzed] = await Promise.all([
        sql`SELECT game_id, requested_at, force FROM position_diagnostics_requests
            ORDER BY requested_at`,
        sql`SELECT game_id, analyzed_at, depth, positions, findings
            FROM position_diagnostics_runs`,
      ]);
      return res.status(200).json({
        requested: (requested as { game_id: string; requested_at: string; force: boolean }[]).map(r => ({
          gameId: r.game_id,
          requestedAt: new Date(r.requested_at).getTime(),
          force: r.force,
        })),
        analyzed: (analyzed as {
          game_id: string; analyzed_at: string; depth: number; positions: number; findings: number;
        }[]).map(r => ({
          gameId: r.game_id,
          analyzedAt: new Date(r.analyzed_at).getTime(),
          depth: r.depth,
          positions: r.positions,
          findings: r.findings,
        })),
      });
    }

    const rows = (await sql`
      SELECT d.*, g.opponent, g.opponent_elo, g.played_date, g.tournament,
             g.color, g.result, g.eco, g.opening_name
        FROM position_diagnostics d
        JOIN games g ON g.id = d.game_id
       WHERE d.game_id = ${gameId}
       ORDER BY d.ply
    `) as PositionDiagnosticRow[];
    return res.status(200).json(rows.map(rowToPositionDiagnostic));
  }

  if (req.method === 'POST') {
    if (!requireApiKey(req, res)) return;
    const body = (req.body ?? {}) as { gameId?: string; force?: boolean };
    if (!body.gameId) return res.status(400).json({ error: 'gameId is required' });

    const exists = (await sql`SELECT 1 FROM games WHERE id = ${body.gameId}`) as unknown[];
    if (exists.length === 0) return res.status(404).json({ error: 'Game not found' });

    // Re-pedir la misma partida actualiza el pedido en vez de fallar: sirve para
    // convertir un pedido normal en uno con force.
    const rows = (await sql`
      INSERT INTO position_diagnostics_requests (game_id, force)
      VALUES (${body.gameId}, ${body.force ?? false})
      ON CONFLICT (game_id) DO UPDATE
        SET requested_at = now(), force = EXCLUDED.force
      RETURNING game_id, requested_at, force
    `) as { game_id: string; requested_at: string; force: boolean }[];
    return res.status(201).json({
      gameId: rows[0].game_id,
      requestedAt: new Date(rows[0].requested_at).getTime(),
      force: rows[0].force,
    });
  }

  if (req.method === 'DELETE') {
    if (!requireApiKey(req, res)) return;
    if (!gameId) return res.status(400).json({ error: 'gameId is required' });
    await sql`DELETE FROM position_diagnostics_requests WHERE game_id = ${gameId}`;
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
};

/**
 * Preguntas sobre una posición diagnosticada, contestadas con motor.
 *
 * Un chat pelado sobre un FEN es peor que nada: el modelo contesta con
 * seguridad y se equivoca seguido, que es exactamente lo que todo el resto de
 * este pipeline está diseñado para evitar. Acá el modelo NO analiza: pide
 * evaluaciones y contesta con lo que vuelve.
 *
 * Quien corre el motor es el NAVEGADOR — la app ya tiene Stockfish en WASM, y
 * una función de Vercel no puede tener uno. Así que el bucle de herramientas lo
 * maneja el cliente y esto es un proxy sin estado.
 *
 * El protocolo con el cliente es NEUTRAL: el navegador manda turnos genéricos y
 * recibe `{text, toolCalls}`, sin saber qué proveedor hay detrás. La traducción
 * al formato de cada uno vive acá. Sin eso, cambiar de proveedor obligaría a
 * reescribir el bucle del cliente, que es donde menos se quiere tocar.
 *
 * El historial llega del cliente, así que es texto que el usuario controla. En
 * una app de un solo usuario detrás de API_SECRET eso es aceptable.
 */
interface ChatToolCall {
  id: string;
  moves: string[];
  depth?: number;
}

type ChatTurn =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text?: string; toolCalls?: ChatToolCall[] }
  | { role: 'tool'; results: { id: string; output: string; isError?: boolean }[] };

const CHAT_TOOL_NAME = 'evaluar';

const CHAT_SYSTEM = `Contestás preguntas sobre una posición concreta de una partida \
de Lucas, jugador argentino de ~1880 FIDE. Hablás de vos, en rioplatense, sin \
solemnidad y sin dar clase.

REGLA CENTRAL, por encima de todo: no analizás ajedrez de tu cabeza. Para \
cualquier afirmación sobre si una jugada es buena, mala, o qué pasa después, \
usás la herramienta "${CHAT_TOOL_NAME}" y contestás con lo que devuelve. Si no \
evaluaste, no lo afirmás.

Cómo trabajar:
- Si te pregunta por una jugada concreta ("¿y si jugaba Nc4?"), evaluala.
- Si querés comparar, evaluá las dos y decí la diferencia en peones.
- Podés encadenar varias evaluaciones antes de contestar. Es barato.
- Una evaluación vuelve desde el lado del que mueve en ESA posición. Fijate de \
  quién es el turno antes de decir si es buena o mala para Lucas.
- Si la pregunta no se puede contestar evaluando (por ejemplo, sobre qué pensaba \
  el rival), decilo en vez de inventar.

Respuestas de 1 a 3 oraciones. Texto plano, sin markdown ni viñetas. Cuando cites \
una evaluación, dala en peones con un decimal, no en centipeones.`;

const CHAT_TOOL_DESCRIPTION =
  'Evalúa una línea con Stockfish partiendo de la posición del diagnóstico. ' +
  'Devuelve la evaluación en centipeones desde el lado que mueve en la posición ' +
  'resultante, y la mejor respuesta del motor. Pasá lista vacía para evaluar la ' +
  'posición de partida tal cual.';

const CHAT_TOOL_SCHEMA = {
  type: 'object' as const,
  properties: {
    jugadas: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Jugadas en SAN desde la posición del diagnóstico, en orden, alternando ' +
        'bandos. Ej: ["Nc4", "Qb3", "Nxb2"].',
    },
    profundidad: {
      type: 'integer',
      description: 'Profundidad de búsqueda, 12 a 22. Por defecto 18.',
    },
  },
  required: ['jugadas'],
  additionalProperties: false,
};

/** Lo que el modelo pidió evaluar, normalizado desde el formato de cada proveedor. */
const parseToolInput = (raw: unknown): { moves: string[]; depth?: number } => {
  const input = (typeof raw === 'string' ? JSON.parse(raw) : raw) as {
    jugadas?: unknown;
    profundidad?: unknown;
  };
  return {
    moves: Array.isArray(input?.jugadas) ? input.jugadas.map(String) : [],
    depth: typeof input?.profundidad === 'number' ? input.profundidad : undefined,
  };
};

const chatViaAnthropic = async (turns: ChatTurn[]) => {
  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = turns.map(turn => {
    if (turn.role === 'user') return { role: 'user', content: turn.text };
    if (turn.role === 'tool') {
      return {
        role: 'user',
        content: turn.results.map(r => ({
          type: 'tool_result' as const,
          tool_use_id: r.id,
          content: r.output,
          ...(r.isError ? { is_error: true } : {}),
        })),
      };
    }
    const content: Anthropic.ContentBlockParam[] = [];
    if (turn.text) content.push({ type: 'text', text: turn.text });
    for (const call of turn.toolCalls ?? []) {
      content.push({
        type: 'tool_use',
        id: call.id,
        name: CHAT_TOOL_NAME,
        input: { jugadas: call.moves, profundidad: call.depth },
      });
    }
    return { role: 'assistant', content };
  });

  const message = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    // El sistema y las herramientas no cambian entre vueltas del bucle:
    // cachearlos evita pagarlos una vez por evaluación.
    system: [{ type: 'text', text: CHAT_SYSTEM, cache_control: { type: 'ephemeral' } }],
    tools: [
      {
        name: CHAT_TOOL_NAME,
        description: CHAT_TOOL_DESCRIPTION,
        input_schema: CHAT_TOOL_SCHEMA,
        strict: true,
      },
    ],
    messages,
  });

  return {
    text: message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim(),
    toolCalls: message.content
      .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
      .map(b => ({ id: b.id, ...parseToolInput(b.input) })),
  };
};

/**
 * xAI por `fetch` y no por SDK a propósito: su API es compatible con la de
 * OpenAI, así que es un POST documentado, y agregar el paquete `openai` al
 * bundle de una función serverless por una sola llamada no se paga.
 */
const chatViaXai = async (turns: ChatTurn[]) => {
  const messages: Record<string, unknown>[] = [{ role: 'system', content: CHAT_SYSTEM }];
  for (const turn of turns) {
    if (turn.role === 'user') messages.push({ role: 'user', content: turn.text });
    else if (turn.role === 'tool')
      for (const r of turn.results)
        messages.push({ role: 'tool', tool_call_id: r.id, content: r.output });
    else
      messages.push({
        role: 'assistant',
        content: turn.text ?? null,
        ...(turn.toolCalls?.length
          ? {
              tool_calls: turn.toolCalls.map(c => ({
                id: c.id,
                type: 'function',
                function: {
                  name: CHAT_TOOL_NAME,
                  arguments: JSON.stringify({ jugadas: c.moves, profundidad: c.depth }),
                },
              })),
            }
          : {}),
      });
  }

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'grok-4.6',
      messages,
      reasoning: { effort: 'medium' },
      tools: [
        {
          type: 'function',
          function: {
            name: CHAT_TOOL_NAME,
            description: CHAT_TOOL_DESCRIPTION,
            parameters: CHAT_TOOL_SCHEMA,
          },
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`xAI respondió ${res.status}`);
  const body = (await res.json()) as {
    choices?: { message?: { content?: string | null; tool_calls?: { id: string; function: { arguments: string } }[] } }[];
  };
  const msg = body.choices?.[0]?.message;
  return {
    text: (msg?.content ?? '').trim(),
    toolCalls: (msg?.tool_calls ?? []).map(c => ({
      id: c.id,
      ...parseToolInput(c.function.arguments),
    })),
  };
};

const diagnosticChat = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireApiKey(req, res)) return;

  // La forma del pedido se valida antes que la config del servidor: un cliente
  // que manda cualquier cosa tiene que enterarse de eso, no de que falta una
  // variable de entorno.
  const body = (req.body ?? {}) as { turns?: ChatTurn[] };
  if (!Array.isArray(body.turns) || body.turns.length === 0) {
    return res.status(400).json({ error: 'turns is required' });
  }

  // Se usa la clave que haya. Anthropic primero solo porque es la que soporta
  // más del pipeline; con cualquiera de las dos el chat funciona igual.
  const provider = process.env.ANTHROPIC_API_KEY
    ? 'anthropic'
    : process.env.XAI_API_KEY
      ? 'xai'
      : null;
  if (!provider) {
    return res.status(503).json({
      error:
        'No hay clave de narrador configurada. Agregá ANTHROPIC_API_KEY o ' +
        'XAI_API_KEY a las variables de entorno del proyecto.',
    });
  }

  try {
    const reply =
      provider === 'anthropic' ? await chatViaAnthropic(body.turns) : await chatViaXai(body.turns);
    return res.status(200).json({ ...reply, provider });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'El modelo está saturado, probá en un momento.' });
    }
    if (err instanceof Anthropic.APIError) {
      return res.status(502).json({ error: `Error del modelo (${err.status})` });
    }
    return res.status(502).json({
      error: err instanceof Error ? err.message : 'Error del modelo',
    });
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { resource, id } = req.query;
  const itemId = typeof id === 'string' ? id : undefined;

  if (resource === 'blunder-drills') return blunderDrills(req, res, itemId);
  if (resource === 'position-diagnostics') return positionDiagnostics(req, res);
  if (resource === 'diagnostic-chat') return diagnosticChat(req, res);
  if (resource === 'scouting-targets') return scoutingTargets(req, res, itemId);
  if (resource === 'endgame-drills') return endgameDrills(req, res, itemId);
  if (resource === 'norm-attempts') return normAttempts(req, res, itemId);
  if (resource === 'norm-thresholds') return normThresholds(req, res);
  if (resource === 'training-sessions') return trainingSessions(req, res, itemId);
  if (resource === 'training-attempts') return trainingAttempts(req, res, itemId);
  if (resource === 'books') return books(req, res, itemId);
  if (resource === 'concepts') return concepts(req, res, itemId);
  if (resource === 'repertoire-moves') return repertoireMoves(req, res, itemId);
  if (resource === 'homework') return homework(req, res, itemId);
  if (resource === 'tournaments') return tournaments(req, res, itemId);
  if (resource === 'model-games') return modelGames(req, res, itemId);
  if (resource === 'chess-results') return chessResults(req, res);
  if (resource === 'chess-results-card') return chessResultsCard(req, res);
  if (resource === 'chess-results-pgn') return chessResultsPgn(req, res);
  return res.status(400).json({
    error:
      'Unknown or missing ?resource= (expected blunder-drills, position-diagnostics, diagnostic-chat, scouting-targets, endgame-drills, norm-attempts, norm-thresholds, training-sessions, training-attempts, books, concepts, repertoire-moves, homework, tournaments, model-games, chess-results, chess-results-card, or chess-results-pgn)',
  });
}
