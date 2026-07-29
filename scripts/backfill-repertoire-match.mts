// Link played games to prepared repertoire lines, server-side.
//
// The matcher itself has always existed, but the only way to run it was the
// "Vincular partidas" button in Repertorio -> Mapa, so every row in `games`
// still had a null `repertoire_line_id`. This makes the same run repeatable
// from the command line and independent of anyone opening a tab.
//
// Safe to re-run: it recomputes every match from scratch and writes the result,
// including nulls, so a line that was edited or deleted stops claiming games
// that no longer follow it.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/backfill-repertoire-match.mts
//   npx tsx --env-file=.env.local scripts/backfill-repertoire-match.mts --apply
//
// Without --apply it only reports, writing nothing.
import { neon } from '@neondatabase/serverless';
import { buildRepertoireMatches, type MatchableGame } from '../src/utils/repertoireMatchRun.js';
import type { RepertoireLine } from '../src/types/chess.js';

const apply = process.argv.includes('--apply');

if (!process.env.DATABASE_URL) {
  console.error(
    'DATABASE_URL is not set. Run with: npx tsx --env-file=.env.local scripts/backfill-repertoire-match.mts'
  );
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

const lineRows = (await sql`
  SELECT id, color, eco, line_name, moves_san, priority, confidence
  FROM repertoire_lines
`) as {
  id: string;
  color: 'W' | 'B';
  eco: string | null;
  line_name: string | null;
  moves_san: string | null;
  priority: number | null;
  confidence: number | null;
}[];

const lines = lineRows.map(
  row =>
    ({
      id: row.id,
      color: row.color,
      eco: row.eco ?? undefined,
      lineName: row.line_name ?? undefined,
      movesSan: row.moves_san ?? undefined,
    }) as RepertoireLine
);

const gameRows = (await sql`
  SELECT id, color, pgn, source FROM games
`) as { id: string; color: 'W' | 'B'; pgn: string | null; source: string }[];

const games: (MatchableGame & { source: string })[] = gameRows.map(row => ({
  id: row.id,
  color: row.color,
  pgn: row.pgn ?? undefined,
  source: row.source,
}));

const { matches, considered, matched, skipped } = buildRepertoireMatches(games, lines);

const nameById = new Map(lineRows.map(r => [r.id, r.line_name ?? r.eco ?? r.id]));
const sourceById = new Map(games.map(g => [g.id as string, g.source]));

// Per-line tallies, deepest-held lines last: a line every game leaves on move 4
// is prep that isn't holding, and that is the whole point of storing the ply.
const perLine = new Map<string, { games: number; exitSum: number }>();
const perSource = new Map<string, { considered: number; matched: number }>();

for (const match of matches) {
  const source = sourceById.get(match.id) ?? 'unknown';
  const bucket = perSource.get(source) ?? { considered: 0, matched: 0 };
  bucket.considered += 1;
  if (match.repertoireLineId) {
    bucket.matched += 1;
    const entry = perLine.get(match.repertoireLineId) ?? { games: 0, exitSum: 0 };
    entry.games += 1;
    entry.exitSum += match.bookExitPly ?? 0;
    perLine.set(match.repertoireLineId, entry);
  }
  perSource.set(source, bucket);
}

const pct = (n: number, of: number) => (of === 0 ? '0.0' : ((n / of) * 100).toFixed(1));

console.log(
  `\n${lines.length} prepared lines (${lines.filter(l => l.color === 'W').length}W / ${
    lines.filter(l => l.color === 'B').length
  }B) against ${gameRows.length} games.`
);
console.log(`${skipped} skipped (no movetext), ${considered} considered.`);
console.log(`${matched} matched (${pct(matched, considered)}% of considered).\n`);

for (const [source, s] of [...perSource].sort((a, b) => b[1].considered - a[1].considered)) {
  console.log(`  ${source.padEnd(8)} ${s.matched}/${s.considered} (${pct(s.matched, s.considered)}%)`);
}

console.log(`\n${perLine.size} of ${lines.length} lines claimed at least one game:`);
for (const [id, s] of [...perLine].sort((a, b) => b[1].games - a[1].games)) {
  const avgExit = (s.exitSum / s.games).toFixed(1);
  console.log(`  ${String(s.games).padStart(4)} games  exit ply ${avgExit.padStart(5)}  ${nameById.get(id)}`);
}

const unclaimed = lineRows.filter(r => !perLine.has(r.id));
if (unclaimed.length > 0) {
  console.log(`\n${unclaimed.length} lines matched nothing:`);
  for (const row of unclaimed) console.log(`  ${row.color}  ${row.line_name ?? row.eco ?? row.id}`);
}

if (!apply) {
  console.log('\nDry run — nothing written. Re-run with --apply to persist.');
  process.exit(0);
}

// Chunked like the bulk PATCH in api/games.ts, for the same reason: one
// statement per game would be hundreds of round trips.
const CHUNK = 200;
for (let i = 0; i < matches.length; i += CHUNK) {
  const chunk = matches.slice(i, i + CHUNK);
  await sql.transaction(
    chunk.map(
      m => sql`
        UPDATE games SET
          repertoire_line_id = ${m.repertoireLineId}::uuid,
          book_exit_ply = ${m.bookExitPly}
        WHERE id = ${m.id}
      `
    ) as Parameters<typeof sql.transaction>[0]
  );
}

console.log(`\nWrote ${matches.length} rows (${matched} linked, ${matches.length - matched} cleared).`);
