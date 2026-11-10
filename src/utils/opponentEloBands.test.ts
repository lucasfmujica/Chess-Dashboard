import { describe, it, expect } from 'vitest';
import { groupByOpponentElo, summarizeBracket } from './opponentEloBands';
import type { Game } from '../types/chess';

const game = (overrides: Partial<Game> = {}): Game => ({
  elo: 1800,
  color: 'W',
  result: 'W',
  opp: 'Rival',
  opp_elo: 1800,
  eco: 'B30',
  tournament: 'Test',
  rated: true,
  ...overrides,
});

describe('summarizeBracket', () => {
  it('returns zeros for an empty list', () => {
    const s = summarizeBracket([]);
    expect(s.games).toBe(0);
    expect(s.scorePercentage).toBe(0);
    expect(s.expectedPercentage).toBe(0);
    expect(s.performance).toBe(0);
  });

  it('counts results and computes the per-game expected score with the own ELO of each game', () => {
    const games = [
      game({ elo: 1800, opp_elo: 1800, result: 'W' }), // expected 0.5
      game({ elo: 1600, opp_elo: 2000, result: 'D' }), // expected 1/(1+10^1) ≈ 0.0909
    ];
    const s = summarizeBracket(games);
    expect(s).toMatchObject({ games: 2, wins: 1, draws: 1, losses: 0, score: '1.5' });
    expect(s.scorePercentage).toBe(75);
    expect(s.expectedPercentage).toBe(29.5); // (0.5 + 0.0909) / 2 = 29.5%
    expect(s.performance).toBe(45.5);
    expect(s.avgEloDiff).toBe(200);
  });
});

describe('groupByOpponentElo', () => {
  it('assigns games to absolute bands with inclusive edges', () => {
    const games = [
      game({ opp_elo: 1599 }),
      game({ opp_elo: 1600 }),
      game({ opp_elo: 1799 }),
      game({ opp_elo: 1800 }),
      game({ opp_elo: 1999 }),
      game({ opp_elo: 2000 }),
      game({ opp_elo: 2450 }),
    ];
    const { bands, excluded } = groupByOpponentElo(games);
    expect(bands.map(b => b.label)).toEqual(['Menos de 1600', '1600–1799', '1800–1999', '2000 o más']);
    expect(bands.map(b => b.games)).toEqual([1, 2, 2, 2]);
    expect(excluded).toBe(0);
  });

  it('excludes games without opponent ELO and counts them', () => {
    const games = [
      game({ opp_elo: 0 }),
      game({ opp_elo: null as unknown as number }),
      game({ opp_elo: undefined as unknown as number }),
      game({ opp_elo: 1700, result: 'L' }),
    ];
    const { bands, excluded } = groupByOpponentElo(games);
    expect(excluded).toBe(3);
    expect(bands.reduce((s, b) => s + b.games, 0)).toBe(1);
    expect(bands[1]).toMatchObject({ games: 1, losses: 1, scorePercentage: 0 });
  });

  it('uses each game own ELO for the expected score, not a fixed rating', () => {
    const { bands } = groupByOpponentElo([
      game({ elo: 1500, opp_elo: 1900 }), // expected ≈ 0.0909
      game({ elo: 2300, opp_elo: 1900 }), // expected ≈ 0.9091
    ]);
    expect(bands[2].games).toBe(2);
    expect(bands[2].expectedPercentage).toBe(50);
  });
});
