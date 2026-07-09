// One-off backfill: derive played_date (from each game's PGN [Date] header)
// and opening_name (from its ECO code) for rows inserted before api/_pgnMeta.ts
// existed. Safe to re-run — only touches rows where the column is still null.
// Usage: node --env-file=.env.local scripts/backfill-game-metadata.mjs
import { neon } from '@neondatabase/serverless';
import { ecoNames } from '../src/constants/ecoNames.js';

const parsePgnDate = pgn => {
  if (!pgn) return null;
  const match = pgn.match(/\[Date\s+"(\d{4})\.(\d{1,2})\.(\d{1,2})"\]/);
  if (!match) return null;
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Run with: node --env-file=.env.local scripts/backfill-game-metadata.mjs');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const rows = await sql`SELECT id, eco, pgn, played_date, opening_name FROM games WHERE played_date IS NULL OR opening_name IS NULL`;

let dateFixed = 0;
let openingFixed = 0;

for (const row of rows) {
  const playedDate = row.played_date ?? parsePgnDate(row.pgn);
  const openingName = row.opening_name ?? (row.eco ? ecoNames[row.eco] ?? null : null);
  if (playedDate === row.played_date && openingName === row.opening_name) continue;

  await sql`UPDATE games SET played_date = ${playedDate}, opening_name = ${openingName} WHERE id = ${row.id}`;
  if (playedDate && !row.played_date) dateFixed++;
  if (openingName && !row.opening_name) openingFixed++;
}

console.log(`Checked ${rows.length} rows. Backfilled played_date on ${dateFixed}, opening_name on ${openingFixed}.`);
