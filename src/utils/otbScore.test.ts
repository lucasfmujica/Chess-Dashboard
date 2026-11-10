import { describe, it, expect } from 'vitest';
import { scoreByRound, scoreByGameOfDay } from './otbScore';
import type { Game } from '../types/chess';

const game = (over: Partial<Game>): Game => ({
  elo: 1700,
  color: 'W',
  result: 'W',
  opp: 'Rival',
  opp_elo: 1700,
  eco: 'B30',
  tournament: 'Open A',
  rated: true,
  source: 'otb',
  ...over,
});

describe('scoreByRound', () => {
  const games = [
    game({ round: '2', result: 'D', opp: 'B', date: '2026-10-11' }),
    game({ round: '1', result: 'W', opp: 'A', date: '2026-10-10' }),
    game({ round: '10', result: 'L', opp: 'J', date: '2026-10-20' }),
    game({ round: '3', result: 'W', opp: 'C', date: '2026-10-12' }),
    game({ tournament: 'Open B', round: '1', result: 'D', date: '2026-11-01' }),
  ];

  it('orders rounds numerically and accumulates the tournament score', () => {
    const rows = scoreByRound(games).filter(r => r.tournament === 'Open A');
    expect(rows.map(r => r.round)).toEqual(['1', '2', '3', '10']);
    expect(rows.map(r => r.total)).toEqual([1, 1.5, 2.5, 2.5]);
  });

  it('keeps tournaments apart, earliest first', () => {
    const rows = scoreByRound(games);
    expect(rows.map(r => r.tournament)).toEqual(['Open A', 'Open A', 'Open A', 'Open A', 'Open B']);
    expect(rows[4]).toMatchObject({ round: '1', points: 0.5, total: 0.5 });
  });

  it('ignores online games and games without a round', () => {
    const rows = scoreByRound([
      game({ round: '1', source: 'lichess' }),
      game({ round: '1', source: 'chesscom' }),
      game({ round: undefined }),
    ]);
    expect(rows).toEqual([]);
  });
});

describe('scoreByGameOfDay', () => {
  it('numbers the games of a day by time and accumulates W=1 D=0.5 L=0', () => {
    const rows = scoreByGameOfDay([
      game({ date: '2026-10-10', time: '16:00', result: 'D', opp: 'B' }),
      game({ date: '2026-10-10', time: '10:00', result: 'W', opp: 'A' }),
      game({ date: '2026-10-10', time: '20:00', result: 'L', opp: 'C' }),
      game({ date: '2026-10-11', time: '10:00', result: 'W', opp: 'D' }),
    ]);
    expect(rows.map(r => [r.date, r.gameNo, r.opp, r.total])).toEqual([
      ['2026-10-10', 1, 'A', 1],
      ['2026-10-10', 2, 'B', 1.5],
      ['2026-10-10', 3, 'C', 1.5],
      ['2026-10-11', 1, 'D', 1],
    ]);
  });

  it('breaks time ties by round and skips online games', () => {
    const rows = scoreByGameOfDay([
      game({ date: '2026-10-10', time: '00:00', round: '2', opp: 'second' }),
      game({ date: '2026-10-10', time: '00:00', round: '1', opp: 'first' }),
      game({ date: '2026-10-10', source: 'lichess', opp: 'online' }),
    ]);
    expect(rows.map(r => r.opp)).toEqual(['first', 'second']);
  });
});
