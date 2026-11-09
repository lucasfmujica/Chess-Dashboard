import { describe, it, expect } from 'vitest';
import {
  PLAN_FINAL_FROM,
  PLAN_FINAL_TO,
  isPlanFinalDate,
  programForDate,
  programForWeekday,
  quotaTotal,
  blocksForDay,
} from './trainingProgram';
import { weekdayIndex } from '../utils/localDate';

/**
 * Date keys are America/Buenos_Aires calendar days, compared as plain
 * 'YYYY-MM-DD' strings. Nothing here goes through `new Date()` or UTC, so the
 * edges can't shift with the machine's timezone.
 */
describe('plan-final window', () => {
  it('spans 2026-11-10 … 2026-12-04', () => {
    expect(PLAN_FINAL_FROM).toBe('2026-11-10');
    expect(PLAN_FINAL_TO).toBe('2026-12-04');
  });

  it('includes both edges and excludes the days just outside', () => {
    expect(isPlanFinalDate('2026-11-10')).toBe(true);
    expect(isPlanFinalDate('2026-12-04')).toBe(true);
    expect(isPlanFinalDate('2026-11-09')).toBe(false);
    expect(isPlanFinalDate('2026-12-05')).toBe(false);
  });
});

describe('programForDate inside the window', () => {
  it('serves the plan T day on 2026-11-10, not the generic Monday', () => {
    const day = programForDate('2026-11-10');
    expect(day.focus).toBe('T · Táctica y cálculo');
    expect(day.weekday).toBe(weekdayIndex('2026-11-10'));
    expect(day.blocks.map(b => b.block)).toEqual(['calculation', 'calculation', 'lesson']);
    expect(day.blocks.map(b => b.minutes)).toEqual([10, 35, 10]);
    expect(day.quota.blunder).toBe(10);
    expect(day).not.toEqual(programForWeekday(weekdayIndex('2026-11-10')));
  });

  it('serves the tournament-routine day on 2026-12-04 with nothing to tick', () => {
    const day = programForDate('2026-12-04');
    expect(day.isTrainingDay).toBe(false);
    expect(day.blocks).toEqual([]);
    expect(quotaTotal(day.quota)).toBe(0);
    expect(blocksForDay(day)).toEqual([]);
    expect(day.focus).toContain('Rutina de torneo');
  });

  it('maps finals and chapter days to endgame / repertoire quotas', () => {
    const day = programForDate('2026-11-11');
    expect(day.quota.endgame).toBe(1);
    expect(day.quota.repertoire).toBe(1);
    expect(day.quota.blunder).toBe(0);
  });

  it('keeps the queue light on rest and liviana days', () => {
    expect(programForDate('2026-11-21').quota.blunder).toBe(5);
    expect(programForDate('2026-11-30').quota.blunder).toBe(5);
  });

  it('covers every date in the window with a plan day', () => {
    for (let d = 10; d <= 30; d += 1) {
      const day = programForDate(`2026-11-${d}`);
      expect(day.weekday).toBe(weekdayIndex(`2026-11-${d}`));
      expect(day).not.toBe(programForWeekday(day.weekday));
    }
    for (let d = 1; d <= 4; d += 1) {
      expect(programForDate(`2026-12-0${d}`)).not.toBe(programForWeekday(weekdayIndex(`2026-12-0${d}`)));
    }
  });
});

describe('programForDate outside the window', () => {
  it.each(['2026-11-09', '2026-12-05', '2026-10-14'])('%s is the base weekday program', key => {
    expect(programForDate(key)).toBe(programForWeekday(weekdayIndex(key)));
  });
});

describe('a week straddling the window edge', () => {
  it('shows the plan on 1–4 Dec only, the base program on 5–6 Dec', () => {
    const week = ['2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05', '2026-12-06'];
    const inPlan = week.map(k => programForDate(k) !== programForWeekday(weekdayIndex(k)));
    expect(inPlan).toEqual([true, true, true, true, true, false, false]);
  });

  it('starts mid-week at the opening edge', () => {
    const week = ['2026-11-09', '2026-11-10'];
    expect(programForDate(week[0])).toBe(programForWeekday(0));
    expect(programForDate(week[1]).focus).toBe('T · Táctica y cálculo');
  });
});
