// Fixtures inventadas: simulan el texto minificado de un asset del build.
import { describe, it, expect } from 'vitest';
import { checkConversionAssets, topLevelKeys } from './lib/conversionPrivacy.mjs';

const item = (prefix, n, extra = '') =>
  `{id:\`${prefix}-${String(n).padStart(3, '0')}\`,fen:\`8/8/8/8/8/8/8/K6k w - - 0 1\`,color:\`white\`,acceptedUci:[\`a1a2\`],gameId:null,source:\`otb\`,date:\`2026-03\`${extra}}`;

const chunk = ({ conv = 90, drills = 34, extra = '' } = {}) =>
  `var e=[${Array.from({ length: conv }, (_, i) => item('conv', i + 1, i === 0 ? extra : '')).join(',')}],t=[${Array.from({ length: drills }, (_, i) => item('drill', i + 1)).join(',')}];export{e as a,t as b};`;

const check = text => checkConversionAssets([{ path: 'assets/conversion-data-x.js', text }, { path: 'assets/index-y.js', text: 'console.log("http://x")' }]);

describe('checkConversionAssets', () => {
  it('pasa con 90 + 34 ítems limpios (y no mira los assets sin datos)', () => {
    expect(check(chunk()).findings).toEqual([]);
  });

  it('falla si ningún asset lleva los datos', () => {
    expect(checkConversionAssets([{ path: 'a.js', text: 'x' }]).findings).toHaveLength(1);
  });

  it('falla con una clave fuera de la lista permitida', () => {
    expect(check(chunk({ extra: ',opponent:`x`' })).findings.join()).toMatch(/claves no permitidas/);
    expect(check(chunk({ extra: ',rating:1800' })).findings.join()).toMatch(/rating/);
  });

  it.each([
    ['http', ',notes:`ver http://x`'],
    ['@', ',notes:`a@b`'],
    ['lichess.org/', ',notes:`lichess.org/abc`'],
    ['chess.com/', ',notes:`chess.com/game`'],
    ['pgn', ',notes:`pgn`'],
    ['[Event', ',notes:`[Event "x"]`'],
    ['Elo', ',notes:`Elo 1800`'],
    ['Lucas', ',notes:`Lucas`'],
    ['fecha exacta', ',notes:`2026-03-14`'],
  ])('falla con %s', (_label, extra) => {
    expect(check(chunk({ extra })).findings.length).toBeGreaterThan(0);
  });

  it('falla con una cantidad distinta de 90 o 34', () => {
    expect(check(chunk({ conv: 89 })).findings.join()).toMatch(/90/);
    expect(check(chunk({ drills: 35 })).findings.join()).toMatch(/34/);
  });

  it('no repite el contenido que matcheó', () => {
    expect(check(chunk({ extra: ',notes:`secreto@x`' })).findings.join()).not.toContain('secreto');
  });
});

describe('topLevelKeys', () => {
  it('lee las claves de primer nivel, ignorando anidados y strings', () => {
    const text = '{id:`a`,notes:`x: y, z:1`,acceptedUci:[`e2e4`],deep:{no:1}}';
    expect(topLevelKeys(text, 0)).toEqual(['id', 'notes', 'acceptedUci', 'deep']);
  });
  it('también lee claves entre comillas', () => {
    expect(topLevelKeys('{"id":"a","fen":"b"}', 0)).toEqual(['id', 'fen']);
  });
});
