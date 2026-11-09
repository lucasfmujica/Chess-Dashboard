// Fails if the built client still references the removed VITE_API_SECRET.
// Usage: npm run build && node scripts/assert-no-client-secret.mjs
// It only looks for the variable's NAME and never prints file contents.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const NAME = 'VITE_API_SECRET';
const dist = new URL('../build', import.meta.url).pathname;

const walk = dir =>
  readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

let files;
try {
  files = walk(dist);
} catch {
  console.error('build/ not found: run `npm run build` first.');
  process.exit(2);
}

const hits = files.filter(f => readFileSync(f).includes(NAME));
if (hits.length > 0) {
  console.error(`${NAME} found in the build output:`);
  for (const f of hits) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`OK: ${NAME} not present in ${files.length} files under build/.`);
