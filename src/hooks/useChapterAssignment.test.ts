import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { INDEX_BATCH, indexInBatches, useChapterAssignment } from './useChapterAssignment';
import { buildChapterAssignment, isPgnIndexed } from '../utils/chapterRules';
import type { Game } from '../types/chess';

let seq = 0;
// PGN único por partida para que no estén en la cache de otros tests.
const mk = (color: 'W' | 'B' = 'W'): Game => {
  const n = seq++;
  const pgn = `[Event "t${n}"]\n\n1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7`;
  return { color, pgn, eco: 'D30' } as unknown as Game;
};
const many = (n: number) => Array.from({ length: n }, () => mk());

describe('indexInBatches', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('indexa de a INDEX_BATCH por turno y avisa al final', () => {
    const games = many(INDEX_BATCH * 2 + 1);
    const done = vi.fn();
    indexInBatches(games, done);
    vi.advanceTimersToNextTimer();
    expect(games.filter(g => isPgnIndexed(g.pgn))).toHaveLength(INDEX_BATCH);
    vi.advanceTimersToNextTimer();
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersToNextTimer();
    expect(done).toHaveBeenCalledTimes(1);
    expect(games.every(g => isPgnIndexed(g.pgn))).toBe(true);
  });

  it('cancelar frena las tandas', () => {
    const games = many(INDEX_BATCH * 2);
    const done = vi.fn();
    const cancel = indexInBatches(games, done);
    vi.advanceTimersToNextTimer();
    cancel();
    vi.runAllTimers();
    expect(done).not.toHaveBeenCalled();
    expect(games.filter(g => isPgnIndexed(g.pgn))).toHaveLength(INDEX_BATCH);
  });
});

describe('useChapterAssignment', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('devuelve null y después el resultado de buildChapterAssignment', () => {
    const games = many(INDEX_BATCH + 5);
    const { result } = renderHook(() => useChapterAssignment(games));
    expect(result.current).toBeNull();
    act(() => {
      vi.runAllTimers();
    });
    expect(result.current).not.toBeNull();
    expect(result.current).toBe(buildChapterAssignment(games));
  });

  it('con todo en cache calcula sincrónico', () => {
    const games = many(3);
    buildChapterAssignment(games);
    const { result } = renderHook(() => useChapterAssignment(games));
    expect(result.current).toBe(buildChapterAssignment(games));
  });

  it('al desmontar se cancela la indexación', () => {
    const games = many(INDEX_BATCH * 2);
    const { unmount } = renderHook(() => useChapterAssignment(games));
    act(() => {
      vi.advanceTimersToNextTimer();
    });
    unmount();
    act(() => {
      vi.runAllTimers();
    });
    expect(games.filter(g => isPgnIndexed(g.pgn))).toHaveLength(INDEX_BATCH);
  });
});
