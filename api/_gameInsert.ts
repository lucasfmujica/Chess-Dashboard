import type { GameInput } from './_gameMapper.js';
import { parsePgnDate, openingNameForEco } from './_pgnMeta.js';

/** Minimal slice of the neon client that the insert path needs (mockable in tests). */
export interface GameSql {
  (strings: TemplateStringsArray, ...values: unknown[]): unknown;
  transaction: (queries: never[]) => Promise<unknown>;
}

const PG_UNDEFINED_COLUMN = '42703';
const PG_CHECK_VIOLATION = '23514';

export const CHESSCOM_MIGRATION_ERROR =
  'Chess.com source requires migration 010_sync_chesscom_otb_clocks.sql';

/** Raised when a Chess.com game is rejected because migration 010 isn't applied. */
export class MigrationRequiredError extends Error {}

const errorCode = (err: unknown): string | undefined =>
  typeof err === 'object' && err !== null ? (err as { code?: string }).code : undefined;

/** True when the DB lacks the round / clock_* columns (migration 010 not applied). */
export const isUndefinedColumn = (err: unknown): boolean => errorCode(err) === PG_UNDEFINED_COLUMN;

/** True when the `games_source_check` constraint rejected the row's source. */
export const isSourceCheckViolation = (err: unknown): boolean => {
  if (errorCode(err) !== PG_CHECK_VIOLATION) return false;
  const { constraint, message } = err as { constraint?: string; message?: string };
  return constraint === 'games_source_check' || (message ?? '').includes('games_source_check');
};

function buildQuery(sql: GameSql, game: GameInput, legacy: boolean) {
  const playedDate = game.date ?? parsePgnDate(game.pgn);
  const openingName = game.opening ?? openingNameForEco(game.eco);
  const base = [
    game.gameId ?? null, game.source ?? 'otb', game.color, game.result,
    game.elo, game.opp, game.opp_elo ?? null, game.eco ?? null,
    openingName, game.tournament ?? null, game.rated,
    playedDate, game.time ?? null, game.speed ?? null,
    game.timeControl ?? null, game.eloChange ?? null, game.kFactor ?? null,
    game.pgn ?? null, game.city ?? null, game.country ?? null,
    game.affectsElo ?? true,
  ];
  if (legacy) {
    return sql`
      INSERT INTO games (
        lichess_game_id, source, color, result, elo, opponent, opponent_elo,
        eco, opening_name, tournament, rated, played_date, played_time,
        speed, time_control, elo_change, k_factor, pgn, city, country, affects_elo
      ) VALUES (
        ${base[0]}, ${base[1]}, ${base[2]}, ${base[3]}, ${base[4]}, ${base[5]}, ${base[6]},
        ${base[7]}, ${base[8]}, ${base[9]}, ${base[10]}, ${base[11]}, ${base[12]},
        ${base[13]}, ${base[14]}, ${base[15]}, ${base[16]}, ${base[17]}, ${base[18]},
        ${base[19]}, ${base[20]}
      )
      ON CONFLICT (lichess_game_id) DO UPDATE SET
        source = EXCLUDED.source, color = EXCLUDED.color, result = EXCLUDED.result,
        elo = EXCLUDED.elo, opponent = EXCLUDED.opponent, opponent_elo = EXCLUDED.opponent_elo,
        eco = EXCLUDED.eco, opening_name = EXCLUDED.opening_name, tournament = EXCLUDED.tournament,
        rated = EXCLUDED.rated, played_date = EXCLUDED.played_date, played_time = EXCLUDED.played_time,
        speed = EXCLUDED.speed, time_control = EXCLUDED.time_control, elo_change = EXCLUDED.elo_change,
        k_factor = EXCLUDED.k_factor, pgn = EXCLUDED.pgn, city = EXCLUDED.city, country = EXCLUDED.country,
        affects_elo = EXCLUDED.affects_elo
    `;
  }
  return sql`
    INSERT INTO games (
      lichess_game_id, source, color, result, elo, opponent, opponent_elo,
      eco, opening_name, tournament, rated, played_date, played_time,
      speed, time_control, elo_change, k_factor, pgn, city, country, affects_elo,
      round, clock_20, clock_30, clock_40
    ) VALUES (
      ${base[0]}, ${base[1]}, ${base[2]}, ${base[3]}, ${base[4]}, ${base[5]}, ${base[6]},
      ${base[7]}, ${base[8]}, ${base[9]}, ${base[10]}, ${base[11]}, ${base[12]},
      ${base[13]}, ${base[14]}, ${base[15]}, ${base[16]}, ${base[17]}, ${base[18]},
      ${base[19]}, ${base[20]},
      ${game.round ?? null}, ${game.clock20 ?? null},
      ${game.clock30 ?? null}, ${game.clock40 ?? null}
    )
    ON CONFLICT (lichess_game_id) DO UPDATE SET
      source = EXCLUDED.source, color = EXCLUDED.color, result = EXCLUDED.result,
      elo = EXCLUDED.elo, opponent = EXCLUDED.opponent, opponent_elo = EXCLUDED.opponent_elo,
      eco = EXCLUDED.eco, opening_name = EXCLUDED.opening_name, tournament = EXCLUDED.tournament,
      rated = EXCLUDED.rated, played_date = EXCLUDED.played_date, played_time = EXCLUDED.played_time,
      speed = EXCLUDED.speed, time_control = EXCLUDED.time_control, elo_change = EXCLUDED.elo_change,
      k_factor = EXCLUDED.k_factor, pgn = EXCLUDED.pgn, city = EXCLUDED.city, country = EXCLUDED.country,
      affects_elo = EXCLUDED.affects_elo, round = EXCLUDED.round,
      clock_20 = EXCLUDED.clock_20, clock_30 = EXCLUDED.clock_30, clock_40 = EXCLUDED.clock_40
  `;
}

/**
 * Upsert games in transactional chunks. Prefers the full column set; if the DB
 * lacks the migration-010 columns (42703) the chunk is retried without them, and
 * the legacy shape is kept for the remaining chunks. A Chess.com game rejected by
 * `games_source_check` throws MigrationRequiredError instead of being dropped.
 */
export async function insertGames(sql: GameSql, games: GameInput[], chunkSize = 200): Promise<void> {
  const hasChesscom = games.some(g => g.source === 'chesscom');
  const run = async (chunk: GameInput[], legacy: boolean) => {
    const queries = chunk.map(g => buildQuery(sql, g, legacy));
    try {
      await sql.transaction(queries as never[]);
    } catch (err) {
      if (hasChesscom && isSourceCheckViolation(err)) throw new MigrationRequiredError(CHESSCOM_MIGRATION_ERROR);
      throw err;
    }
  };

  let legacy = false;
  for (let i = 0; i < games.length; i += chunkSize) {
    const chunk = games.slice(i, i + chunkSize);
    try {
      await run(chunk, legacy);
    } catch (err) {
      if (legacy || !isUndefinedColumn(err)) throw err;
      legacy = true;
      await run(chunk, true);
    }
  }
}
