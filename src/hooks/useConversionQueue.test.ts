import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ConversionItem } from '../constants/conversionQueue';
import { conversionItemUuid } from '../utils/conversionId';
import { FILTER_KEY, PROGRESS_KEY, UNSAVED_KEY } from '../utils/conversionProgress';
import { INFLIGHT_MS } from '../utils/conversionOutbox';

const fetchAttempts = vi.fn();
const postAttempts = vi.fn();
vi.mock('../api/client', () => ({
  fetchTrainingAttempts: (...a: unknown[]) => fetchAttempts(...a),
  postTrainingAttempts: (...a: unknown[]) => postAttempts(...a),
}));

import { useConversionQueue, resetConversionServerCache } from './useConversionQueue';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const mk = (id: string, kind: ConversionItem['kind'], evalBefore?: number): ConversionItem => ({
  id,
  kind,
  fen: START,
  color: 'white',
  acceptedUci: ['e2e4'],
  evalBefore,
  gameId: null,
  source: kind === 'conversion' ? 'lichess' : 'guia',
  date: kind === 'conversion' ? '2026-03' : null,
});

// Inventados: 3 conversiones y 2 guías.
const ITEMS: ConversionItem[] = [
  mk('conv-001', 'conversion', 300),
  mk('conv-002', 'conversion', 900),
  mk('conv-003', 'conversion', 300),
  mk('drill-001', 'guide'),
  mk('drill-002', 'guide', 150),
];

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();

const setup = async () => {
  const hook = renderHook(() => useConversionQueue(ITEMS));
  await waitFor(() => expect(hook.result.current.syncedAt).not.toBeNull());
  return hook;
};

beforeEach(() => {
  window.localStorage.clear();
  resetConversionServerCache();
  fetchAttempts.mockReset().mockResolvedValue([]);
  postAttempts.mockReset().mockResolvedValue({ inserted: 1 });
});

describe('filtro y conteos', () => {
  it('cuenta Todas, Partidas y Guías desde los datos', async () => {
    const { result } = await setup();
    expect(result.current.counts).toEqual({ all: 5, conversion: 3, guide: 2 });
  });

  it('filtra la lista y guarda el filtro en localStorage', async () => {
    const { result } = await setup();
    expect(result.current.filter).toBe('all');
    expect(result.current.ordered('conversion').map(i => i.id)).toHaveLength(3);
    expect(result.current.ordered('guide').map(i => i.id)).toEqual(['drill-001', 'drill-002']);
    act(() => result.current.setFilter('guide'));
    expect(JSON.parse(window.localStorage.getItem(FILTER_KEY) as string)).toBe('guide');
  });

  it('con los datos reales: 124, 90 y 34', async () => {
    const hook = renderHook(() => useConversionQueue());
    await waitFor(() => expect(hook.result.current.syncedAt).not.toBeNull());
    expect(hook.result.current.counts).toEqual({ all: 124, conversion: 90, guide: 34 });
  });
});

describe('orden', () => {
  it('no vistas: conversión por evalBefore descendente y por id, después las guías por id', async () => {
    const { result } = await setup();
    expect(result.current.ordered('all', NOW).map(i => i.id)).toEqual([
      'conv-002', // +9.00
      'conv-001', // +3.00, id menor
      'conv-003',
      'drill-001',
      'drill-002',
    ]);
  });

  it('después de las no vistas van las que vencen por SRS, y al final las que no', async () => {
    window.localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({
        'conv-002': { confidence: 1, lastReviewed: NOW - 2 * DAY, reviewCount: 1, solvedCount: 0 }, // vencida (1 día)
        'conv-001': { confidence: 5, lastReviewed: NOW - DAY, reviewCount: 1, solvedCount: 1 }, // vigente (30 días)
      })
    );
    const { result } = await setup();
    expect(result.current.ordered('all', NOW).map(i => i.id)).toEqual([
      'conv-003',
      'drill-001',
      'drill-002', // no vistas
      'conv-002', // vencida
      'conv-001', // al día
    ]);
    expect(result.current.stats('all', NOW)).toEqual({ total: 5, seen: 2, due: 4 });
  });
});

describe('fusión entre localStorage y servidor', () => {
  const attempt = (id: string, correct: boolean, createdAt: number) => ({
    id: `a-${id}-${createdAt}`,
    itemKind: 'external',
    itemId: conversionItemUuid(id),
    correct,
    createdAt,
  });

  it('con localStorage vacío reconstruye el estado desde el servidor', async () => {
    fetchAttempts.mockResolvedValue([
      attempt('conv-001', true, NOW - 3 * DAY),
      attempt('conv-001', true, NOW - 2 * DAY),
      attempt('drill-002', false, NOW - DAY),
      // ajenos: otro kind y un uuid que no es de la cola
      { ...attempt('conv-002', true, NOW), itemKind: 'blunder' },
      { id: 'x', itemKind: 'external', itemId: '00000000-0000-5000-8000-000000000000', correct: true, createdAt: NOW },
    ]);
    const { result } = await setup();
    expect(result.current.progress['conv-001']).toEqual({
      confidence: 5, // 3 → 4 → 5
      lastReviewed: NOW - 2 * DAY,
      reviewCount: 2,
      solvedCount: 2,
    });
    expect(result.current.progress['drill-002']).toMatchObject({ confidence: 2, reviewCount: 1, solvedCount: 0 });
    expect(result.current.progress['conv-002']).toBeUndefined();
    expect(JSON.parse(window.localStorage.getItem(PROGRESS_KEY) as string)['conv-001'].reviewCount).toBe(2);
  });

  it('ante un conflicto gana el lastReviewed más reciente', async () => {
    window.localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({
        'conv-001': { confidence: 4, lastReviewed: NOW - DAY, reviewCount: 3, solvedCount: 3 }, // local más nuevo
        'conv-002': { confidence: 2, lastReviewed: NOW - 5 * DAY, reviewCount: 1, solvedCount: 0 }, // servidor más nuevo
      })
    );
    fetchAttempts.mockResolvedValue([
      attempt('conv-001', false, NOW - 4 * DAY),
      attempt('conv-002', true, NOW - DAY),
    ]);
    const { result } = await setup();
    expect(result.current.progress['conv-001']).toMatchObject({ reviewCount: 3, confidence: 4 });
    expect(result.current.progress['conv-002']).toMatchObject({ lastReviewed: NOW - DAY, solvedCount: 1 });
  });

  it('si el servidor falla se queda con lo local y avisa', async () => {
    window.localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({ 'conv-001': { confidence: 4, lastReviewed: NOW, reviewCount: 1, solvedCount: 1 } })
    );
    fetchAttempts.mockRejectedValue(new Error('sin red'));
    const { result } = await setup();
    expect(result.current.syncError).toBe('sin red');
    expect(result.current.progress['conv-001']?.confidence).toBe(4);
  });
});

const pendingEntry = (key: string, id: string, inflightAt?: number) => ({
  key,
  attempt: { itemKind: 'external', itemId: conversionItemUuid(id), correct: false },
  ...(inflightAt !== undefined && { inflightAt }),
});

describe('intentos', () => {
  it.each([
    ['conv-001', true],
    ['conv-002', false],
    ['drill-001', true],
    ['drill-002', false],
  ])('%s (correct=%s): actualiza localStorage y hace POST external sin candidateMiss', async (id, correct) => {
    const { result } = await setup();
    const item = ITEMS.find(i => i.id === id) as ConversionItem;
    await act(() => result.current.record(item, correct, { seconds: 42, thinkSeconds: 30, candidatesWritten: 'Nf3, e4' }));

    const stored = JSON.parse(window.localStorage.getItem(PROGRESS_KEY) as string)[id];
    expect(stored).toMatchObject({ reviewCount: 1, solvedCount: correct ? 1 : 0, confidence: correct ? 4 : 2 });
    expect(stored.lastReviewed).toBeGreaterThan(0);

    expect(postAttempts).toHaveBeenCalledTimes(1);
    const [[sent]] = postAttempts.mock.calls[0] as [Record<string, unknown>[]];
    expect(sent).toEqual({
      itemKind: 'external',
      itemId: conversionItemUuid(id),
      correct,
      seconds: 42,
      thinkSeconds: 30,
      candidatesWritten: 'Nf3, e4',
    });
    expect(sent).not.toHaveProperty('candidateMiss');
    expect(sent).not.toHaveProperty('sessionId');
    expect(result.current.pendingCount).toBe(0);
  });

  it('dos respuestas seguidas no pisan el estado de la anterior', async () => {
    const { result } = await setup();
    await act(async () => {
      await Promise.all([
        result.current.record(ITEMS[0], true),
        result.current.record(ITEMS[1], false),
      ]);
    });
    expect(Object.keys(result.current.progress).sort()).toEqual(['conv-001', 'conv-002']);
  });

  it('un POST fallido queda pendiente en localStorage y se reintenta al montar', async () => {
    const first = await setup();
    postAttempts.mockRejectedValueOnce(new Error('sin red'));
    await act(() => first.result.current.record(ITEMS[0], true));
    expect(first.result.current.pendingCount).toBe(1);
    const pending = JSON.parse(window.localStorage.getItem(UNSAVED_KEY) as string);
    expect(pending).toHaveLength(1);
    expect(pending[0].attempt).toMatchObject({ itemKind: 'external', itemId: conversionItemUuid('conv-001'), correct: true });
    expect(pending[0].inflightAt).toBeUndefined(); // el reclamo se suelta al fallar
    first.unmount();

    postAttempts.mockClear();
    const second = await setup();
    await waitFor(() => expect(second.result.current.pendingCount).toBe(0));
    expect(postAttempts).toHaveBeenCalledWith([pending[0].attempt]);
    expect(JSON.parse(window.localStorage.getItem(UNSAVED_KEY) as string)).toEqual([]);
  });

  it('si el reintento también falla, el intento sigue pendiente', async () => {
    window.localStorage.setItem(
      UNSAVED_KEY,
      JSON.stringify([pendingEntry('k1', 'drill-001')])
    );
    postAttempts.mockRejectedValue(new Error('sin red'));
    const { result } = await setup();
    expect(result.current.pendingCount).toBe(1);
  });
});

describe('un solo flusher por pestaña', () => {
  it('dos instancias montadas a la vez no duplican el POST de un pendiente', async () => {
    window.localStorage.setItem(UNSAVED_KEY, JSON.stringify([pendingEntry('k1', 'conv-001')]));
    let release: () => void = () => undefined;
    postAttempts.mockImplementation(() => new Promise(resolve => (release = () => resolve({ inserted: 1 }))));

    const a = renderHook(() => useConversionQueue(ITEMS));
    const b = renderHook(() => useConversionQueue(ITEMS));
    await waitFor(() => expect(postAttempts).toHaveBeenCalledTimes(1));
    release();
    await waitFor(() => expect(a.result.current.syncedAt).not.toBeNull());
    await waitFor(() => expect(b.result.current.syncedAt).not.toBeNull());

    expect(postAttempts).toHaveBeenCalledTimes(1);
    expect(a.result.current.pendingCount).toBe(0);
    expect(b.result.current.pendingCount).toBe(0);
    // y el fetch del servidor tampoco se repite entre montajes
    expect(fetchAttempts).toHaveBeenCalledTimes(1);
  });

  it('un pendiente en vuelo no se reenvía antes de 2 minutos, y después sí', async () => {
    const now = Date.now();
    window.localStorage.setItem(
      UNSAVED_KEY,
      JSON.stringify([pendingEntry('k1', 'conv-001', now - 30_000), pendingEntry('k2', 'conv-002')])
    );
    await setup();
    // solo se reclamó el que no estaba en vuelo
    expect(postAttempts).toHaveBeenCalledTimes(1);
    expect(postAttempts.mock.calls[0][0]).toEqual([pendingEntry('k2', 'conv-002').attempt]);
    const left = JSON.parse(window.localStorage.getItem(UNSAVED_KEY) as string);
    expect(left.map((e: { key: string }) => e.key)).toEqual(['k1']);

    // pasados 2 minutos sin confirmación vuelve a ser elegible
    window.localStorage.setItem(UNSAVED_KEY, JSON.stringify([pendingEntry('k1', 'conv-001', now - INFLIGHT_MS - 1)]));
    postAttempts.mockClear();
    await setup();
    expect(postAttempts).toHaveBeenCalledTimes(1);
    expect(postAttempts.mock.calls[0][0]).toEqual([pendingEntry('k1', 'conv-001').attempt]);
  });

  it('el pendiente queda marcado en vuelo mientras el POST está abierto', async () => {
    window.localStorage.setItem(UNSAVED_KEY, JSON.stringify([pendingEntry('k1', 'conv-001')]));
    let release: () => void = () => undefined;
    postAttempts.mockImplementation(() => new Promise(resolve => (release = () => resolve({ inserted: 1 }))));
    renderHook(() => useConversionQueue(ITEMS));
    await waitFor(() => expect(postAttempts).toHaveBeenCalled());
    const [entry] = JSON.parse(window.localStorage.getItem(UNSAVED_KEY) as string);
    expect(entry.inflightAt).toBeGreaterThan(0);
    release();
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem(UNSAVED_KEY) as string)).toEqual([]));
  });
});

describe('duplicados del servidor', () => {
  const dup = (id: string, createdAt: number, over: Record<string, unknown> = {}) => ({
    id: `a-${createdAt}`,
    itemKind: 'external',
    itemId: conversionItemUuid(id),
    correct: true,
    seconds: 40,
    thinkSeconds: 30,
    createdAt,
    ...over,
  });

  it('colapsa intentos idénticos a menos de 120 s y conserva los distintos', async () => {
    fetchAttempts.mockResolvedValue([
      dup('conv-001', NOW - 3 * DAY),
      dup('conv-001', NOW - 3 * DAY + 60_000), // reintento duplicado: cuenta una vez
      dup('conv-001', NOW - 3 * DAY + 300_000), // 5 min después: otro intento
      dup('conv-001', NOW - 2 * DAY, { seconds: 41 }), // otros segundos: otro intento
      dup('conv-002', NOW - DAY),
      dup('conv-002', NOW - DAY + 10_000, { correct: false }), // otro resultado: otro intento
    ]);
    const { result } = await setup();
    expect(result.current.progress['conv-001']).toMatchObject({ reviewCount: 3, solvedCount: 3 });
    expect(result.current.progress['conv-002']).toMatchObject({ reviewCount: 2, solvedCount: 1 });
  });
});
