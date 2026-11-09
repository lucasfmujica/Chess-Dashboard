import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db.js';
import { requireApiKey } from './_auth.js';
import { rowToGame, type GameRow, type GameInput } from './_gameMapper.js';
import { parsePgnDate } from './_pgnMeta.js';
import { insertGames, MigrationRequiredError, type GameSql } from './_gameInsert.js';

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
    try {
      await insertGames(sql as unknown as GameSql, games);
    } catch (err) {
      if (err instanceof MigrationRequiredError) {
        return res.status(400).json({ error: err.message });
      }
      throw err;
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
