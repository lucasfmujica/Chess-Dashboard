// Registers the Final Argentina Amateur Sub-2000 as an upcoming tournament, so
// the dashboard (and the opponent-prep flow) can see it before it is played.
//
// Idempotent: tournaments upsert on `name`, and re-running only refreshes the
// fields below. Results, performance and elo columns are never touched.
//
// No StartListScout row: FADA had not published the start list when this was
// written. Once it does, add the scouting targets from the Opponent Prep tab.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/seed-final-sub2000.mts
//   npx tsx --env-file=.env.local scripts/seed-final-sub2000.mts --apply
//
// Without --apply it only reports what it would write, and does not connect.
import { neon } from '@neondatabase/serverless';

const TOURNAMENT = {
  name: 'Final Argentina Amateur Sub-2000 2026',
  startDate: '2026-12-05',
  endDate: '2026-12-08',
  kind: 'individual',
  timeControl: '60+30',
  affectsElo: true,
  notes: 'La Plata · 7 rondas · FADA',
} as const;

const apply = process.argv.includes('--apply');

console.log(apply ? 'APPLY: writing to the database' : 'DRY RUN: nothing will be written');
console.log(TOURNAMENT);

if (!apply) {
  console.log('\nRe-run with --apply to upsert this tournament.');
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Run with --env-file=.env.local');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

const t = TOURNAMENT;
await sql`
  INSERT INTO tournaments (name, start_date, end_date, kind, time_control, affects_elo, notes)
  VALUES (
    ${t.name}, ${t.startDate}::date, ${t.endDate}::date, ${t.kind},
    ${t.timeControl}, ${t.affectsElo}, ${t.notes}
  )
  ON CONFLICT (name) DO UPDATE SET
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    kind = EXCLUDED.kind,
    time_control = EXCLUDED.time_control,
    affects_elo = EXCLUDED.affects_elo,
    notes = EXCLUDED.notes
`;

console.log(`Upserted "${t.name}".`);
