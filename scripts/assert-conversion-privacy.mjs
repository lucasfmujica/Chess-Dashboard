// Falla si los assets de build/ que llevan las posiciones de la cola de
// conversión (los que contienen `conv-001` o `drill-001`) tienen claves fuera de
// la lista permitida, datos personales o links, o si no hay exactamente 90 ids
// `conv-` y 34 `drill-`. Nunca imprime el contenido que matcheó.
// Usage: npm run build (corre esto después de vite build) o npm run assert:conversion-privacy
import { checkConversionAssets, readBuildAssets } from './lib/conversionPrivacy.mjs';

const dist = new URL('../build', import.meta.url).pathname;

let assets;
try {
  assets = readBuildAssets(dist);
} catch {
  console.error('build/ no encontrado: corré `npm run build` primero.');
  process.exit(2);
}

const { findings, files } = checkConversionAssets(assets);
if (findings.length > 0) {
  for (const msg of findings) console.error(msg);
  process.exit(1);
}
console.log(`OK: privacidad de la cola de conversión verificada en ${files.join(', ')}.`);
