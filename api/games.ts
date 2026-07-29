import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db.js';
import { requireApiKey } from './_auth.js';
import { rowToGame, type GameRow, type GameInput } from './_gameMapper.js';
import { parsePgnDate, openingNameForEco } from './_pgnMeta.js';

interface GamePatch {
  pgn?: string | null;
  repertoireLineId?: string | null;
  bookExitPly?: number | null;
}

/** One entry of a bulk `PATCH /api/games` repertoire-match write. */
interface GameRepertoireMatch {
  id: string;
  repertoireLineId: string | null;
  bookExitPly: number | null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (typeof id === 'string') {
    if (req.method === 'PATCH') {
      if (!requireApiKey(req, res)) return;
      const body = (req.body ?? {}) as GamePatch;
      // Genuinely partial: only columns whose key is present in the body are
      // touched. Sending `{pgn}` must not clear the repertoire link, and
      // sending `{repertoireLineId}` must not wipe the PGN.
      const has = (key: keyof GamePatch) => Object.prototype.hasOwnProperty.call(body, key);
      const setsPgn = has('pgn');
      // Backfill played_date from the newly-attached PGN's [Date] header, but
      // only if the row doesn't already have one (don't clobber an explicit date).
      const derivedDate = setsPgn ? parsePgnDate(body.pgn) : null;
      const rows = (await sql`
        UPDATE games SET
          pgn = CASE WHEN ${setsPgn} THEN ${body.pgn ?? null} ELSE pgn END,
          played_date = COALESCE(played_date, ${derivedDate}),
          repertoire_line_id = CASE WHEN ${has('repertoireLineId')}
            THEN ${body.repertoireLineId ?? null}::uuid ELSE repertoire_line_id END,
          book_exit_ply = CASE WHEN ${has('bookExitPly')}
            THEN ${body.bookExitPly ?? null} ELSE book_exit_ply END
        WHERE id = ${id} RETURNING *
      `) as GameRow[];
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Game not found' });
      }
      return res.status(200).json(rowToGame(rows[0]));
    }

    res.setHeader('Allow', 'PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    const rows = (await sql`SELECT * FROM games ORDER BY created_at ASC`) as GameRow[];
    return res.status(200).json(rows.map(rowToGame));
  }

  if (req.method === 'POST') {
    if (!requireApiKey(req, res)) return;
    const games = req.body as GameInput[];
    if (!Array.isArray(games)) {
      return res.status(400).json({ error: 'Expected an array of games' });
    }

    // Batch imports (e.g. a full date-range Lichess sync) can be hundreds of rows;
    // pipeline them as one transaction instead of awaiting each insert sequentially
    // so a large sync doesn't risk hitting the serverless function's time limit.
    const CHUNK_SIZE = 200;
    for (let i = 0; i < games.length; i += CHUNK_SIZE) {
      const chunk = games.slice(i, i + CHUNK_SIZE);
      const queries = chunk.map((game) => {
        const playedDate = game.date ?? parsePgnDate(game.pgn);
        const openingName = game.opening ?? openingNameForEco(game.eco);
        return sql`
          INSERT INTO games (
            lichess_game_id, source, color, result, elo, opponent, opponent_elo,
            eco, opening_name, tournament, rated, played_date, played_time,
            speed, time_control, elo_change, k_factor, pgn, city, country
          ) VALUES (
            ${game.gameId ?? null}, ${game.source ?? 'otb'}, ${game.color}, ${game.result},
            ${game.elo}, ${game.opp}, ${game.opp_elo ?? null}, ${game.eco ?? null},
            ${openingName}, ${game.tournament ?? null}, ${game.rated},
            ${playedDate}, ${game.time ?? null}, ${game.speed ?? null},
            ${game.timeControl ?? null}, ${game.eloChange ?? null}, ${game.kFactor ?? null},
            ${game.pgn ?? null}, ${game.city ?? null}, ${game.country ?? null}
          )
          ON CONFLICT (lichess_game_id) DO UPDATE SET
            source = EXCLUDED.source, color = EXCLUDED.color, result = EXCLUDED.result,
            elo = EXCLUDED.elo, opponent = EXCLUDED.opponent, opponent_elo = EXCLUDED.opponent_elo,
            eco = EXCLUDED.eco, opening_name = EXCLUDED.opening_name, tournament = EXCLUDED.tournament,
            rated = EXCLUDED.rated, played_date = EXCLUDED.played_date, played_time = EXCLUDED.played_time,
            speed = EXCLUDED.speed, time_control = EXCLUDED.time_control, elo_change = EXCLUDED.elo_change,
            k_factor = EXCLUDED.k_factor, pgn = EXCLUDED.pgn, city = EXCLUDED.city, country = EXCLUDED.country
        `;
      });
      if (queries.length > 0) {
        await sql.transaction(queries as Parameters<typeof sql.transaction>[0]);
      }
    }

    return res.status(201).json({ inserted: games.length });
  }

  if (req.method === 'PATCH') {
    if (!requireApiKey(req, res)) return;
    // Bulk repertoire-match write. Matching runs client-side over every game,
    // so this exists to avoid ~460 separate round-trips per run.
    const matches = req.body as GameRepertoireMatch[];
    if (!Array.isArray(matches)) {
      return res.status(400).json({ error: 'Expected an array of repertoire matches' });
    }
    for (let i = 0; i < matches.length; i += 200) {
      const chunk = matches.slice(i, i + 200);
      const queries = chunk.map(
        m => sql`
          UPDATE games SET
            repertoire_line_id = ${m.repertoireLineId ?? null}::uuid,
            book_exit_ply = ${m.bookExitPly ?? null}
          WHERE id = ${m.id}
        `
      );
      await sql.transaction(queries as Parameters<typeof sql.transaction>[0]);
    }
    return res.status(200).json({ updated: matches.length });
  }

  if (req.method === 'DELETE') {
    if (!requireApiKey(req, res)) return;
    const { source } = req.query;
    if (!source || typeof source !== 'string') {
      return res.status(400).json({ error: 'Missing ?source= query param' });
    }
    const deleted = await sql`DELETE FROM games WHERE source = ${source} RETURNING id`;
    return res.status(200).json({ deleted: deleted.length });
  }

  res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
