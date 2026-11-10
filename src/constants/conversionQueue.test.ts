import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import conversionFile from './conversionQueue.json';
import guideFile from './guideDrills.json';
import { CONVERSION_IDS } from './conversionIds';
import { ALL_CONVERSION_ITEMS, CONVERSION_ITEMS, GUIDE_ITEMS, type ConversionItemData } from './conversionQueue';

const ALLOWED_KEYS = [
  'id', 'fen', 'color', 'acceptedUci', 'plan', 'evalBefore', 'evalAfter', 'ply', 'notes', 'gameId', 'source', 'date',
];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Nombre y usuarios del dueño de los datos: no pueden aparecer en ningún string. */
const OWNER_NAMES = ['lucas', 'mujica', 'lucasfmujica'];

const files = [
  { name: 'conversionQueue.json', file: conversionFile, items: conversionFile.items as ConversionItemData[], count: 90, pattern: /^conv-\d{3}$/, prefix: 'conv', kind: 'conversion' },
  { name: 'guideDrills.json', file: guideFile, items: guideFile.items as ConversionItemData[], count: 34, pattern: /^drill-\d{3}$/, prefix: 'drill', kind: 'guide' },
] as const;

const uci = (m: { from: string; to: string; promotion?: string }) => `${m.from}${m.to}${m.promotion ?? ''}`;
const strings = (item: ConversionItemData): string[] =>
  Object.values(item).flatMap(v => (Array.isArray(v) ? v : [v])).filter((v): v is string => typeof v === 'string');

describe.each(files)('$name', ({ file, items, count, pattern, prefix }) => {
  it(`tiene ${count} ítems y count === ${count}`, () => {
    expect(items).toHaveLength(count);
    expect(file.count).toBe(count);
  });

  it('los ids matchean el patrón y son exactamente la serie esperada', () => {
    expect(items.every(i => pattern.test(i.id))).toBe(true);
    const want = Array.from({ length: count }, (_, i) => `${prefix}-${String(i + 1).padStart(3, '0')}`);
    expect([...items.map(i => i.id)].sort()).toEqual(want);
  });
});

describe('lista unida', () => {
  it('tiene 124 ítems con kind según el archivo', () => {
    expect(ALL_CONVERSION_ITEMS).toHaveLength(124);
    expect(CONVERSION_ITEMS.every(i => i.kind === 'conversion' && i.id.startsWith('conv-'))).toBe(true);
    expect(GUIDE_ITEMS.every(i => i.kind === 'guide' && i.id.startsWith('drill-'))).toBe(true);
  });

  it('no repite ids entre los dos archivos', () => {
    expect(new Set(ALL_CONVERSION_ITEMS.map(i => i.id)).size).toBe(124);
  });
});

describe('posiciones', () => {
  it.each(ALL_CONVERSION_ITEMS.map(i => [i.id, i] as const))('%s: FEN, color y jugadas', (_id, item) => {
    const chess = new Chess(item.fen); // lanza si el FEN es ilegal
    expect(item.fen.split(' ')).toHaveLength(6);
    expect(item.color).toBe(chess.turn() === 'w' ? 'white' : 'black');
    expect(chess.isGameOver()).toBe(false);
    const legal = chess.moves({ verbose: true }).map(uci);
    expect(legal.length).toBeGreaterThan(0);
    expect(item.acceptedUci.length).toBeLessThanOrEqual(5);
    for (const move of item.acceptedUci) expect(legal).toContain(move);
    expect(item.acceptedUci.length >= 1 || !!item.plan?.trim()).toBe(true);
  });
});

describe.each([
  { kind: 'conversion', items: CONVERSION_ITEMS, sources: ['lichess', 'chesscom', 'otb'] },
  { kind: 'guide', items: GUIDE_ITEMS, sources: ['lichess', 'chesscom', 'otb', 'libro', 'guia'] },
])('fuente, partida y fecha ($kind)', ({ kind, items, sources }) => {
  it.each(items.map(i => [i.id, i] as const))('%s', (_id, item) => {
    expect(sources).toContain(item.source);
    if (item.gameId !== null) expect(item.gameId).toMatch(UUID);
    const bookLike = item.source === 'libro' || item.source === 'guia';
    if (bookLike) expect(item.gameId).toBeNull();
    if (item.date) expect(item.date).toMatch(/^\d{4}-\d{2}$/);
    else expect(bookLike).toBe(true);
    if (item.evalBefore !== undefined) expect(item.evalBefore).toBeGreaterThan(0);
    else expect(kind).toBe('guide');
  });
});

describe('privacidad', () => {
  it('las claves de cada ítem son un subconjunto de la lista permitida', () => {
    for (const item of ALL_CONVERSION_ITEMS) {
      const { kind: _kind, ...raw } = item;
      expect(Object.keys(raw).filter(k => !ALLOWED_KEYS.includes(k))).toEqual([]);
    }
  });

  it('ningún string tiene @, links, fechas exactas ni el nombre del dueño', () => {
    for (const item of ALL_CONVERSION_ITEMS) {
      for (const s of strings(item)) {
        expect(s, item.id).not.toMatch(/@|http|lichess\.org\/|chess\.com\/|\d{4}-\d{2}-\d{2}/i);
        for (const name of OWNER_NAMES) expect(s.toLowerCase(), item.id).not.toContain(name);
      }
    }
  });

  it('los archivos tampoco traen la fecha exacta en version', () => {
    expect(conversionFile.version).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(guideFile.version).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});

describe('CONVERSION_IDS (lista chica de la tarjeta de Hoy)', () => {
  it('coincide con los ids y el kind de los dos JSON', () => {
    expect(CONVERSION_IDS).toEqual(ALL_CONVERSION_ITEMS.map(i => ({ id: i.id, kind: i.kind })));
  });
});
