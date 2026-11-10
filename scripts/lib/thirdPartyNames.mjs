// Lógica de scripts/assert-no-third-party-names.mjs: busca nombres de terceros
// en los assets de build/. Reporta archivo y nombre, nunca el contexto.
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { walk } from './secretScan.mjs';

/** Nombres que no pueden aparecer en nada servido al navegador. Agregar acá. */
export const FORBIDDEN_NAMES = ['Toto'];

// No usa \b: '_' cuenta como letra ahí y 'clase_toto' se escaparía.
const toRegex = name =>
  new RegExp(`(?<![A-Za-z])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z])`, 'i');

/** assets: [{ path, text }]. Devuelve un mensaje por (archivo, nombre). */
export const checkNames = (assets, names = FORBIDDEN_NAMES) => {
  const findings = [];
  for (const { path, text } of assets) {
    for (const name of names) {
      if (toRegex(name).test(text)) findings.push(`${path}: aparece el nombre de un tercero (${name}).`);
    }
  }
  return findings;
};

// Los binarios (wasm, nnue, imágenes) pueden contener esos bytes por azar: solo texto.
const TEXT_EXT = /\.(js|mjs|cjs|css|html|json|pgn|txt|svg|map|webmanifest|xml)$/i;

export const readAllAssets = dist =>
  walk(dist)
    .filter(file => TEXT_EXT.test(file))
    .map(file => ({ path: relative(dist, file), text: readFileSync(file, 'utf8') }));
