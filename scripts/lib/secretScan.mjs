// Scanner logic for assert-no-client-secret.mjs. Pure helpers: they report
// which file matched, never the matched content nor the rule.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export const NAME = 'VITE_API_SECRET';
export const MIN_ENV_SECRET_LENGTH = 8;
const TEXT_EXT = /\.(js|mjs|cjs|css|html|json)$/i;
const SRC_EXT = /\.(ts|tsx|js|jsx|mjs)$/i;
// Only quoted literals count (' " or backtick): minified bundles are full of
// bare 32+ char runs (module ids after `.`, identifiers) that are not secrets.
const HEX_LITERAL = /(['"`])[0-9a-fA-F]{32,}\1/;
// Non-hex secrets Vite inlines: contiguous alphanumerics with at least one
// letter and one digit. Base64/base64url rules were dropped: false positives.
const ALNUM_LITERAL = /(['"`])(?=[A-Za-z0-9]*[A-Za-z])(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{32,}\1/;
// Source side: a Vite env var that looks like a credential.
const SRC_ENV_VAR = /import\.meta\.env\.VITE_\w*(SECRET|KEY|TOKEN)\b/;

export const walk = dir =>
  readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

/** Values of VITE_API_SECRET / API_SECRET usable as a literal search needle. */
export const secretsFromEnv = (env = process.env) =>
  [env.VITE_API_SECRET, env.API_SECRET].filter(
    v => typeof v === 'string' && v.length >= MIN_ENV_SECRET_LENGTH
  );

/**
 * Returns the rule that matched ('env-secret' | 'name' | 'high-entropy') or
 * null. `path` only decides whether the entropy rules apply.
 */
export const scanContent = (content, path, secrets = []) => {
  const text = Buffer.isBuffer(content) ? content.toString('utf8') : content;
  if (secrets.some(s => text.includes(s))) return 'env-secret';
  if (text.includes(NAME)) return 'name';
  if (TEXT_EXT.test(path) && (HEX_LITERAL.test(text) || ALNUM_LITERAL.test(text))) {
    return 'high-entropy';
  }
  return null;
};

// Neither the value nor the rule: only where it was found.
const message = path => `match found in ${path}`;

/** Scans every file under `dist`; returns one message per offending file. */
export const scanDir = (dist, secrets = secretsFromEnv()) => {
  const files = walk(dist);
  const findings = [];
  for (const f of files) {
    if (scanContent(readFileSync(f), f, secrets)) findings.push(message(relative(dist, f)));
  }
  return { fileCount: files.length, findings };
};

/** Scans source under `src` for the secret name or a VITE_*SECRET|KEY|TOKEN env var. */
export const scanSrc = src => {
  const files = walk(src).filter(f => SRC_EXT.test(f));
  const findings = [];
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    if (text.includes(NAME) || SRC_ENV_VAR.test(text)) findings.push(message(relative(src, f)));
  }
  return { fileCount: files.length, findings };
};
