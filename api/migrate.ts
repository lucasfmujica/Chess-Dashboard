import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db';
import { requireApiKey } from './_auth';
import type { GameInput } from './_gameMapper';

interface MigratePayload {
  games?: GameInput[];
  mainRepertoire?: { white: string[]; black: string[] };
  openingHeroes?: Record<string, string[]>;
  annotatedGames?: Array<{
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
  }>;
  openingFlashcards?: Array<{
    name: string;
    moves: string;
    fen: string;
    color: string;
    difficulty: string;
    reviewCount: number;
    lastReviewed: number | null;
    nextReview: number;
    successRate: number;
    totalAttempts: number;
  }>;
  playerInfo?: {
    current_elo: number;
    elo_change_last_tournament?: number;
    last_tournament?: string;
  };
}

/**
 * One-time bulk import of a user's existing localStorage data. Idempotent
 * server-side (not just client-flag-gated): no-ops if `games` already has
 * rows, since React StrictMode can double-invoke the client's mount effect.
 * Not wrapped in a single DB transaction — acceptable for a one-shot,
 * user-triggered personal-data import; a partial failure just leaves
 * whatever inserted so far, and retrying is safe because of the guard below.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireApiKey(req, res)) return;

  const existing = await sql`SELECT id FROM games LIMIT 1`;
  if (existing.length > 0) {
    return res.status(200).json({ migrated: false, reason: 'games table already has data' });
  }

  const payload = req.body as MigratePayload;
  let gamesInserted = 0;
  let annotationsInserted = 0;
  let flashcardsInserted = 0;

  for (const game of payload.games ?? []) {
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
      ON CONFLICT (lichess_game_id) DO NOTHING
    `;
    gamesInserted++;
  }

  if (payload.mainRepertoire) {
    await sql`
      INSERT INTO repertoire (id, white_ecos, black_ecos)
      VALUES (1, ${payload.mainRepertoire.white}, ${payload.mainRepertoire.black})
      ON CONFLICT (id) DO UPDATE SET white_ecos = EXCLUDED.white_ecos, black_ecos = EXCLUDED.black_ecos
    `;
  }

  for (const [eco, heroes] of Object.entries(payload.openingHeroes ?? {})) {
    await sql`
      INSERT INTO opening_heroes (eco, heroes) VALUES (${eco}, ${heroes})
      ON CONFLICT (eco) DO UPDATE SET heroes = EXCLUDED.heroes
    `;
  }

  for (const a of payload.annotatedGames ?? []) {
    await sql`
      INSERT INTO annotated_games (
        game_name, opponent, played_date, opening, eco, result, rating, tags, notes, key_moments, pgn
      ) VALUES (
        ${a.gameName ?? null}, ${a.opponent ?? null}, ${a.date ?? null}, ${a.opening ?? null},
        ${a.eco ?? null}, ${a.result ?? null}, ${a.rating ?? null}, ${a.tags ?? []},
        ${a.notes ?? null}, ${JSON.stringify(a.keyMoments ?? [])}, ${a.pgn ?? null}
      )
    `;
    annotationsInserted++;
  }

  for (const c of payload.openingFlashcards ?? []) {
    await sql`
      INSERT INTO opening_flashcards (
        name, moves, fen, color, difficulty, review_count, last_reviewed, next_review,
        success_rate, total_attempts
      ) VALUES (
        ${c.name}, ${c.moves}, ${c.fen}, ${c.color}, ${c.difficulty}, ${c.reviewCount},
        ${c.lastReviewed ? new Date(c.lastReviewed).toISOString() : null},
        ${new Date(c.nextReview).toISOString()}, ${c.successRate}, ${c.totalAttempts}
      )
    `;
    flashcardsInserted++;
  }

  if (payload.playerInfo) {
    await sql`
      INSERT INTO profile (id, current_elo, elo_change_last_tournament, last_tournament, updated_at)
      VALUES (1, ${payload.playerInfo.current_elo}, ${payload.playerInfo.elo_change_last_tournament ?? null},
        ${payload.playerInfo.last_tournament ?? null}, now())
      ON CONFLICT (id) DO UPDATE SET
        current_elo = EXCLUDED.current_elo,
        elo_change_last_tournament = EXCLUDED.elo_change_last_tournament,
        last_tournament = EXCLUDED.last_tournament,
        updated_at = now()
    `;
  }

  return res.status(200).json({
    migrated: true,
    gamesInserted,
    annotationsInserted,
    flashcardsInserted,
  });
}
