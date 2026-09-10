// Copies the Stockfish WASM engine into public/engine/ so Vite serves it.
// Runs on postinstall and before dev/build. The .wasm files are ~7MB each, so
// they are generated from node_modules rather than committed.
//
// Both the multi-threaded and single-threaded "lite" builds are copied:
// multi-threading needs SharedArrayBuffer, which needs the page to be
// cross-origin isolated (COOP/COEP headers — see vite.config.ts and
// vercel.json), which isn't guaranteed in every environment (proxies,
// iframes, older browsers). stockfishEngine.ts feature-detects and falls
// back to the single-threaded build when isolation isn't available.
import { mkdirSync, copyFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dest = resolve(root, 'public/engine');
mkdirSync(dest, { recursive: true });

// Stockfish 18 (nmrugg): el respaldo de un solo hilo, para cuando la página no
// está aislada entre orígenes y por lo tanto no hay SharedArrayBuffer.
const legacySrc = resolve(root, 'node_modules/stockfish/bin');
const legacy = ['stockfish-18-lite-single.js', 'stockfish-18-lite-single.wasm'];

// Stockfish 19 (Lichess): el motor principal. Su .wasm es chico porque la red
// va aparte — ver abajo.
const sf19Src = resolve(root, 'node_modules/@lichess-org/stockfish-web');
const sf19 = ['sf_19.js', 'sf_19.wasm'];

/**
 * La red neuronal de Stockfish 19, ~94 MB, que el .wasm no incluye.
 *
 * No se versiona (public/engine está en .gitignore) ni viaja en node_modules,
 * así que se baja acá y queda cacheada entre builds. Es el precio de correr
 * Stockfish 19 en el navegador: el build de Lichess separó la red del binario.
 */
const NNUE = 'nn-1a298aa575a0.nnue';
const NNUE_URL = `https://tests.stockfishchess.org/api/nn/${NNUE}`;
const NNUE_MIN_BYTES = 50 * 1024 * 1024;

const copyAll = (from, names) => {
  if (!existsSync(resolve(from, names[0]))) {
    console.warn(`[copy-engine] ${from} not found; skipping those files.`);
    return 0;
  }
  for (const f of names) copyFileSync(resolve(from, f), resolve(dest, f));
  return names.length;
};

let copied = copyAll(legacySrc, legacy) + copyAll(sf19Src, sf19);

const nnuePath = resolve(dest, NNUE);
// Se rechaza un archivo corto: una descarga cortada deja un .nnue que el motor
// no puede cargar, y el síntoma aparece recién en el navegador.
const haveNnue = existsSync(nnuePath) && statSync(nnuePath).size > NNUE_MIN_BYTES;
if (haveNnue) {
  console.log(`[copy-engine] ${NNUE} already present, skipping download.`);
} else {
  console.log(`[copy-engine] downloading ${NNUE} (~94MB)...`);
  try {
    const res = await fetch(NNUE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    writeFileSync(nnuePath, Buffer.from(await res.arrayBuffer()));
    console.log(`[copy-engine] downloaded ${NNUE}`);
  } catch (err) {
    // No se aborta el build: sin la red, la app cae al Stockfish 18 de respaldo,
    // que es peor pero funciona. Un build roto sería peor que un motor viejo.
    console.warn(`[copy-engine] could not download ${NNUE}: ${err.message}`);
    console.warn('[copy-engine] the app will fall back to the bundled Stockfish 18.');
  }
}

console.log(`[copy-engine] copied ${copied} engine files to public/engine/`);
