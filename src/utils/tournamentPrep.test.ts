import { describe, it, expect } from 'vitest';
import {
  buildPrepPlan,
  ecoPerformance,
  NEW_LINE_FREEZE_DAYS,
  MIN_ECO_GAMES,
} from './tournamentPrep';
import type { Game, RepertoireLine, Tournament } from '../types/chess';

const DAY = 86_400_000;
// Fixed clock so the weekday-budget lookup is deterministic.
const TODAY = new Date(2026, 6, 29); // Wednesday 2026-07-29

const tournament = (startDate?: string): Tournament =>
  ({ id: 't1', name: 'Copa Cultura AFA XXI', startDate, kind: 'individual', affectsElo: true, createdAt: 0 }) as Tournament;

const line = (over: Partial<RepertoireLine>): RepertoireLine =>
  ({ id: 'l', color: 'B', createdAt: 0, reviewCount: 0, ...over }) as RepertoireLine;

const game = (eco: string, result: 'W' | 'D' | 'L'): Game => ({ eco, result, source: 'otb' }) as Game;
const online = (eco: string, result: 'W' | 'D' | 'L'): Game =>
  ({ eco, result, source: 'lichess' }) as Game;

describe('ecoPerformance', () => {
  it('ranks frequent and badly-scoring ECOs first', () => {
    const games = [
      ...Array<Game>(6).fill(game('A20', 'L')),
      ...Array<Game>(6).fill(game('B35', 'W')),
    ];
    const ranked = ecoPerformance(games);
    expect(ranked.map(e => e.eco)).toEqual(['A20', 'B35']);
    expect(ranked[0]).toMatchObject({ games: 6, score: 0 });
  });

  it("drops 'Unknown' rather than treating it as an opening", () => {
    // 24 crosstable-imported games really do carry eco 'Unknown'; bucketing
    // them would invent the largest ECO in the set.
    const games = [...Array<Game>(10).fill(game('Unknown', 'L')), ...Array<Game>(3).fill(game('A20', 'W'))];
    expect(ecoPerformance(games).map(e => e.eco)).toEqual(['A20']);
  });

  it('ignores ECOs below the sample floor', () => {
    const games = Array<Game>(MIN_ECO_GAMES - 1).fill(game('C50', 'L'));
    expect(ecoPerformance(games)).toEqual([]);
  });
});

describe('buildPrepPlan', () => {
  it('returns null for a tournament with no start date', () => {
    expect(buildPrepPlan(tournament(undefined), [], [], TODAY)).toBeNull();
  });

  it('counts the days between today and the start', () => {
    const plan = buildPrepPlan(tournament('2026-08-08'), [], [], TODAY);
    expect(plan?.daysAvailable).toBe(10);
    expect(plan?.days).toHaveLength(10);
  });

  it('has no days to plan once the tournament starts today', () => {
    const plan = buildPrepPlan(tournament('2026-07-29'), [line({ id: 'a' })], [], TODAY);
    expect(plan?.daysAvailable).toBe(0);
    expect(plan?.days).toEqual([]);
    // The line is still due, it just has nowhere to go — reported, not lost.
    expect(plan?.overflow.map(l => l.id)).toEqual(['a']);
  });

  it('orders by priority before anything else', () => {
    const lines = [line({ id: 'low', priority: 7 }), line({ id: 'high', priority: 1 })];
    const plan = buildPrepPlan(tournament('2026-08-20'), lines, [], TODAY);
    const scheduled = plan!.days.flatMap(d => d.lines.map(l => l.id));
    expect(scheduled.indexOf('high')).toBeLessThan(scheduled.indexOf('low'));
  });

  it('breaks priority ties with the ECO cross', () => {
    const games = [
      ...Array<Game>(8).fill(game('A20', 'L')),
      ...Array<Game>(8).fill(game('B35', 'W')),
    ];
    const lines = [
      line({ id: 'winning-eco', priority: 2, eco: 'B35' }),
      line({ id: 'costly-eco', priority: 2, eco: 'A20' }),
    ];
    const plan = buildPrepPlan(tournament('2026-08-20'), lines, games, TODAY);
    const scheduled = plan!.days.flatMap(d => d.lines.map(l => l.id));
    expect(scheduled.indexOf('costly-eco')).toBeLessThan(scheduled.indexOf('winning-eco'));
  });

  it('excludes lines that are not due', () => {
    const fresh = line({ id: 'fresh', confidence: 5, lastReviewed: TODAY.getTime() - DAY });
    const plan = buildPrepPlan(tournament('2026-08-20'), [fresh], [], TODAY);
    expect(plan!.days.flatMap(d => d.lines)).toEqual([]);
    expect(plan!.overflow).toEqual([]);
  });

  it('keeps never-drilled lines out of the freeze window and says so', () => {
    const neverDrilled = line({ id: 'new', priority: 1, reviewCount: 0 });
    const plan = buildPrepPlan(tournament('2026-07-31'), [neverDrilled], [], TODAY);
    // Two days out, entirely inside the freeze window.
    expect(plan!.daysAvailable).toBeLessThanOrEqual(NEW_LINE_FREEZE_DAYS);
    expect(plan!.days.every(d => d.frozen)).toBe(true);
    expect(plan!.days.flatMap(d => d.lines)).toEqual([]);
    expect(plan!.frozenOut.map(l => l.id)).toEqual(['new']);
  });

  it('still schedules already-drilled lines inside the freeze window', () => {
    const known = line({ id: 'known', priority: 1, reviewCount: 4 });
    const plan = buildPrepPlan(tournament('2026-07-31'), [known], [], TODAY);
    expect(plan!.days.flatMap(d => d.lines.map(l => l.id))).toEqual(['known']);
    expect(plan!.frozenOut).toEqual([]);
  });

  it('freezes only the tail of a longer run-up', () => {
    const plan = buildPrepPlan(tournament('2026-08-20'), [], [], TODAY);
    expect(plan!.days.filter(d => d.frozen)).toHaveLength(NEW_LINE_FREEZE_DAYS);
    expect(plan!.days.slice(-NEW_LINE_FREEZE_DAYS).every(d => d.frozen)).toBe(true);
  });

  it('schedules each line once and reports what did not fit', () => {
    const lines = Array.from({ length: 40 }, (_, i) =>
      line({ id: `l${i}`, priority: 1, reviewCount: 1 })
    );
    const plan = buildPrepPlan(tournament('2026-08-01'), lines, [], TODAY);
    const scheduled = plan!.days.flatMap(d => d.lines.map(l => l.id));
    expect(new Set(scheduled).size).toBe(scheduled.length);
    expect(scheduled.length + plan!.overflow.length + plan!.frozenOut.length).toBe(40);
  });

  it('admits when only priority separated the lines', () => {
    // Today's real data: every line at confidence 2, never reviewed.
    const flat = [1, 2, 3].map(p => line({ id: `p${p}`, priority: p, confidence: 2 }));
    const plan = buildPrepPlan(tournament('2026-08-20'), flat, [], TODAY);
    expect(plan!.ranked).toEqual({ priority: true, srs: false, eco: false });
  });

  it('reports the SRS as discriminating once the lines actually differ', () => {
    const mixed = [
      line({ id: 'a', confidence: 1 }),
      line({ id: 'b', confidence: 3, lastReviewed: TODAY.getTime() - 40 * DAY }),
    ];
    const plan = buildPrepPlan(tournament('2026-08-20'), mixed, [], TODAY);
    expect(plan!.ranked.srs).toBe(true);
  });

  it('counts the games the ECO cross had to ignore', () => {
    const games = [game('Unknown', 'W'), game('Unknown', 'L'), game('A20', 'W')];
    const plan = buildPrepPlan(tournament('2026-08-20'), [], games, TODAY)!;
    expect(plan.gamesWithoutEco).toBe(2);
    expect(plan.ecoGamesConsidered).toBe(1);
  });

  it('crosses ECOs over OTB games only', () => {
    // Online games outnumber OTB roughly five to one, so leaving them in
    // would let a blitz habit pick the chapters to study for a classical event.
    const games = [
      ...Array<Game>(20).fill(online('C50', 'L')),
      ...Array<Game>(4).fill(game('A20', 'W')),
    ];
    const plan = buildPrepPlan(tournament('2026-08-20'), [], games, TODAY)!;
    expect(plan.ecoFocus.map(e => e.eco)).toEqual(['A20']);
    expect(plan.ecoGamesConsidered).toBe(4);
  });

  it('counts a game with no recorded source as OTB', () => {
    // `source` defaults to 'otb' in the database, and older rows predate it.
    const games = Array<Game>(3).fill({ eco: 'A20', result: 'W' } as Game);
    expect(buildPrepPlan(tournament('2026-08-20'), [], games, TODAY)!.ecoGamesConsidered).toBe(3);
  });

  it('ignores online games when counting those without an ECO', () => {
    const games = [online('Unknown', 'W'), game('Unknown', 'L')];
    expect(buildPrepPlan(tournament('2026-08-20'), [], games, TODAY)!.gamesWithoutEco).toBe(1);
  });
});
