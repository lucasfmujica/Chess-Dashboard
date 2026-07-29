// Loads the team tournaments — the ones played at 12+3 with no notation, so
// the crosstable is the only record that exists and nothing here has a PGN.
//
// Every event is `affects_elo: false`: team rapid does not move the FIDE
// curve. The games still count for performance, opponent brackets, colour
// splits, streaks and records, which is exactly what `games.affects_elo`
// exists to express.
//
// Idempotent: tournaments upsert on `name`, and each event's games are deleted
// and re-inserted (they carry no lichess_game_id, so there is no unique key to
// conflict on and a second run would otherwise duplicate them).
//
// Run:  node --env-file=.env.local scripts/seed-team-tournaments.mjs
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Run with --env-file=.env.local');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

/**
 * chess-results prints the colour in German: `w` = weiß (white), `s` =
 * schwarz (black). Written out here because reading `s` as "self/white" is
 * the obvious wrong guess and it would silently invert every colour split.
 */
const W = 'W';
const B = 'B';

/**
 * The Copa Cultura AFA editions are afternoon events: round 1 starts around
 * 13:30 and the last round finishes near 19:00.
 *
 * Only that window is recorded, so the per-round times below are *derived*
 * from it — round 1 at 13:30 and ~50 minutes a round, which puts round 7 at
 * 18:30. They exist so the time-of-day analysis has something to bucket
 * these games by; they are not clock times anybody wrote down.
 */
const FIRST_ROUND_MINUTES = 13 * 60 + 30;
const MINUTES_PER_ROUND = 50;

const roundTime = round => {
  const minutes = FIRST_ROUND_MINUTES + (round - 1) * MINUTES_PER_ROUND;
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
};

const TOURNAMENTS = [
  {
    name: 'Copa Cultura AFA XVII',
    startDate: '2025-06-07',
    category: 'superior',
    timeControl: '12+3',
    city: 'Avellaneda',
    afternoonSchedule: true,
    eloBefore: 1776,
    officialPerformance: 2039,
    notes: 'Torneo por equipos, ritmo 12+3. No afecta el ELO clásico.',
    rounds: [
      { round: 1, opponent: 'Del Cuadro, Nestor', opponentElo: 2079, color: B, result: 'W' },
      { round: 2, opponent: 'Poggi, Nicolas', opponentElo: 0, color: W, result: 'W' },
      { round: 3, opponent: 'Curcio, Luciano Joel', opponentElo: 1838, color: B, result: 'W' },
      { round: 4, opponent: 'Pappa, Domingo', opponentElo: 2120, color: W, result: 'L' },
      { round: 5, opponent: 'Axarlian, Carlos', opponentElo: 2051, color: B, result: 'L' },
      { round: 6, opponent: 'Parrilla, Juan Jose', opponentElo: 1942, color: W, result: 'W' },
      { round: 7, opponent: 'Rodriguez Sanzi, Juan Pablo', opponentElo: 1735, color: B, result: 'W' },
    ],
  },
  {
    name: 'Copa Cultura AFA XIX',
    startDate: '2025-10-25',
    category: 'superior',
    timeControl: '12+3',
    city: 'Rosario',
    afternoonSchedule: true,
    eloBefore: 1889,
    // Deliberately no officialPerformance. The sheet prints Rp 1855, but it
    // computed that from a round 1 that never happened: it lists a loss to Dib
    // Nadir (1834) where the game was actually a win against Fournel Bautista
    // (1977). Storing a performance derived from a pairing we know is wrong
    // would be worse than letting the app compute one from the real results.
    notes:
      'Torneo por equipos, ritmo 12+3. No afecta el ELO clásico. La planilla ' +
      'de chess-results tiene mal la ronda 1 (figura derrota vs Dib Nadir 1834; ' +
      'fue victoria vs Fournel Bautista 1977), así que su Rp 1855 no aplica.',
    rounds: [
      { round: 1, opponent: 'Fournel, Bautista', opponentElo: 1977, color: W, result: 'W' },
      { round: 2, opponent: 'Paletta, Horacio Daniel', opponentElo: 0, color: B, result: 'W' },
      // No round 3 on the sheet — the board sat out that round.
      { round: 4, opponent: 'Di Conza, Eduardo', opponentElo: 2060, color: B, result: 'W' },
      { round: 5, opponent: 'Lopez, Mariano', opponentElo: 0, color: B, result: 'W' },
      { round: 6, opponent: 'Volpe, Leonel', opponentElo: 1850, color: W, result: 'W' },
      { round: 7, opponent: 'Pereyra, Pablo', opponentElo: 1835, color: B, result: 'L' },
    ],
  },
  {
    name: '67º Torneo por Equipos Playas de Necochea 2026',
    startDate: '2026-03-13',
    endDate: '2026-03-15',
    timeControl: '12+3',
    city: 'Necochea',
    eloBefore: 1878,
    officialPerformance: 2030,
    notes: 'Torneo por equipos en Necochea, 13 al 15 de marzo. No afecta el ELO clásico.',
    rounds: [
      { round: 1, opponent: 'Sastre, Esteban', opponentElo: 1672, color: B, result: 'W' },
      { round: 2, opponent: 'Magarinos, Francisco', opponentElo: 1846, color: W, result: 'W' },
      { round: 3, opponent: 'Foss Osma, Facundo', opponentElo: 1869, color: W, result: 'W' },
      { round: 4, opponent: 'Iborra, Diego', opponentElo: 1987, color: B, result: 'L' },
      // No round 5 on the sheet.
      { round: 6, opponent: 'Caverlotti, Gino', opponentElo: 1576, color: W, result: 'W' },
    ],
  },
];

/**
 * Already loaded before this script existed, so its games are patched in place
 * rather than re-inserted — deleting rows that other tables may point at to
 * add a date and a clock time would be a poor trade. `rounds` here maps an
 * opponent to the round they were played in, which is the only way to give
 * these games a time: `games` has no round column.
 */
const DATE_ONLY = [
  {
    name: 'Copa Cultura AFA XX',
    startDate: '2026-07-26',
    city: 'Buenos Aires',
    afternoonSchedule: true,
    rounds: [
      { round: 1, opponent: 'Romanelli, Gabriel' },
      { round: 2, opponent: 'Paredes, Ezequiel' },
      { round: 3, opponent: 'Duarte, Pablo' },
      { round: 4, opponent: 'Medina, Ivan Ezequiel' },
      { round: 5, opponent: 'Rueda, Joaquin' },
      { round: 7, opponent: 'Plotkin, Guillermo' },
    ],
  },
];

const score = rounds =>
  rounds.reduce((sum, r) => sum + (r.result === 'W' ? 1 : r.result === 'D' ? 0.5 : 0), 0);

const upsertTournament = async t =>
  sql`
    INSERT INTO tournaments (
      name, start_date, end_date, kind, category, time_control, affects_elo,
      official_performance, official_points, elo_before, notes
    ) VALUES (
      ${t.name}, ${t.startDate}::date, ${t.endDate ?? null}::date,
      'equipos', ${t.category ?? null}, ${t.timeControl ?? null}, false,
      ${t.officialPerformance ?? null}, ${score(t.rounds)}, ${t.eloBefore}, ${t.notes}
    )
    ON CONFLICT (name) DO UPDATE SET
      start_date = EXCLUDED.start_date,
      end_date = COALESCE(EXCLUDED.end_date, tournaments.end_date),
      kind = EXCLUDED.kind,
      category = COALESCE(EXCLUDED.category, tournaments.category),
      time_control = COALESCE(EXCLUDED.time_control, tournaments.time_control),
      affects_elo = EXCLUDED.affects_elo,
      official_performance = EXCLUDED.official_performance,
      official_points = EXCLUDED.official_points,
      elo_before = EXCLUDED.elo_before,
      notes = EXCLUDED.notes
  `;

for (const t of TOURNAMENTS) {
  await upsertTournament(t);

  // Rows with no PGN and no lichess id have no natural key; clear before
  // re-inserting so a second run corrects rather than duplicates.
  await sql`DELETE FROM games WHERE tournament = ${t.name}`;

  for (const r of t.rounds) {
    await sql`
      INSERT INTO games (
        source, color, result, elo, opponent, opponent_elo, eco, tournament,
        rated, played_date, played_time, time_control, elo_change, affects_elo,
        city, country
      ) VALUES (
        'otb', ${r.color}, ${r.result}, ${t.eloBefore}, ${r.opponent},
        -- Zero, never null: calculateExpectedScore only special-cases 0, and
        -- null would make every average this opponent appears in NaN.
        ${r.opponentElo}, 'Unknown', ${t.name}, true, ${t.startDate}::date,
        ${t.afternoonSchedule && r.round ? roundTime(r.round) : null},
        ${t.timeControl ?? null}, 0, false, ${t.city}, 'Argentina'
      )
    `;
  }

  console.log(`${t.name}: ${t.rounds.length} partidas, ${score(t.rounds)} puntos.`);
}

for (const t of DATE_ONLY) {
  await sql`UPDATE tournaments SET start_date = ${t.startDate}::date WHERE name = ${t.name}`;
  const rows = await sql`
    UPDATE games SET played_date = ${t.startDate}::date,
                     city = ${t.city},
                     country = 'Argentina'
    WHERE tournament = ${t.name}
    RETURNING id
  `;

  if (t.afternoonSchedule) {
    for (const r of t.rounds) {
      await sql`
        UPDATE games SET played_time = ${roundTime(r.round)}
        WHERE tournament = ${t.name} AND opponent = ${r.opponent}
      `;
    }
  }

  console.log(`${t.name}: fecha ${t.startDate} en ${rows.length} partidas.`);
}

console.log('Listo.');
