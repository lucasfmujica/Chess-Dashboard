// Lógica de scripts/assert-conversion-privacy.mjs: revisa el texto de los assets
// del build que llevan las posiciones de la cola de conversión y de las guías.
// Reporta archivo y regla, nunca el contenido que matcheó.
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { ALLOWED_KEYS } from './conversionQueue.mjs';
import { walk } from './secretScan.mjs';

export const EXPECTED_CONVERSION = 90;
export const EXPECTED_GUIDES = 34;

/** Los assets que llevan datos de la cola son los que contienen estos ids. */
export const MARKERS = ['conv-001', 'drill-001'];

const FORBIDDEN = [
  [/opponent/, 'opponent'],
  [/Elo/, 'Elo'],
  [/tournament/, 'tournament'],
  [/pgn/, 'pgn'],
  [/\[Event/, '[Event'],
  [/\[White "/, '[White "'],
  [/\[Black "/, '[Black "'],
  [/http/i, 'http'],
  [/lichess\.org\//i, 'lichess.org/'],
  [/chess\.com\//i, 'chess.com/'],
  [/@/, '@'],
  [/Lucas/i, 'Lucas'],
  [/Mujica/i, 'Mujica'],
  [/lucasfmujica/i, 'lucasfmujica'],
  [/\d{4}-\d{2}-\d{2}/, 'fecha exacta'],
];

const ITEM_START = /\{\s*["'`]?id["'`]?\s*:\s*["'`]((?:conv|drill)-\d{3})["'`]/g;

/**
 * Claves de primer nivel del objeto que empieza en `start` (un `{`), respetando
 * strings, o null si el objeto no cierra.
 */
export const topLevelKeys = (text, start) => {
  const keys = [];
  let depth = 0;
  let quote = null;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      if (depth === 1) {
        // ¿Clave entre comillas? ("id":)
        const end = text.indexOf(c, i + 1);
        if (end > 0 && /^\s*:/.test(text.slice(end + 1, end + 8))) {
          keys.push(text.slice(i + 1, end));
          i = end;
          continue;
        }
      }
      quote = c;
    } else if (c === '{' || c === '[') {
      depth++;
    } else if (c === '}' || c === ']') {
      depth--;
      if (depth === 0) return keys;
    } else if (depth === 1 && /[A-Za-z_$]/.test(c) && !/[\w$]/.test(text[i - 1] ?? '')) {
      const m = /^([A-Za-z_$][\w$]*)\s*:/.exec(text.slice(i, i + 40));
      if (m) {
        keys.push(m[1]);
        i += m[1].length - 1;
      }
    }
  }
  return null;
};

/**
 * Revisa los assets (`{path, text}`) y devuelve `{findings, files}`.
 * Es un chequeo cerrado: si hay ids pero no se pueden leer los ítems, falla.
 */
export const checkConversionAssets = assets => {
  const findings = [];
  const hits = assets.filter(a => MARKERS.some(m => a.text.includes(m)));
  if (hits.length === 0) {
    return { findings: ['ningún asset del build contiene los datos de la cola (conv-001 / drill-001)'], files: [] };
  }
  const ids = [];
  for (const { path, text } of hits) {
    for (const [re, label] of FORBIDDEN) {
      if (re.test(text)) findings.push(`${path}: contiene ${label}`);
    }
    for (const m of text.matchAll(ITEM_START)) {
      ids.push(m[1]);
      const keys = topLevelKeys(text, m.index);
      if (!keys) {
        findings.push(`${path}: no se pudo leer el ítem ${m[1]}`);
        continue;
      }
      const extra = keys.filter(k => !ALLOWED_KEYS.includes(k));
      if (extra.length) findings.push(`${path}: ${m[1]} tiene claves no permitidas (${extra.join(', ')})`);
    }
  }
  const conv = ids.filter(id => id.startsWith('conv-'));
  const drills = ids.filter(id => id.startsWith('drill-'));
  if (new Set(conv).size !== conv.length || conv.length !== EXPECTED_CONVERSION) {
    findings.push(`se esperaban ${EXPECTED_CONVERSION} ids conv- únicos y hay ${conv.length} (${new Set(conv).size} únicos)`);
  }
  if (new Set(drills).size !== drills.length || drills.length !== EXPECTED_GUIDES) {
    findings.push(`se esperaban ${EXPECTED_GUIDES} ids drill- únicos y hay ${drills.length} (${new Set(drills).size} únicos)`);
  }
  return { findings, files: hits.map(h => h.path) };
};

/** Lee los assets de texto de un directorio de build. */
export const readBuildAssets = dir =>
  walk(dir)
    .filter(f => /\.(js|mjs|cjs|css|html|json|map)$/i.test(f))
    .map(f => ({ path: relative(dir, f), text: readFileSync(f, 'utf8') }));
