// Scanner logic for assert-no-client-secret.mjs. Pure helpers: they report
// which file and which rule matched, never the matched content.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export const NAME = 'VITE_API_SECRET';
export const MIN_ENV_SECRET_LENGTH = 8;
const TEXT_EXT = /\.(js|mjs|cjs|css|html|json)$/i;
// Only quoted literals count: minified bundles are full of bare 40+ char runs
// (module ids after `.`, identifiers) that are not secrets.
const HEX_LITERAL = /(['"])[0-9a-fA-F]{32,}\1/;
const BASE64URL_LITERAL = /(['"])[A-Za-z0-9_-]{40,}\1/;

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
  if (TEXT_EXT.test(path) && (HEX_LITERAL.test(text) || BASE64URL_LITERAL.test(text))) {
    return 'high-entropy';
  }
  return null;
};

const MESSAGES = {
  'env-secret': p => `match found in ${p}`,
  'high-entropy': p => `high-entropy literal found in ${p}`,
  name: p => `${NAME} found in ${p}`,
};

/** Scans every file under `dist`; returns one message per offending file. */
export const scanDir = (dist, secrets = secretsFromEnv()) => {
  const files = walk(dist);
  const findings = [];
  for (const f of files) {
    const rule = scanContent(readFileSync(f), f, secrets);
    if (rule) findings.push(MESSAGES[rule](relative(dist, f)));
  }
  return { fileCount: files.length, findings };
};
