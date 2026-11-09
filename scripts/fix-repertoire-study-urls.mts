// Point repertoire_lines.lichess_url at the current study export.
//
// The 32 rows were written against an earlier export of the study
// (iPk8Xex1, now a 404). public/data/repertoire-study.pgn carries the live
// study (DPH7PV7i) and a ChapterURL per chapter; this copies each chapter's
// URL onto the row with the same NN prefix in line_name.
//
// Without --apply it only reports old -> new, writing nothing.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/fix-repertoire-study-urls.mts
//   npx tsx --env-file=.env.local scripts/fix-repertoire-study-urls.mts --apply
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import { parseStudyPgn } from '../src/utils/studyPgn.js';
import { chapterUrlMap, lineUrlChanges } from '../src/utils/studyChapterUrls.js';

const apply = process.argv.includes('--apply');

if (!process.env.DATABASE_URL) {
  console.error(
    'DATABASE_URL is not set. Run with: npx tsx --env-file=.env.local scripts/fix-repertoire-study-urls.mts'
  );
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PGN_PATH = path.join(__dirname, '../public/data/repertoire-study.pgn');

const sql = neon(process.env.DATABASE_URL);

const urls = chapterUrlMap(await parseStudyPgn(readFileSync(PGN_PATH, 'utf8')));
if (urls.size === 0) {
  console.error('No ChapterURL found in the study PGN — refusing to touch the table.');
  process.exit(1);
}

const lines = (await sql`
  SELECT id, line_name, lichess_url FROM repertoire_lines
`) as { id: string; line_name: string | null; lichess_url: string | null }[];

const changes = lineUrlChanges(lines, urls);
const unmatched = lines.filter(l => !changes.some(c => c.id === l.id) && !urls.has(Number(l.line_name?.match(/^\s*(\d{1,2})\b/)?.[1])));

console.log(`Chapters with a URL: ${urls.size}`);
console.log(`Rows in DB:          ${lines.length}`);
console.log(`To update:           ${changes.length}`);
for (const c of changes) console.log(`  ${c.lineName}\n    ${c.from ?? '(none)'}\n -> ${c.to}`);
if (unmatched.length) {
  console.log(`\nNo chapter for ${unmatched.length} row(s), left alone:`);
  for (const l of unmatched) console.log(`  ${l.line_name ?? l.id}`);
}

if (!apply) {
  console.log('\nDry run — nothing written. Re-run with --apply.');
  process.exit(0);
}

await sql.transaction(
  changes.map(c => sql`UPDATE repertoire_lines SET lichess_url = ${c.to} WHERE id = ${c.id}`) as Parameters<
    typeof sql.transaction
  >[0]
);
console.log(`\nApplied. Updated ${changes.length} rows.`);
