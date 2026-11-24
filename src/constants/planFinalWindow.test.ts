import { describe, it, expect } from 'vitest';
import payload from './planFinalPayload.json';
import {
  PLAN_FINAL_FROM,
  PLAN_FINAL_TO,
  isPlanFinalDate,
  programForDate,
  programForWeekday,
  quotaTotal,
  blocksForDay,
  plannedMinutes,
} from './trainingProgram';
import { weekdayIndex } from '../utils/localDate';

/**
 * Date keys are America/Buenos_Aires calendar days, compared as plain
 * 'YYYY-MM-DD' strings. Nothing here goes through `new Date()` or UTC, so the
 * edges can't shift with the machine's timezone.
 */
describe('plan-final window', () => {
  it('spans 2026-11-10 … 2026-12-08', () => {
    expect(PLAN_FINAL_FROM).toBe('2026-11-10');
    expect(PLAN_FINAL_TO).toBe('2026-12-08');
  });

  it('includes both edges and excludes the days just outside', () => {
    expect(isPlanFinalDate('2026-11-10')).toBe(true);
    expect(isPlanFinalDate('2026-12-08')).toBe(true);
    expect(isPlanFinalDate('2026-11-09')).toBe(false);
    expect(isPlanFinalDate('2026-12-09')).toBe(false);
  });
});

describe('programForDate inside the window', () => {
  it('serves the plan T day on 2026-11-10, not the generic Monday', () => {
    const day = programForDate('2026-11-10');
    expect(day.focus).toBe('T · Táctica y cálculo. Martes fijos: drills 10 min antes de las 19, clase 19:00 a 20:00 ART y clase de cálculo con Juan Cruz 22:00 a 23:00 ART');
    expect(day.weekday).toBe(weekdayIndex('2026-11-10'));
    expect(day.blocks.map(b => b.block)).toEqual(['calculation', 'lesson', 'lesson']);
    expect(day.blocks.map(b => b.minutes)).toEqual([10, 60, 60]);
    expect(day.quota.blunder).toBe(10);
    expect(day).not.toEqual(programForWeekday(weekdayIndex('2026-11-10')));
  });

  it('serves the tournament-routine day on 2026-12-04 with nothing to tick', () => {
    const day = programForDate('2026-12-04');
    expect(day.isTrainingDay).toBe(false);
    expect(day.blocks).toEqual([]);
    expect(quotaTotal(day.quota)).toBe(0);
    expect(blocksForDay(day)).toEqual([]);
    expect(day.focus).toContain('Sin entrenamiento');
  });

  it('shows the 4 Dec deadline notice in the focus', () => {
    const focus = programForDate('2026-12-04').focus;
    expect(focus).toContain('ÚLTIMO DÍA');
    expect(focus).toContain('inscripción');
    expect(focus).toContain('byes');
  });

  it('maps finals and chapter days to endgame / repertoire quotas', () => {
    const day = programForDate('2026-11-11');
    expect(day.quota.endgame).toBe(1);
    expect(day.quota.repertoire).toBe(1);
    expect(day.quota.blunder).toBe(0);
  });

  it('honours the stated 10 drills on the light days', () => {
    // 30/11 and 2/12 are "liviana" but the plan says "10 drills".
    expect(programForDate('2026-11-30').quota.blunder).toBe(10);
    expect(programForDate('2026-12-02').quota.blunder).toBe(10);
  });

  it('covers every date in the window with a plan day', () => {
    for (let d = 10; d <= 30; d += 1) {
      const day = programForDate(`2026-11-${d}`);
      expect(day.weekday).toBe(weekdayIndex(`2026-11-${d}`));
      expect(day).not.toBe(programForWeekday(day.weekday));
    }
    for (let d = 1; d <= 8; d += 1) {
      expect(programForDate(`2026-12-0${d}`)).not.toBe(programForWeekday(weekdayIndex(`2026-12-0${d}`)));
    }
  });
});

describe('plan focus keeps the text that matters', () => {
  const visible = (key: string) => {
    const d = programForDate(key);
    return [d.focus, ...d.blocks.flatMap(b => [b.label, b.detail])].join(' | ');
  };

  it('does not cut at the "Cap." abbreviation (27/11)', () => {
    const day = programForDate('2026-11-27');
    expect(day.focus).not.toMatch(/Cap$/);
    expect(day.blocks.map(b => b.label).join(' ')).toContain('01 y 05');
  });

  it('does not cut at "caps." and keeps the chapter list (1/12)', () => {
    const focus = programForDate('2026-12-01').focus;
    expect(focus).not.toMatch(/caps?$/i);
    expect(focus).toContain('caps. 01, 05, 04, 06, 28 y 13');
    expect(focus).toContain('Clase 19:00 a 20:30 ART');
    expect(focus).toContain('Juan Cruz 22:00 a 23:00 ART');
  });

  it('shows the weekly summary time on 15/11', () => {
    expect(visible('2026-11-15')).toContain('Resumen semanal a las 21:00 ART');
  });

  it('shows the registration and no-engine sentences (20, 21/11)', () => {
    expect(programForDate('2026-11-20').focus).toContain('Inscripción al torneo confirmada');
    expect(programForDate('2026-11-21').focus).toContain('Sin análisis con motor entre rondas');
    expect(programForDate('2026-11-21').focus).toContain('Romano');
  });
});

describe('tournament weekend (20–26/11)', () => {
  const plays = (key: string) => programForDate(key).blocks.filter(b => b.block === 'play');

  it('20/11 is a light 30-minute day with one endgame and one repertoire item', () => {
    const day = programForDate('2026-11-20');
    expect(plannedMinutes(day)).toBe(30);
    expect(day.focus).toContain('Inscripción al torneo confirmada');
    expect(day.quota.blunder).toBe(0);
    expect(day.quota.endgame).toBe(1);
    expect(day.quota.repertoire).toBe(1);
    // 15 min of endgames (4 v 3 with Black) + 15 min of openings (caps. 01, 05, 09).
    expect(day.blocks.map(b => [b.block, b.minutes])).toEqual([['endgame', 15], ['repertoire', 15]]);
    expect(day.blocks[1].label).toContain('caps. 01, 05 y 09');
  });

  it('week totals add up with the 240-min rounds', () => {
    const sum = (keys: string[]) => keys.reduce((s, k) => s + plannedMinutes(programForDate(k)), 0);
    const w2 = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22'];
    const w3 = ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29'];
    // 55 + 180 + 50 + 55 + 30 + 480 + 480
    expect(sum(w2)).toBe(1330);
    // 23/11 stays 480; from 24/11: 40 + 55 + 55 + 55 + 70 + 20
    expect(sum(w3)).toBe(775);
  });

  it.each(['2026-11-21', '2026-11-22', '2026-11-23'])('%s has two play blocks and no queue', key => {
    const day = programForDate(key);
    expect(day.blocks.map(b => b.block)).toEqual(['play', 'play']);
    expect(day.blocks[0].label).toContain('14:00–18:00 ART');
    expect(day.blocks[1].label).toContain('18:00–22:00 ART');
    // A 60+30 round is a 4-hour slot, so each round is planned as 240 min.
    expect(day.blocks.map(b => b.minutes)).toEqual([240, 240]);
    expect(plannedMinutes(day)).toBe(480);
    expect(quotaTotal(day.quota)).toBe(0);
    expect(day.isTrainingDay).toBe(true);
  });

  it('21/11, 22/11 and 23/11 carry their focus text', () => {
    const f21 = programForDate('2026-11-21').focus;
    expect(f21).toContain('Soberanía Nacional');
    expect(f21).toContain('60+30');
    expect(f21).toContain('Sin análisis con motor');
    expect(f21).toContain('Romano (rival de la Final) está inscripto');
    const f22 = programForDate('2026-11-22').focus;
    expect(f22).toMatch(/bye/);
    expect(f22).toContain('Comida y descanso como en la Final');
    expect(f22).toContain('chequeo de seguridad');
    expect(programForDate('2026-11-23').focus).toContain('R5 y R6');
  });

  it('no pre-cutover date still mentions the old Sunday simulation', () => {
    const days = payload.days as Record<string, unknown>;
    for (const [key, day] of Object.entries(days)) {
      if (key >= '2026-11-24') continue;
      const text = JSON.stringify(day);
      expect(text).not.toContain('SIMULACIÓN · Domingo');
      expect(text).not.toContain('11:00, 15:00 y 19:00');
    }
  });

  it('24/11 reviews the 6 Soberanía reports before class', () => {
    const day = programForDate('2026-11-24');
    expect(day.blocks.map(b => b.block)).toEqual(['analysis', 'calculation']);
    expect(day.blocks.map(b => b.minutes)).toEqual([30, 10]);
    expect(day.blocks[0].label).toContain('6 informes');
    expect(day.focus).toContain('Clase 19:00 a 20:30 ART');
    expect(day.focus).toContain('Juan Cruz 22:00 a 23:00 ART');
    expect(day.quota.blunder).toBe(10);
  });

  it('25/11 is a T day and 26/11 an endgame + repertoire + concept day', () => {
    const t = programForDate('2026-11-25');
    expect(t.focus).toMatch(/^T ·/);
    expect(t.quota.blunder).toBe(10);
    const f = programForDate('2026-11-26');
    expect(f.quota.endgame).toBe(1);
    expect(f.quota.repertoire).toBe(1);
    expect(f.quota.blunder).toBe(0);
    expect(f.blocks.map(b => [b.block, b.minutes, b.label])).toEqual([
      ['endgame', 20, 'Finales de torres'],
      ['repertoire', 25, 'Planes R2 y R6'],
      ['concept', 10, 'Guía 7 · convertir la ventaja'],
    ]);
  });

  it('keeps 28/11 as the 11:00 simulation', () => {
    const day = programForDate('2026-11-28');
    expect(plays('2026-11-28')).toHaveLength(1);
    expect(day.blocks.map(b => b.block)).toEqual(['analysis', 'play']);
    expect(`${day.focus} ${day.blocks.map(b => b.label).join(' ')}`).toContain('11:00');
  });

  it('plans 8 long games between 10/11 and 4/12, plus the Final rounds after that', () => {
    let total = 0;
    const perDay: Record<string, number> = {};
    for (let d = 10; d <= 30; d += 1) {
      const key = `2026-11-${d}`;
      const n = plays(key).length;
      total += n;
      if (n) perDay[key] = n;
    }
    for (let d = 1; d <= 8; d += 1) {
      const key = `2026-12-0${d}`;
      const n = plays(key).length;
      total += n;
      if (n) perDay[key] = n;
    }
    expect(perDay).toEqual({
      '2026-11-14': 1,
      '2026-11-21': 2,
      '2026-11-22': 2,
      '2026-11-23': 2,
      '2026-11-28': 1,
      '2026-12-05': 1,
      '2026-12-06': 3,
      '2026-12-07': 1,
      '2026-12-08': 2,
    });
    expect(total).toBe(15);
  });
});

describe('payload consistency', () => {
  const mondayOf = (key: string) => Object.keys(payload.weeklyPlans).filter(w => w <= key).sort().pop()!;
  const notes = payload.dailyNotes as Record<string, string>;
  const weekly = payload.weeklyPlans as Record<string, Record<string, unknown>>;

  it.each(Object.keys(payload.days))('%s: note, weekly plan and minutes agree', key => {
    const day = (payload.days as Record<string, { note: string; minutes: number; activities: { minutes: number }[] }>)[key];
    expect(notes[key]).toBe(day.note);
    expect(weekly[mondayOf(key)][key]).toEqual(day.activities);
    expect(day.activities.reduce((s, a) => s + a.minutes, 0)).toBe(day.minutes);
  });

  it('does not ship a forbidden third-party name in the payload', () => {
    expect(JSON.stringify(payload)).not.toMatch(/(?<![A-Za-z])Toto(?![A-Za-z])/i);
  });
});

describe('programForDate outside the window', () => {
  it.each(['2026-11-09', '2026-12-09', '2026-10-14'])('%s is the base weekday program', key => {
    expect(programForDate(key)).toBe(programForWeekday(weekdayIndex(key)));
  });
});

describe('a week straddling the window edge', () => {
  it('shows the plan through 8 Dec, the base program from 9 Dec', () => {
    const week = ['2026-12-07', '2026-12-08', '2026-12-09', '2026-12-10'];
    const inPlan = week.map(k => programForDate(k) !== programForWeekday(weekdayIndex(k)));
    expect(inPlan).toEqual([true, true, false, false]);
  });

  it('keeps the whole 30/11–6/12 week inside the plan', () => {
    const week = ['2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05', '2026-12-06'];
    const inPlan = week.map(k => programForDate(k) !== programForWeekday(weekdayIndex(k)));
    expect(inPlan).toEqual([true, true, true, true, true, true, true]);
  });

  it('starts mid-week at the opening edge', () => {
    const week = ['2026-11-09', '2026-11-10'];
    expect(programForDate(week[0])).toBe(programForWeekday(0));
    expect(programForDate(week[1]).focus).toContain('T · Táctica y cálculo');
  });
});

describe('martes fijos', () => {
  const LESSONS = [
    { block: 'lesson', minutes: 60, label: 'Clase (19:00 a 20:00 ART)' },
    { block: 'lesson', minutes: 60, label: 'Clase de cálculo con Juan Cruz (22:00 a 23:00 ART)' },
  ];
  const DRILLS = { block: 'calculation', minutes: 10, label: 'Cola de drills (antes de las 19)' };
  const EXPECTED: Record<string, { block: string; minutes: number; label: string }[]> = {
    '2026-11-10': [DRILLS, ...LESSONS],
    '2026-11-17': [
      DRILLS,
      { block: 'endgame', minutes: 20, label: 'Torre y 4 contra 3 (blancas)' },
      { block: 'repertoire', minutes: 20, label: 'Cap. 28 (1...c5) o cap. 05' },
      { block: 'repertoire', minutes: 10, label: 'Dominación de columnas' },
      ...LESSONS,
    ],
  };

  it.each(Object.keys(EXPECTED))('%s: blocks in order', key => {
    const day = programForDate(key);
    expect(day.blocks.map(b => ({ block: b.block, minutes: b.minutes, label: b.label }))).toEqual(EXPECTED[key]);
    expect(day.isTrainingDay).toBe(true);
    expect(day.quota.blunder).toBe(10);
    expect(day.focus).toContain('Martes fijos');
    expect(day.blocks.some(b => /Cálculo con papel|Sesión grupal/.test(b.label))).toBe(false);
  });

  it('leaves every pre-cutover non-Tuesday day of the payload untouched', () => {
    const before = {"2026-11-11":[["final-4v3",20],["cap-04",20],["dominacion",10]],"2026-11-12":[["posiciones-otb",50]],"2026-11-13":[["drills",10],["calculo-papel",45]],"2026-11-14":[["partida-larga",60]],"2026-11-15":[["analisis",30],["final-4v3",20]],"2026-11-16":[["drills",10],["calculo-papel",45]],"2026-11-18":[["posiciones-otb",50]],"2026-11-19":[["drills",10],["calculo-papel",45]],"2026-11-20":[["final-4v3",15],["repaso-caps",15]],"2026-11-21":[["torneo-r1",240],["torneo-r2",240]],"2026-11-22":[["torneo-r3",240],["torneo-r4",240]],"2026-11-23":[["torneo-r5",240],["torneo-r6",240]]} as Record<string, [string, number][]>;
    const days = payload.days as Record<string, { activities: { id: string; minutes: number }[] }>;
    const others = Object.keys(days).filter(k => k < '2026-11-24' && !(k in EXPECTED));
    expect(others.sort()).toEqual(Object.keys(before).sort());
    for (const k of others) expect(days[k].activities.map(a => [a.id, a.minutes])).toEqual(before[k]);
  });

  it('does not leak the martes fijos sentence into other days focus', () => {
    for (const k of Object.keys(payload.days)) {
      if (!(k in EXPECTED)) expect(programForDate(k).focus).not.toContain('Martes fijos');
    }
  });
});

describe('ajuste 24/11–8/12', () => {
  const blocksOf = (key: string) =>
    programForDate(key).blocks.map(b => ({ block: b.block, minutes: b.minutes, label: b.label }));

  it('24/11 shows the adjusted payload, not the old 6-game analysis', () => {
    const day = programForDate('2026-11-24');
    expect(blocksOf('2026-11-24')).toEqual([
      { block: 'analysis', minutes: 30, label: 'Repaso de los 6 informes del Soberanía' },
      { block: 'calculation', minutes: 10, label: '10 drills antes de las 19' },
    ]);
    expect(day.focus).toContain('repaso de los 6 informes');
    expect(day.focus).toContain('Clase 19:00 a 20:30 ART');
    expect(day.focus).not.toContain('Romano');
    expect(day.blocks.some(b => b.block === 'lesson')).toBe(false);
  });

  it('8/12 shows the Final R6 and R7 from the payload', () => {
    const day = programForDate('2026-12-08');
    expect(blocksOf('2026-12-08')).toEqual([
      { block: 'play', minutes: 0, label: 'R6 · 10:00 ART' },
      { block: 'play', minutes: 0, label: 'R7 · 14:00 ART' },
    ]);
    expect(day.focus).toContain('R6 a las 10:00 ART');
    expect(day.focus).toContain('R7 a las 14:00 ART');
    expect(day.focus).toContain('chocan con La Plata');
    expect(day).not.toEqual(programForWeekday(weekdayIndex('2026-12-08')));
  });

  it('20/11 stays as it was before the adjustment', () => {
    const day = programForDate('2026-11-20');
    expect(blocksOf('2026-11-20')).toEqual([
      { block: 'endgame', minutes: 15, label: 'Torre y 4 contra 3 (negras a empatar)' },
      { block: 'repertoire', minutes: 15, label: 'Primeras jugadas · caps. 01, 05 y 09' },
    ]);
    expect(day.focus).toContain('Inscripción al torneo confirmada');
    expect(plannedMinutes(day)).toBe(30);
  });
});
