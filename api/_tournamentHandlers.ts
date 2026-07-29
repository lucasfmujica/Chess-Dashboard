import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db.js';
import { requireApiKey } from './_auth.js';
import {
  rowToTournament,
  rowToModelGame,
  type TournamentRow,
  type ModelGameRow,
} from './_tournamentMapper.js';

// Dispatched from prep.ts — `_`-prefixed modules are not routes, and the
// project is at the Vercel Hobby function ceiling.

interface TournamentInput {
  name: string;
  startDate?: string | null;
  endDate?: string | null;
  kind?: string;
  category?: string;
  timeControl?: string;
  affectsElo?: boolean;
  officialPerformance?: number;
  officialPoints?: number;
  officialPlace?: number;
  startingRank?: number;
  eloBefore?: number;
  eloChange?: number;
  club?: string;
  province?: string;
  chessResultsUrl?: string;
  notes?: string;
}

export const tournaments = async (
  req: VercelRequest,
  res: VercelResponse,
  id: string | undefined
) => {
  if (id) {
    if (req.method === 'PUT') {
      if (!requireApiKey(req, res)) return;
      const t = req.body as Partial<TournamentInput>;
      const rows = (await sql`
        UPDATE tournaments SET
          name = COALESCE(${t.name ?? null}, name),
          start_date = COALESCE(${t.startDate ?? null}::date, start_date),
          end_date = COALESCE(${t.endDate ?? null}::date, end_date),
          kind = COALESCE(${t.kind ?? null}, kind),
          category = COALESCE(${t.category ?? null}, category),
          time_control = COALESCE(${t.timeControl ?? null}, time_control),
          affects_elo = COALESCE(${t.affectsElo ?? null}, affects_elo),
          official_performance = COALESCE(${t.officialPerformance ?? null}, official_performance),
          official_points = COALESCE(${t.officialPoints ?? null}, official_points),
          official_place = COALESCE(${t.officialPlace ?? null}, official_place),
          starting_rank = COALESCE(${t.startingRank ?? null}, starting_rank),
          elo_before = COALESCE(${t.eloBefore ?? null}, elo_before),
          elo_change = COALESCE(${t.eloChange ?? null}, elo_change),
          club = COALESCE(${t.club ?? null}, club),
          province = COALESCE(${t.province ?? null}, province),
          chess_results_url = COALESCE(${t.chessResultsUrl ?? null}, chess_results_url),
          notes = COALESCE(${t.notes ?? null}, notes)
        WHERE id = ${id}
        RETURNING *
      `) as TournamentRow[];
      if (rows.length === 0) return res.status(404).json({ error: 'Tournament not found' });
      return res.status(200).json(rowToTournament(rows[0]));
    }

    if (req.method === 'DELETE') {
      if (!requireApiKey(req, res)) return;
      const rows = await sql`DELETE FROM tournaments WHERE id = ${id} RETURNING id`;
      if (rows.length === 0) return res.status(404).json({ error: 'Tournament not found' });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    // Newest first by the date we know; a tournament with no start_date still
    // appears, ordered by when it was created.
    const rows = (await sql`
      SELECT * FROM tournaments ORDER BY start_date DESC NULLS LAST, created_at DESC
    `) as TournamentRow[];
    return res.status(200).json(rows.map(rowToTournament));
  }

  if (req.method === 'POST') {
    if (!requireApiKey(req, res)) return;
    const t = req.body as TournamentInput;
    if (!t?.name?.trim()) return res.status(400).json({ error: 'name is required' });
    // Upsert on name: re-importing an edition should correct it, not fail.
    const rows = (await sql`
      INSERT INTO tournaments (
        name, start_date, end_date, kind, category, time_control, affects_elo,
        official_performance, official_points, official_place, starting_rank,
        elo_before, elo_change, club, province, chess_results_url, notes
      ) VALUES (
        ${t.name.trim()}, ${t.startDate ?? null}::date, ${t.endDate ?? null}::date,
        ${t.kind ?? 'individual'}, ${t.category ?? null}, ${t.timeControl ?? null},
        ${t.affectsElo ?? true}, ${t.officialPerformance ?? null}, ${t.officialPoints ?? null},
        ${t.officialPlace ?? null}, ${t.startingRank ?? null}, ${t.eloBefore ?? null},
        ${t.eloChange ?? null}, ${t.club ?? null}, ${t.province ?? null},
        ${t.chessResultsUrl ?? null}, ${t.notes ?? null}
      )
      ON CONFLICT (name) DO UPDATE SET
        start_date = COALESCE(EXCLUDED.start_date, tournaments.start_date),
        end_date = COALESCE(EXCLUDED.end_date, tournaments.end_date),
        kind = EXCLUDED.kind,
        category = COALESCE(EXCLUDED.category, tournaments.category),
        time_control = COALESCE(EXCLUDED.time_control, tournaments.time_control),
        affects_elo = EXCLUDED.affects_elo,
        official_performance = COALESCE(EXCLUDED.official_performance, tournaments.official_performance),
        official_points = COALESCE(EXCLUDED.official_points, tournaments.official_points),
        official_place = COALESCE(EXCLUDED.official_place, tournaments.official_place),
        starting_rank = COALESCE(EXCLUDED.starting_rank, tournaments.starting_rank),
        elo_before = COALESCE(EXCLUDED.elo_before, tournaments.elo_before),
        elo_change = COALESCE(EXCLUDED.elo_change, tournaments.elo_change),
        club = COALESCE(EXCLUDED.club, tournaments.club),
        province = COALESCE(EXCLUDED.province, tournaments.province),
        chess_results_url = COALESCE(EXCLUDED.chess_results_url, tournaments.chess_results_url),
        notes = COALESCE(EXCLUDED.notes, tournaments.notes)
      RETURNING *
    `) as TournamentRow[];
    return res.status(201).json(rowToTournament(rows[0]));
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};

interface ModelGameInput {
  eco: string;
  hero: string;
  event?: string;
  year?: number;
  result?: string;
  pgn: string;
  note?: string;
}

export const modelGames = async (
  req: VercelRequest,
  res: VercelResponse,
  id: string | undefined
) => {
  if (id && req.method === 'DELETE') {
    if (!requireApiKey(req, res)) return;
    const rows = await sql`DELETE FROM model_games WHERE id = ${id} RETURNING id`;
    if (rows.length === 0) return res.status(404).json({ error: 'Model game not found' });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    const rows = (await sql`
      SELECT * FROM model_games ORDER BY eco ASC, hero ASC, year DESC NULLS LAST
    `) as ModelGameRow[];
    return res.status(200).json(rows.map(rowToModelGame));
  }

  if (req.method === 'POST') {
    if (!requireApiKey(req, res)) return;
    const g = req.body as ModelGameInput;
    if (!g?.eco?.trim() || !g?.hero?.trim() || !g?.pgn?.trim()) {
      return res.status(400).json({ error: 'eco, hero and pgn are required' });
    }
    const rows = (await sql`
      INSERT INTO model_games (eco, hero, event, year, result, pgn, note)
      VALUES (
        ${g.eco.trim()}, ${g.hero.trim()}, ${g.event ?? null}, ${g.year ?? null},
        ${g.result ?? null}, ${g.pgn.trim()}, ${g.note ?? null}
      )
      RETURNING *
    `) as ModelGameRow[];
    return res.status(201).json(rowToModelGame(rows[0]));
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
};
