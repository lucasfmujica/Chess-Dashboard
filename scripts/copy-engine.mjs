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
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'node_modules/stockfish/bin');
const dest = resolve(root, 'public/engine');

const files = [
  'stockfish-18-lite.js',
  'stockfish-18-lite.wasm',
  'stockfish-18-lite-single.js',
  'stockfish-18-lite-single.wasm',
];

if (!existsSync(resolve(src, files[0]))) {
  console.warn('[copy-engine] stockfish package not found; skipping.');
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
for (const f of files) {
  copyFileSync(resolve(src, f), resolve(dest, f));
}
console.log(`[copy-engine] copied ${files.length} engine files to public/engine/`);
