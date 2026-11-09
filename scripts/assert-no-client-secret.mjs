// Fails if the built client leaks the API secret: the removed VITE_API_SECRET
// name, the value of VITE_API_SECRET/API_SECRET when set in the env, or any
// long quoted hex/alphanumeric literal; also fails if src/ references the name
// or a VITE_*SECRET|KEY|TOKEN env var. Never prints file contents or the secret.
// Usage: npm run build (runs this after vite build) or npm run assert:no-client-secret
import { scanDir, scanSrc } from './lib/secretScan.mjs';

const dist = new URL('../build', import.meta.url).pathname;
const src = new URL('../src', import.meta.url).pathname;

let result;
let srcResult;
try {
  result = scanDir(dist);
  srcResult = scanSrc(src);
} catch {
  console.error('build/ or src/ not found: run `npm run build` first.');
  process.exit(2);
}

const findings = [...result.findings, ...srcResult.findings];
if (findings.length > 0) {
  for (const msg of findings) console.error(msg);
  process.exit(1);
}
console.log(`OK: no client secret found in ${result.fileCount} files under build/.`);
