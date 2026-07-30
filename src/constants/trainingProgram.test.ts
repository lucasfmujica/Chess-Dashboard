import { describe, it, expect } from 'vitest';
import {
  trainingProgram,
  programForWeekday,
  quotaTotal,
  WEEKLY_QUEUE_TARGET,
} from './trainingProgram';

/**
 * The quotas are the denominator of every volume metric on the dashboard
 * (`WEEKLY_QUEUE_TARGET` in OverviewTab, `quotaTotal` in TodayStrip), so a
 * quota that silently stops being counted shows up as a target that quietly
 * drops rather than as an error.
 */
describe('quotaTotal', () => {
  it('counts every kind, including repertoire moves and concepts', () => {
    expect(
      quotaTotal({ blunder: 1, endgame: 2, repertoire: 3, repertoireMove: 4, concept: 5 })
    ).toBe(15);
  });

  it('matches the sum of the day quotas it is derived from', () => {
    const summed = trainingProgram.reduce((sum, day) => sum + quotaTotal(day.quota), 0);
    expect(WEEKLY_QUEUE_TARGET).toBe(summed);
  });
});

describe('the weekly program', () => {
  it('covers all seven weekdays exactly once', () => {
    expect(trainingProgram.map(d => d.weekday)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('splits Sunday between chapter plans and single moves', () => {
    // Sunday is the repertoire day, and the two trainers grade different
    // things: the moves carry the weight because that is where games are lost.
    const sunday = programForWeekday(6);

    expect(sunday.dayName).toBe('Domingo');
    expect(sunday.quota.repertoire).toBe(2);
    expect(sunday.quota.repertoireMove).toBe(8);
  });

  it('serves no repertoire moves on the days that are not for repertoire', () => {
    const others = trainingProgram.filter(d => d.weekday !== 6);
    expect(others.every(d => d.quota.repertoireMove === 0)).toBe(true);
  });

  it('asks for concepts back on Friday, and only there', () => {
    // The Friday block always created concepts; nothing ever asked for one to
    // come back, which is why the table stayed a write-only list.
    expect(programForWeekday(4).quota.concept).toBe(4);
    expect(
      trainingProgram.filter(d => d.weekday !== 4).every(d => d.quota.concept === 0)
    ).toBe(true);
  });

  it('wraps out-of-range weekdays instead of returning undefined', () => {
    expect(programForWeekday(7)).toBe(trainingProgram[0]);
    expect(programForWeekday(-1)).toBe(trainingProgram[6]);
  });
});
