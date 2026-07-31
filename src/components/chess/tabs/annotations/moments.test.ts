import { describe, it, expect } from 'vitest';
import {
  addMoment,
  criticalFields,
  plyLabel,
  removeMoment,
  setCriticalMoment,
  sortMoments,
  updateMoment,
} from './moments';
import type { KeyMoment } from '../../../../types/chess';

const moment = (over: Partial<KeyMoment>): KeyMoment => ({
  move: 'e4',
  symbol: '',
  comment: '',
  ...over,
});

describe('plyLabel', () => {
  it('numbers White and Black halves of the move', () => {
    expect(plyLabel(0, 'e4')).toBe('1.e4');
    expect(plyLabel(1, 'c5')).toBe('1...c5');
    expect(plyLabel(22, 'Nxe5')).toBe('12.Nxe5');
    expect(plyLabel(23, 'Bxe5')).toBe('12...Bxe5');
  });
});

describe('sortMoments', () => {
  it('keeps board order and pushes hand-typed moments to the end', () => {
    const sorted = sortMoments([
      moment({ move: 'late', ply: 30 }),
      moment({ move: 'byHand' }),
      moment({ move: 'early', ply: 4 }),
    ]);
    expect(sorted.map(m => m.move)).toEqual(['early', 'late', 'byHand']);
  });
});

describe('addMoment', () => {
  it('stars the first moment so the countable columns get filled', () => {
    const result = addMoment([], moment({ move: '12.Nxe5', ply: 22, fen: 'FEN', bestMove: 'Nf5' }));
    expect(result.keyMoments).toHaveLength(1);
    expect(result.keyMoments![0].critical).toBe(true);
    expect(result).toMatchObject({
      criticalMomentFen: 'FEN',
      playedMove: 'Nxe5',
      bestMove: 'Nf5',
    });
  });

  it('appends instead of replacing, and leaves the star where it was', () => {
    const first = addMoment([], moment({ move: '5.d4', ply: 8, fen: 'FEN-A', bestMove: 'c4' }));
    const second = addMoment(
      first.keyMoments!,
      moment({ move: '20.Rd1', ply: 38, fen: 'FEN-B', bestMove: 'Rc1' })
    );

    expect(second.keyMoments).toHaveLength(2);
    expect(second.keyMoments!.map(m => m.move)).toEqual(['5.d4', '20.Rd1']);
    // The decisive moment is still the one that was starred.
    expect(second.criticalMomentFen).toBe('FEN-A');
  });

  it('inserts an earlier moment in board order, not at the end', () => {
    const late = addMoment([], moment({ move: '20.Rd1', ply: 38 }));
    const both = addMoment(late.keyMoments!, moment({ move: '5.d4', ply: 8 }));
    expect(both.keyMoments!.map(m => m.ply)).toEqual([8, 38]);
  });
});

describe('setCriticalMoment', () => {
  it('moves the star and re-derives the flat columns', () => {
    const moments = [
      moment({ move: '5.d4', ply: 8, fen: 'FEN-A', bestMove: 'c4', critical: true }),
      moment({ move: '20.Rd1', ply: 38, fen: 'FEN-B', bestMove: 'Rc1' }),
    ];
    const result = setCriticalMoment(moments, 1);
    expect(result.keyMoments!.map(m => !!m.critical)).toEqual([false, true]);
    expect(result).toMatchObject({
      criticalMomentFen: 'FEN-B',
      playedMove: 'Rd1',
      bestMove: 'Rc1',
    });
  });
});

describe('removeMoment', () => {
  it('re-stars the first survivor when the decisive one is deleted', () => {
    const moments = [
      moment({ move: '5.d4', ply: 8, fen: 'FEN-A', critical: true }),
      moment({ move: '20.Rd1', ply: 38, fen: 'FEN-B' }),
    ];
    const result = removeMoment(moments, 0);
    expect(result.keyMoments).toHaveLength(1);
    expect(result.keyMoments![0].critical).toBe(true);
    expect(result.criticalMomentFen).toBe('FEN-B');
  });

  it('clears the flat columns when the last moment goes', () => {
    const result = removeMoment([moment({ fen: 'FEN', critical: true })], 0);
    expect(result.keyMoments).toEqual([]);
    expect(result.criticalMomentFen).toBeUndefined();
    expect(result.playedMove).toBeUndefined();
  });
});

describe('updateMoment', () => {
  it('edits one moment and leaves the rest alone', () => {
    const moments = [moment({ move: '5.d4', ply: 8 }), moment({ move: '20.Rd1', ply: 38 })];
    const result = updateMoment(moments, 1, { comment: 'la torre queda mal' });
    expect(result.keyMoments![1].comment).toBe('la torre queda mal');
    expect(result.keyMoments![0].comment).toBe('');
  });
});

describe('criticalFields', () => {
  it('strips the move number so the column holds bare SAN', () => {
    expect(criticalFields([moment({ move: '12...Nxe5', critical: true })]).playedMove).toBe('Nxe5');
  });

  it('is empty when nothing is starred', () => {
    expect(criticalFields([moment({ move: 'e4' })])).toEqual({
      criticalMomentFen: undefined,
      playedMove: undefined,
      bestMove: undefined,
    });
  });
});
