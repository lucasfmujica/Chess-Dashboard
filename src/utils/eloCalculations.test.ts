import { describe, it, expect } from 'vitest';
import {
  calculateExpectedScore,
  getActualScore,
  calculatePerformanceRating,
  calculateGameStats,
  getAverageOpponentElo,
  getEloRatingBracket,
} from './eloCalculations';
import type { Game } from '../types/chess';

const game = (overrides: Partial<Game> = {}): Game => ({
  elo: 1800,
  color: 'W',
  result: 'W',
  opp: 'Opponent',
  opp_elo: 1800,
  eco: 'B30',
  tournament: 'Test',
  rated: true,
  ...overrides,
});

describe('calculateExpectedScore', () => {
  it('returns 0.5 for equal ratings', () => {
    expect(calculateExpectedScore(1800, 1800)).toBeCloseTo(0.5, 5);
  });

  it('returns 0.5 when the opponent is unrated (elo 0)', () => {
    expect(calculateExpectedScore(1800, 0)).toBe(0.5);
  });

  it('is below 0.5 against a stronger opponent and above 0.5 against a weaker one', () => {
    expect(calculateExpectedScore(1800, 2000)).toBeLessThan(0.5);
    expect(calculateExpectedScore(1800, 1600)).toBeGreaterThan(0.5);
  });
});

describe('getActualScore', () => {
  it('maps results to scores', () => {
    expect(getActualScore('W')).toBe(1);
    expect(getActualScore('D')).toBe(0.5);
    expect(getActualScore('L')).toBe(0);
  });
});

describe('calculatePerformanceRating', () => {
  it('returns 0 with no games or no rated opponents', () => {
    expect(calculatePerformanceRating(0, 5, 10)).toBe(0);
    expect(calculatePerformanceRating(1800, 0, 0)).toBe(0);
  });

  it('adds the performance multiplier for a perfect score', () => {
    expect(calculatePerformanceRating(1800, 5, 5)).toBe(2200);
  });

  it('subtracts the performance multiplier for a zero score', () => {
    expect(calculatePerformanceRating(1800, 0, 5)).toBe(1400);
  });

  it('equals the average opponent rating for a 50% score', () => {
    expect(calculatePerformanceRating(1800, 5, 10)).toBe(1800);
  });
});

describe('calculateGameStats', () => {
  it('counts results and computes win rate / score strings', () => {
    const games: Game[] = [
      game({ result: 'W' }),
      game({ result: 'W' }),
      game({ result: 'D' }),
      game({ result: 'L' }),
    ];
    const stats = calculateGameStats(games);
    expect(stats.wins).toBe(2);
    expect(stats.draws).toBe(1);
    expect(stats.losses).toBe(1);
    expect(stats.total).toBe(4);
    expect(stats.winRate).toBe('50.0');
    expect(stats.score).toBe('2.5/4');
  });

  it('does not divide by zero on an empty set', () => {
    const stats = calculateGameStats([]);
    expect(stats.winRate).toBe('0.0');
    expect(stats.avgOppElo).toBe(0);
    expect(stats.total).toBe(0);
  });
});

describe('getAverageOpponentElo', () => {
  it('ignores unrated opponents (elo 0)', () => {
    const games: Game[] = [
      game({ opp_elo: 1700 }),
      game({ opp_elo: 1900 }),
      game({ opp_elo: 0 }),
    ];
    expect(getAverageOpponentElo(games)).toBe(1800);
  });

  it('returns 0 when there are no rated opponents', () => {
    expect(getAverageOpponentElo([game({ opp_elo: 0 })])).toBe(0);
  });
});

describe('getEloRatingBracket', () => {
  it('classifies by rating difference', () => {
    expect(getEloRatingBracket(1800, 1600)).toBe('lower');
    expect(getEloRatingBracket(1800, 1850)).toBe('similar');
    expect(getEloRatingBracket(1800, 2000)).toBe('higher');
  });
});
