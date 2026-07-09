import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db.js';
import { requireApiKey } from '../_auth.js';
import { rowToGame, type GameRow, type GameInput } from '../_gameMapper.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    for (const game of games) {
      await sql`
        INSERT INTO games (
          lichess_game_id, source, color, result, elo, opponent, opponent_elo,
          eco, opening_name, tournament, rated, played_date, played_time,
          speed, time_control, elo_change, k_factor, pgn, city, country
        ) VALUES (
          ${game.gameId ?? null}, ${game.source ?? 'otb'}, ${game.color}, ${game.result},
          ${game.elo}, ${game.opp}, ${game.opp_elo ?? null}, ${game.eco ?? null},
          ${game.opening ?? null}, ${game.tournament ?? null}, ${game.rated},
          ${game.date ?? null}, ${game.time ?? null}, ${game.speed ?? null},
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
    }

    return res.status(201).json({ inserted: games.length });
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

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
