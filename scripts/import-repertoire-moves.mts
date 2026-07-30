// Explode the repertoire study PGN into one trainable row per decision.
//
// `repertoire_lines` holds the 32 chapters, one row each, which is what the
// flashcard trainer grades: a single card for a whole chapter. The study PGN
// behind those chapters carries ~1100 moves across its mainlines and 295
// variations, and roughly 550 of them are the player's. This fills
// `repertoire_moves` with those, so the board trainer has something finer than
// "do you know the Accelerated Dragon" to ask.
//
// Safe to re-run. The upsert refreshes the study content (move, reply,
// comment, role) but never touches confidence / last_reviewed / review_count,
// so re-exporting the study from Lichess cannot wipe review progress.
//
// Rows whose (chapter, path, move) no longer appear in the PGN are reported as
// orphans and deleted only with --prune: a chapter that failed to parse would
// otherwise silently delete its own history.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/import-repertoire-moves.mts
//   npx tsx --env-file=.env.local scripts/import-repertoire-moves.mts --apply
//   npx tsx --env-file=.env.local scripts/import-repertoire-moves.mts --apply --prune
//
// Without --apply it only reports, writing nothing.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import { parseStudyPgn } from '../src/utils/studyPgn.js';
import { extractRepertoireMoves } from '../src/utils/repertoireMoves.js';

const apply = process.argv.includes('--apply');
const prune = process.argv.includes('--prune');

if (!process.env.DATABASE_URL) {
  console.error(
    'DATABASE_URL is not set. Run with: npx tsx --env-file=.env.local scripts/import-repertoire-moves.mts'
  );
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PGN_PATH = path.join(__dirname, '../public/data/repertoire-study.pgn');

const sql = neon(process.env.DATABASE_URL);

const chapters = await parseStudyPgn(readFileSync(PGN_PATH, 'utf8'));
const rows = extractRepertoireMoves(chapters);

if (rows.length === 0) {
  console.error('Parsed 0 trainable moves — refusing to touch the table.');
  process.exit(1);
}

const existing = (await sql`
  SELECT chapter_no, path_san, expected_san FROM repertoire_moves
`) as { chapter_no: number; path_san: string; expected_san: string }[];

const key = (chapterNo: number, pathSan: string, expectedSan: string) =>
  `${chapterNo}|${pathSan}|${expectedSan}`;

const existingKeys = new Set(existing.map(r => key(r.chapter_no, r.path_san, r.expected_san)));
const incomingKeys = new Set(rows.map(r => key(r.chapterNo, r.pathSan, r.expectedSan)));

const inserts = rows.filter(r => !existingKeys.has(key(r.chapterNo, r.pathSan, r.expectedSan)));
const updates = rows.length - inserts.length;
const orphans = existing.filter(r => !incomingKeys.has(key(r.chapter_no, r.path_san, r.expected_san)));

const byRole = rows.reduce<Record<string, number>>((acc, r) => {
  acc[r.role] = (acc[r.role] ?? 0) + 1;
  return acc;
}, {});

console.log(`Chapters parsed:  ${chapters.length}`);
console.log(`Moves extracted:  ${rows.length}  (${JSON.stringify(byRole)})`);
console.log(`  new:            ${inserts.length}`);
console.log(`  refreshed:      ${updates}`);
console.log(`  orphaned in DB: ${orphans.length}${orphans.length && !prune ? ' (pass --prune to delete)' : ''}`);

if (!apply) {
  console.log('\nDry run — nothing written. Re-run with --apply.');
  process.exit(0);
}

// Chunked so a single statement never carries all ~550 rows.
const CHUNK = 50;
for (let i = 0; i < rows.length; i += CHUNK) {
  const chunk = rows.slice(i, i + CHUNK);
  const queries = chunk.map(
    r => sql`
      INSERT INTO repertoire_moves (
        chapter_no, chapter_name, eco, color, path_san, fen_before,
        expected_san, reply_san, comment, is_mainline, role, depth
      ) VALUES (
        ${r.chapterNo}, ${r.chapterName}, ${r.eco || null}, ${r.color}, ${r.pathSan},
        ${r.fenBefore}, ${r.expectedSan}, ${r.replySan ?? null}, ${r.comment ?? null},
        ${r.isMainline}, ${r.role}, ${r.depth}
      )
      ON CONFLICT (chapter_no, path_san, expected_san) DO UPDATE SET
        chapter_name = EXCLUDED.chapter_name,
        eco          = EXCLUDED.eco,
        color        = EXCLUDED.color,
        fen_before   = EXCLUDED.fen_before,
        reply_san    = EXCLUDED.reply_san,
        comment      = EXCLUDED.comment,
        is_mainline  = EXCLUDED.is_mainline,
        role         = EXCLUDED.role,
        depth        = EXCLUDED.depth
    `
  );
  await sql.transaction(queries as Parameters<typeof sql.transaction>[0]);
}

if (prune && orphans.length > 0) {
  for (const o of orphans) {
    await sql`
      DELETE FROM repertoire_moves
      WHERE chapter_no = ${o.chapter_no}
        AND path_san = ${o.path_san}
        AND expected_san = ${o.expected_san}
    `;
  }
  console.log(`\nPruned ${orphans.length} orphaned rows.`);
}

const [{ count }] = (await sql`SELECT count(*)::int AS count FROM repertoire_moves`) as {
  count: number;
}[];
console.log(`\nApplied. repertoire_moves now holds ${count} rows.`);
