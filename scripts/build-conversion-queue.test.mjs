// Fixtures inventadas: ninguna posición, partida ni id de acá sale de datos reales.
import { describe, it, expect } from 'vitest';
import {
  ALLOWED_KEYS,
  buildFile,
  assertNoCrossDuplicates,
  enrichGameIds,
  fenKey,
  markNeedsReview,
} from './lib/conversionQueue.mjs';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const UUID_A = '11111111-2222-4333-8444-555555555555';
const UUID_B = '66666666-7777-4888-8999-aaaaaaaaaaaa';

const conv = (n, over = {}) => ({
  id: `conv-${String(n).padStart(3, '0')}`,
  fen: START,
  color: 'white',
  acceptedUci: ['e2e4'],
  plan: 'Cambiar damas y convertir.',
  evalBefore: 300,
  gameId: null,
  source: 'lichess',
  date: '2026-03',
  ...over,
});
const guide = (n, over = {}) => ({
  id: `drill-${String(n).padStart(3, '0')}`,
  fen: START,
  color: 'white',
  acceptedUci: [],
  plan: 'Listá jaques, capturas y amenazas.',
  gameId: null,
  source: 'guia',
  ...over,
});

const klass = (n, over = {}) => ({
  ...guide(n, { source: 'clase' }),
  id: `drill-${String(n).padStart(3, '0')}`,
  ...over,
});

const file = items => ({ version: '2026-01-01', count: items.length, items });
const build = (items, kind = 'conversion') => buildFile(file(items), kind, { expectedCount: items.length });

describe('buildFile', () => {
  it('descarta las claves no permitidas', () => {
    const dirty = conv(1, {
      opponent: 'Fulano',
      Elo: 1800,
      tournament: 'Abierto',
      pgn: '1. e4',
      link: 'x',
      username: 'u',
    });
    const [item] = build([dirty]).items;
    expect(Object.keys(item).every(k => ALLOWED_KEYS.includes(k))).toBe(true);
    expect(item).not.toHaveProperty('opponent');
    expect(item).not.toHaveProperty('pgn');
    expect(item).not.toHaveProperty('Elo');
  });

  it('deja version como YYYY-MM, sin fecha exacta', () => {
    expect(build([conv(1)]).version).toBe('2026-01');
  });

  it('acepta una guía sin fecha, sin evalBefore y solo con plan', () => {
    expect(() => build([guide(1)], 'guide')).not.toThrow();
  });

  it.each([
    ['FEN ilegal', conv(1, { fen: 'esto no es un fen 1 2 3' })],
    ['FEN con piezas imposibles', conv(1, { fen: '8/8/8/8/8/8/8/8 w - - 0 1' })],
    ['color distinto del turno', conv(1, { color: 'black' })],
    ['jugada aceptada ilegal', conv(1, { acceptedUci: ['e2e5'] })],
    ['más de 5 jugadas aceptadas', conv(1, { acceptedUci: ['a2a3', 'a2a4', 'b2b3', 'b2b4', 'c2c3', 'c2c4'] })],
    ['sin jugada ni plan', conv(1, { acceptedUci: [], plan: '' })],
    ['gameId que no es uuid', conv(1, { gameId: 'partida-7' })],
    ['date faltante en otb', conv(1, { source: 'otb', date: undefined })],
    ['date con día', conv(1, { date: '2026-03-14' })],
    ['source libro en conversión', conv(1, { source: 'libro' })],
    ['evalBefore 0 en conversión', conv(1, { evalBefore: 0 })],
    ['evalBefore faltante en conversión', conv(1, { evalBefore: undefined })],
    ['notes demasiado largo', conv(1, { notes: 'x'.repeat(281) })],
    ['notes con link', conv(1, { notes: 'ver https://ejemplo.org/x' })],
    ['notes con @', conv(1, { notes: 'contacto a@b' })],
    ['posición de mate', conv(1, { fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', color: 'black', acceptedUci: [], plan: 'x' })],
  ])('falla con %s', (_name, item) => {
    expect(() => build([item])).toThrow();
  });

  it('falla con gameId no null en una guía', () => {
    expect(() => build([guide(1, { gameId: UUID_A })], 'guide')).toThrow(/gameId/);
  });

  it('acepta una clase (source clase, gameId null, con y sin fecha y evalBefore)', () => {
    expect(() => build([klass(36), klass(37, { date: '2026-10', evalBefore: 250 })], 'class')).not.toThrow();
  });

  it('source clase es válida solo en el archivo de clases', () => {
    expect(() => build([conv(1, { source: 'clase' })])).toThrow(/source/);
    expect(() => build([guide(1, { source: 'clase' })], 'guide')).toThrow(/source/);
    expect(() => build([klass(36, { source: 'guia' })], 'class')).toThrow(/source/);
  });

  it('falla con gameId no null en una clase', () => {
    expect(() => build([klass(36, { gameId: UUID_A })], 'class')).toThrow(/gameId/);
  });

  it('falla con evalBefore <= 0 en una clase si viene', () => {
    expect(() => build([klass(36, { evalBefore: 0 })], 'class')).toThrow(/evalBefore/);
  });

  it('falla con un id fuera de drill-036..064 en clases (y de drill-001..035 en guías)', () => {
    expect(() => build([klass(35)], 'class')).toThrow(/fuera de rango/);
    expect(() => build([klass(65)], 'class')).toThrow(/fuera de rango/);
    expect(() => build([guide(36)], 'guide')).toThrow(/fuera de rango/);
  });

  it('needsReview debe ser boolean y pasa la whitelist', () => {
    expect(build([klass(36, { needsReview: true })], 'class').items[0].needsReview).toBe(true);
    expect(() => build([klass(36, { needsReview: 'si' })], 'class')).toThrow(/needsReview/);
  });

  it('falla con el nombre del profesor o de un rival en un string', () => {
    expect(() => build([klass(36, { notes: 'Dijo Toto que sí' })], 'class')).toThrow();
    expect(() => build([klass(36, { plan: 'contra botz' })], 'class')).toThrow();
  });

  it('falla con evalBefore <= 0 en una guía si viene', () => {
    expect(() => build([guide(1, { evalBefore: -50 })], 'guide')).toThrow(/evalBefore/);
  });

  it('falla con ids duplicados dentro del archivo', () => {
    expect(() => build([conv(1), conv(1)])).toThrow(/duplicados/);
  });

  it('falla si el id no matchea el patrón del archivo', () => {
    expect(() => build([guide(1, { id: 'conv-001' })], 'guide')).toThrow(/id no matchea/);
  });

  it('falla con un conteo distinto de 90 (conversión), 35 (guías) o 29 (clases)', () => {
    const ninety = Array.from({ length: 89 }, (_, i) => conv(i + 1));
    expect(() => buildFile(file(ninety), 'conversion')).toThrow(/90/);
    const thirtyFour = Array.from({ length: 34 }, (_, i) => guide(i + 1));
    expect(() => buildFile(file(thirtyFour), 'guide')).toThrow(/35/);
    const thirty = Array.from({ length: 30 }, (_, i) => klass(i + 36));
    expect(() => buildFile(file(thirty), 'class')).toThrow(/29/);
  });

  it('falla si count no coincide con los ítems', () => {
    expect(() => buildFile({ ...file([conv(1)]), count: 2 }, 'conversion', { expectedCount: 1 })).toThrow(/count/);
  });

  it('acepta los conteos exactos', () => {
    const ninety = Array.from({ length: 90 }, (_, i) => conv(i + 1));
    const thirtyFive = Array.from({ length: 35 }, (_, i) => guide(i + 1));
    const twentyNine = Array.from({ length: 29 }, (_, i) => klass(i + 36));
    expect(buildFile(file(ninety), 'conversion').count).toBe(90);
    expect(buildFile(file(thirtyFive), 'guide').count).toBe(35);
    expect(buildFile(file(twentyNine), 'class').count).toBe(29);
  });
});

describe('assertNoCrossDuplicates', () => {
  it('falla con ids repetidos entre archivos', () => {
    expect(() => assertNoCrossDuplicates([conv(1)], [guide(1, { id: 'conv-001' })])).toThrow(/entre archivos/);
  });
  it('falla con un id repetido entre guías y clases', () => {
    expect(() => assertNoCrossDuplicates([conv(1)], [guide(36)], [klass(36)])).toThrow(/drill-036/);
  });
  it('pasa con ids distintos', () => {
    expect(() => assertNoCrossDuplicates([conv(1)], [guide(1)], [klass(36)])).not.toThrow();
  });
});

describe('markNeedsReview', () => {
  it('marca solo los ids pedidos, sin mutar la entrada', () => {
    const input = [klass(36), klass(37), klass(38)];
    const out = markNeedsReview(input, ['drill-038']);
    expect(out.map(i => i.needsReview)).toEqual([undefined, undefined, true]);
    expect(input[2]).not.toHaveProperty('needsReview');
  });
  it('falla si un id no existe', () => {
    expect(() => markNeedsReview([klass(36)], ['drill-099'])).toThrow(/inexistentes/);
  });
});

describe('enrichGameIds', () => {
  const game = (id, moves) => ({ id, source: 'lichess', played_date: '2026-03-01', pgn: `[Event "x"]\n\n${moves}` });

  it('completa el gameId cuando la posición matchea una sola partida', () => {
    const games = [game(UUID_A, '1. e4 e5 2. Nf3 *')];
    const { items, report } = enrichGameIds([conv(1, { fen: AFTER_E4_E5, color: 'white', ply: 2 })], games);
    expect(items[0].gameId).toBe(UUID_A);
    expect(report.filled).toEqual(['conv-001']);
  });

  it('deja null cuando hay más de un candidato en el mismo ply', () => {
    const games = [game(UUID_A, '1. e4 e5 2. Nf3 *'), game(UUID_B, '1. e4 e5 2. Nc3 *')];
    const { items, report } = enrichGameIds([conv(1, { fen: AFTER_E4_E5, ply: 2 })], games);
    expect(items[0].gameId).toBeNull();
    expect(report.ambiguous).toEqual(['conv-001']);
  });

  it('prioriza el candidato que coincide en ply', () => {
    // La partida B vuelve a la posición inicial en el ply 4.
    const games = [game(UUID_A, '1. e4 e5 *'), game(UUID_B, '1. Nf3 Nf6 2. Ng1 Ng8 *')];
    const { items } = enrichGameIds([conv(1, { fen: START, ply: 4 })], games);
    expect(items[0].gameId).toBe(UUID_B);
  });

  it('deja null cuando ninguna partida tiene la posición', () => {
    const games = [game(UUID_A, '1. d4 d5 *')];
    const { items, report } = enrichGameIds([conv(1, { fen: AFTER_E4_E5, ply: 2 })], games);
    expect(items[0].gameId).toBeNull();
    expect(report.unmatched).toEqual(['conv-001']);
  });

  it('confirma o reporta los gameId que ya vienen, sin cambiarlos', () => {
    const games = [game(UUID_A, '1. e4 e5 *'), game(UUID_B, '1. d4 d5 *')];
    const input = [
      conv(1, { fen: AFTER_E4_E5, gameId: UUID_A }),
      conv(2, { fen: AFTER_E4_E5, gameId: UUID_B }),
      conv(3, { fen: AFTER_E4_E5, gameId: '99999999-9999-4999-8999-999999999999' }),
    ];
    const { items, report } = enrichGameIds(input, games);
    expect(items.map(i => i.gameId)).toEqual(input.map(i => i.gameId));
    expect(report.knownConfirmed).toEqual(['conv-001']);
    expect(report.knownMismatch).toEqual(['conv-002']);
    expect(report.knownNotInSnapshot).toEqual(['conv-003']);
  });

  it('no muta los ítems de entrada y tolera PGN rotos', () => {
    const input = [conv(1, { fen: AFTER_E4_E5 })];
    const { report } = enrichGameIds(input, [{ id: UUID_A, source: 'otb', played_date: '2026-01-01', pgn: 'basura' }]);
    expect(input[0].gameId).toBeNull();
    expect(report.unparsable).toBe(1);
  });

  it('compara solo los primeros 4 campos del FEN', () => {
    expect(fenKey('8/8/8/8/8/8/8/K6k w - - 12 40')).toBe('8/8/8/8/8/8/8/K6k w - -');
  });
});
