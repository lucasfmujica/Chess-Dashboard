// Falla si algún asset de build/ (JS, CSS, HTML, JSON, PGN, etc.) contiene el
// nombre de un tercero de la lista FORBIDDEN_NAMES (scripts/lib/thirdPartyNames.mjs).
// Nunca imprime el contenido que matcheó.
// Usage: npm run build (corre esto después de los otros asserts) o npm run assert:no-third-party-names
import { checkNames, readAllAssets } from './lib/thirdPartyNames.mjs';

const dist = new URL('../build', import.meta.url).pathname;

let assets;
try {
  assets = readAllAssets(dist);
} catch {
  console.error('build/ no encontrado: corré `npm run build` primero.');
  process.exit(2);
}

const findings = checkNames(assets);
if (findings.length > 0) {
  for (const msg of findings) console.error(msg);
  process.exit(1);
}
console.log(`OK: sin nombres de terceros en ${assets.length} archivos de build/.`);
