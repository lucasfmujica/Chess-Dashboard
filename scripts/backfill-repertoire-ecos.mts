// Fill the `repertoire` singleton from the prepared lines.
//
// `repertoire.white_ecos` / `black_ecos` is the app's "which openings are
// mine" allow-list, and it has been EMPTY: nothing ever wrote it. Everything
// keyed on it silently resolved to "not mine" — the colour badges in the
// heroes gallery, the ECO pills in Repertorio -> Mapa, and the `isMain` flag
// that Opening Recommendations is computed from.
//
// `repertoire_lines` is the table that is actually populated (32 chapters), so
// it is the source. Safe to re-run: it recomputes both arrays from scratch.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/backfill-repertoire-ecos.mts
//   npx tsx --env-file=.env.local scripts/backfill-repertoire-ecos.mts --apply
//
// Without --apply it only reports, writing nothing.
import { neon } from '@neondatabase/serverless';
import { buildRepertoireEcoIndex, repertoireEcosByColor } from '../src/utils/repertoireEcos.js';
import type { RepertoireLine } from '../src/types/chess.js';

const apply = process.argv.includes('--apply');

if (!process.env.DATABASE_URL) {
  console.error(
    'DATABASE_URL is not set. Run with: npx tsx --env-file=.env.local scripts/backfill-repertoire-ecos.mts'
  );
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

const rows = (await sql`
  SELECT id, color, eco, line_name, priority FROM repertoire_lines
`) as { id: string; color: 'W' | 'B'; eco: string | null; line_name: string | null; priority: number | null }[];

const lines: RepertoireLine[] = rows.map(r => ({
  id: r.id,
  createdAt: 0,
  color: r.color,
  eco: r.eco ?? undefined,
  lineName: r.line_name ?? undefined,
  priority: r.priority ?? undefined,
}));

const index = buildRepertoireEcoIndex(lines);
const { white, black } = repertoireEcosByColor(index);

const current = (await sql`
  SELECT white_ecos, black_ecos FROM repertoire WHERE id = 1
`) as { white_ecos: string[]; black_ecos: string[] }[];

console.log(`Lines read:      ${lines.length}`);
console.log(`Distinct ECOs:   ${index.size}`);
console.log(`  white (${white.length}): ${white.join(', ')}`);
console.log(`  black (${black.length}): ${black.join(', ')}`);
console.log(
  `Currently stored: ${
    current.length === 0
      ? 'no row at all'
      : `${current[0].white_ecos.length} white / ${current[0].black_ecos.length} black`
  }`
);

if (!apply) {
  console.log('\nDry run — nothing written. Re-run with --apply.');
  process.exit(0);
}

await sql`
  INSERT INTO repertoire (id, white_ecos, black_ecos)
  VALUES (1, ${white}, ${black})
  ON CONFLICT (id) DO UPDATE SET
    white_ecos = EXCLUDED.white_ecos,
    black_ecos = EXCLUDED.black_ecos
`;

console.log('\nApplied.');
