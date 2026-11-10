import { describe, it, expect, vi } from 'vitest';
import { insertGames, MigrationRequiredError, CHESSCOM_MIGRATION_ERROR, type GameSql } from './_gameInsert';
import type { GameInput } from './_gameMapper';

const game = (over: Partial<GameInput> = {}): GameInput =>
  ({ color: 'W', result: 'W', elo: 2000, opp: 'x', rated: true, ...over }) as GameInput;

/** Fake neon client: template tags return their SQL text; transaction is a spy. */
function fakeSql(transaction: (q: string[]) => Promise<unknown>) {
  const sql = ((strings: TemplateStringsArray) => strings.join('?')) as unknown as GameSql;
  sql.transaction = vi.fn(transaction as never) as never;
  return sql;
}
const pgError = (code: string, extra: object = {}) => Object.assign(new Error('pg'), { code, ...extra });
const calls = (sql: GameSql) => (sql.transaction as unknown as ReturnType<typeof vi.fn>).mock.calls;

describe('insertGames', () => {
  it('inserts with the migration-010 columns first', async () => {
    const sql = fakeSql(async () => []);
    await insertGames(sql, [game(), game()]);
    expect(calls(sql)).toHaveLength(1);
    const queries = calls(sql)[0][0] as string[];
    expect(queries).toHaveLength(2);
    expect(queries[0]).toContain('clock_20');
    expect(queries[0]).toContain('round');
  });

  it('retries the chunk without the new columns on undefined_column (42703)', async () => {
    let n = 0;
    const sql = fakeSql(async () => {
      if (n++ === 0) throw pgError('42703');
    });
    await insertGames(sql, [game()]);
    expect(calls(sql)).toHaveLength(2);
    expect((calls(sql)[1][0] as string[])[0]).not.toMatch(/clock_|round/);
  });

  it('stays legacy for later chunks once a retry was needed', async () => {
    let n = 0;
    const sql = fakeSql(async () => {
      if (n++ === 0) throw pgError('42703');
    });
    await insertGames(sql, [game(), game(), game()], 2);
    expect(calls(sql)).toHaveLength(3);
    expect((calls(sql)[2][0] as string[])[0]).not.toMatch(/clock_|round/);
  });

  it('rejects chesscom games on games_source_check with a migration error', async () => {
    const sql = fakeSql(async () => {
      throw pgError('23514', { constraint: 'games_source_check' });
    });
    const err = await insertGames(sql, [game({ source: 'chesscom' })]).catch(e => e);
    expect(err).toBeInstanceOf(MigrationRequiredError);
    expect(err.message).toBe(CHESSCOM_MIGRATION_ERROR);
  });

  it('also surfaces it when the legacy retry hits the check', async () => {
    let n = 0;
    const sql = fakeSql(async () => {
      throw n++ === 0 ? pgError('42703') : pgError('23514', { constraint: 'games_source_check' });
    });
    await expect(insertGames(sql, [game({ source: 'chesscom' })])).rejects.toBeInstanceOf(MigrationRequiredError);
  });

  it('rethrows a 23514 when no game is chesscom, and other errors untouched', async () => {
    const check = fakeSql(async () => {
      throw pgError('23514', { constraint: 'games_source_check' });
    });
    await expect(insertGames(check, [game({ source: 'lichess' })])).rejects.not.toBeInstanceOf(MigrationRequiredError);
    const other = fakeSql(async () => {
      throw pgError('08006');
    });
    await expect(insertGames(other, [game()])).rejects.toMatchObject({ code: '08006' });
  });
});
