import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGameStats } from './useGameStats';
import type { Game } from '../types/chess';

const game = (tournament: string, date: string, elo = 1651): Game => ({
  elo,
  color: 'W',
  result: 'W',
  opp: 'Rival',
  opp_elo: 1800,
  eco: 'B30',
  tournament,
  rated: true,
  date,
});

describe('useGameStats tournamentStats', () => {
  it('starts an unlisted tournament where the previous one ended, not at the first rating', () => {
    const games = [
      game('Abierto Madryn', '2025-01-10'),
      game('Copa Cultura por equipos', '2025-02-10'),
      game('IRT Carnaval', '2025-03-10'),
      game('67° Torneo por equipos', '2025-04-10'),
      game('Copa por equipos 2', '2025-05-10'),
    ];
    const { result } = renderHook(() => useGameStats(games));
    const byName = Object.fromEntries(result.current.tournamentStats.map(t => [t.name, t]));

    expect(byName['Abierto Madryn'].eloBefore).toBe(1848);
    expect(byName['Copa Cultura por equipos'].eloBefore).toBe(1889);
    expect(byName['Copa Cultura por equipos'].eloAfter).toBe(1889);
    expect(byName['IRT Carnaval'].eloBefore).toBe(1880);
    expect(byName['67° Torneo por equipos'].eloBefore).toBe(1878);
    expect(byName['Copa por equipos 2'].eloBefore).toBe(1878);
  });

  it('falls back to the games own rating when no earlier tournament exists', () => {
    const { result } = renderHook(() => useGameStats([game('Primer torneo', '2024-01-01', 1700)]));
    expect(result.current.tournamentStats[0].eloBefore).toBe(1700);
  });
});
