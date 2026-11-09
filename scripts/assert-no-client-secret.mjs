// Fails if the built client leaks the API secret: the removed VITE_API_SECRET
// name, the value of VITE_API_SECRET/API_SECRET when set in the env, or any
// long hex/base64url literal. Never prints file contents or the secret.
// Usage: npm run build && npm run assert:no-client-secret
import { scanDir } from './lib/secretScan.mjs';

const dist = new URL('../build', import.meta.url).pathname;

let result;
try {
  result = scanDir(dist);
} catch {
  console.error('build/ not found: run `npm run build` first.');
  process.exit(2);
}

if (result.findings.length > 0) {
  for (const msg of result.findings) console.error(msg);
  process.exit(1);
}
console.log(`OK: no client secret found in ${result.fileCount} files under build/.`);
