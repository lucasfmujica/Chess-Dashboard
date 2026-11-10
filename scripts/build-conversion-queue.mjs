// Genera src/constants/conversionQueue.json (90 conversiones),
// src/constants/guideDrills.json (35 guías) y src/constants/classDrills.json
// (29 drills de clase) a partir de los tres exports públicos de Segundo. Corre
// fuera del bundle: filtra campos, valida y falla si algo no cumple. Nunca lee
// los *.private.json.
//
// Ojo: el export de guías se llama `drills-guias-34.json` pero ahora trae 35
// ítems (drill-001..035). El nombre es del export de Segundo y no cambia.
//
// Uso:
//   node scripts/build-conversion-queue.mjs [--games-snapshot <ruta>]
//        [--conversion <json>] [--guides <json>] [--classes <json>] [--out-dir <dir>]
//
// `--games-snapshot` es un array JSON de games de prod ({id, source, played_date,
// pgn}) sacado con un SELECT de solo lectura y guardado FUERA del repo. Con él,
// las conversiones con gameId null se completan cuando la posición matchea una
// sola partida. Sin snapshot, los gameId quedan como vienen.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildFile,
  assertNoCrossDuplicates,
  enrichGameIds,
  markNeedsReview,
} from './lib/conversionQueue.mjs';

const EXPORT_DIR = '/workspace/brain/segundo/export';

// origen: Chief 10/11 16:10, acepta varias jugadas
const NEEDS_REVIEW_IDS = ['drill-038', 'drill-057'];

const parseArgs = argv => {
  const opts = {
    conversion: `${EXPORT_DIR}/fugas-conversion-107.json`,
    guides: `${EXPORT_DIR}/drills-guias-34.json`,
    classes: `${EXPORT_DIR}/drills-clase-toto-29.json`,
    outDir: new URL('../src/constants', import.meta.url).pathname,
    gamesSnapshot: null,
  };
  const flags = {
    '--conversion': 'conversion',
    '--guides': 'guides',
    '--classes': 'classes',
    '--out-dir': 'outDir',
    '--games-snapshot': 'gamesSnapshot',
  };
  for (let i = 0; i < argv.length; i += 2) {
    const key = flags[argv[i]];
    if (!key || argv[i + 1] === undefined) throw new Error(`Argumento inválido: ${argv[i]}`);
    opts[key] = resolve(argv[i + 1]);
  }
  return opts;
};

const readJson = path => {
  if (/\.private\.json$/i.test(path)) throw new Error('Los *.private.json no se leen nunca.');
  return JSON.parse(readFileSync(path, 'utf8'));
};

const writeJson = (path, data) => writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);

const main = () => {
  const opts = parseArgs(process.argv.slice(2));

  const conversion = buildFile(readJson(opts.conversion), 'conversion');
  const guides = buildFile(readJson(opts.guides), 'guide');
  const classRaw = readJson(opts.classes);
  const classes = buildFile({ ...classRaw, items: markNeedsReview(classRaw.items, NEEDS_REVIEW_IDS) }, 'class');
  assertNoCrossDuplicates(conversion.items, guides.items, classes.items);

  if (opts.gamesSnapshot) {
    const games = readJson(opts.gamesSnapshot);
    if (!Array.isArray(games)) throw new Error('El snapshot debe ser un array de games.');
    const { items, report } = enrichGameIds(conversion.items, games);
    // Revalida: el gameId completado tiene que seguir siendo un uuid válido.
    conversion.items = buildFile({ ...conversion, items }, 'conversion').items;

    console.log(`Snapshot: ${report.games} partidas (${report.unparsable} con PGN que no carga).`);
    console.log(`gameId null de entrada: ${report.nullBefore} de ${conversion.items.length}.`);
    console.log(`  completados: ${report.filled.length}`);
    console.log(`  ambiguos (quedan null): ${report.ambiguous.length} ${report.ambiguous.join(' ')}`);
    console.log(`  sin match (quedan null): ${report.unmatched.length}`);
    const known =
      report.knownConfirmed.length +
      report.knownMismatch.length +
      report.knownUnverifiable.length +
      report.knownNotInSnapshot.length;
    console.log(`gameId conocidos: ${known}`);
    console.log(`  confirmados: ${report.knownConfirmed.length}`);
    console.log(`  no matchean su FEN: ${report.knownMismatch.length} ${report.knownMismatch.join(' ')}`);
    console.log(`  partida con PGN que no carga (sin verificar): ${report.knownUnverifiable.length} ${report.knownUnverifiable.join(' ')}`);
    console.log(`  fuera del snapshot: ${report.knownNotInSnapshot.length} ${report.knownNotInSnapshot.join(' ')}`);
  } else {
    console.log('Sin --games-snapshot: los gameId quedan como vienen.');
  }

  writeJson(`${opts.outDir}/conversionQueue.json`, conversion);
  writeJson(`${opts.outDir}/guideDrills.json`, guides);
  writeJson(`${opts.outDir}/classDrills.json`, classes);
  console.log(
    `OK: ${conversion.count} conversiones, ${guides.count} guías y ${classes.count} clases en ${opts.outDir}.`
  );
};

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
