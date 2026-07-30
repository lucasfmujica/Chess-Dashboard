import { describe, it, expect } from 'vitest';
import {
  buildRepertoireEcoIndex,
  repertoireEcosByColor,
  ecosMissingHeroes,
} from './repertoireEcos';
import type { RepertoireLine } from '../types/chess';

const line = (over: Partial<RepertoireLine>): RepertoireLine => ({
  id: over.eco ?? 'x',
  createdAt: 0,
  color: 'W',
  ...over,
});

describe('buildRepertoireEcoIndex', () => {
  it('indexes each ECO with its colour and priority', () => {
    const index = buildRepertoireEcoIndex([
      line({ eco: 'A14', color: 'W', priority: 6, lineName: '01 BLANCAS - doble fianchetto' }),
      line({ eco: 'B35', color: 'B', priority: 3, lineName: '09 NEGRAS - Dragon' }),
    ]);

    expect(index.get('A14')).toMatchObject({ color: 'W', priority: 6 });
    expect(index.get('B35')).toMatchObject({ color: 'B', priority: 3 });
  });

  it('keeps every chapter for an ECO that covers more than one', () => {
    // Nine codes in the real repertoire cover two chapters each.
    const index = buildRepertoireEcoIndex([
      line({ eco: 'A10', priority: 6, lineName: '07 BLANCAS - Holandesa' }),
      line({ eco: 'A10', priority: 7, lineName: '08 BLANCAS - esquemas KID' }),
    ]);

    expect(index.get('A10')?.chapters).toEqual([
      '07 BLANCAS - Holandesa',
      '08 BLANCAS - esquemas KID',
    ]);
  });

  it('takes the most urgent chapter as the ECO priority', () => {
    const index = buildRepertoireEcoIndex([
      line({ eco: 'A70', priority: 4, lineName: '23 Knight Tour' }),
      line({ eco: 'A70', priority: 1, lineName: '19 BENONI CLASICA' }),
    ]);

    expect(index.get('A70')?.priority).toBe(1);
  });

  it('sorts a line with no priority after the ones that have it', () => {
    const index = buildRepertoireEcoIndex([
      line({ eco: 'A70', lineName: 'sin prioridad' }),
      line({ eco: 'A70', priority: 4, lineName: 'con prioridad' }),
    ]);

    expect(index.get('A70')?.priority).toBe(4);
  });

  it('skips lines with no ECO instead of indexing an empty code', () => {
    const index = buildRepertoireEcoIndex([line({ lineName: 'sin eco' }), line({ eco: '  ' })]);

    expect(index.size).toBe(0);
  });
});

describe('repertoireEcosByColor', () => {
  it('splits the codes by colour for the repertoire singleton', () => {
    const index = buildRepertoireEcoIndex([
      line({ eco: 'B35', color: 'B', priority: 3 }),
      line({ eco: 'A14', color: 'W', priority: 6 }),
      line({ eco: 'A10', color: 'W', priority: 6 }),
    ]);

    expect(repertoireEcosByColor(index)).toEqual({ white: ['A10', 'A14'], black: ['B35'] });
  });
});

describe('ecosMissingHeroes', () => {
  const index = buildRepertoireEcoIndex([
    line({ eco: 'B35', color: 'B', priority: 3 }),
    line({ eco: 'D01', color: 'B', priority: 5 }),
    line({ eco: 'A26', color: 'W', priority: 6 }),
  ]);

  it('lists repertoire ECOs with no hero, most urgent first', () => {
    expect(ecosMissingHeroes(index, { B35: ['Tiviakov'] }).map(e => e.eco)).toEqual([
      'D01',
      'A26',
    ]);
  });

  it('treats an empty hero array as missing', () => {
    // The heroes map keeps keys whose array was emptied, so a length check is
    // the only thing that distinguishes "tracked" from "left over".
    expect(ecosMissingHeroes(index, { B35: [] }).map(e => e.eco)).toContain('B35');
  });

  it('ignores heroes for openings outside the repertoire', () => {
    expect(ecosMissingHeroes(index, { E90: ['Gufeld'] })).toHaveLength(3);
  });
});
