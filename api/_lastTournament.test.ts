import { describe, it, expect } from 'vitest';
import { pickLastTournament, type TournamentEloRow } from './_lastTournament';

const row = (over: Partial<TournamentEloRow> & { name: string; date: string }): TournamentEloRow => ({
  affectsElo: true,
  eloChange: null,
  gamesChange: null,
  ...over,
});

describe('pickLastTournament', () => {
  it('picks the most recent rating-affecting event', () => {
    const rows = [
      row({ name: 'Abierto Lago Puelo', date: '2025-11-11', eloChange: -27.8 }),
      row({ name: 'IRT Carnaval', date: '2026-02-15', eloChange: -1.6 }),
      row({ name: 'IRT Soberanía Nacional', date: '2025-11-22', eloChange: 19 }),
    ];
    expect(pickLastTournament(rows)).toEqual({ name: 'IRT Carnaval', eloChange: -2 });
  });

  it('ignores later team events, which move the rapid rating instead', () => {
    // Today's data: two team events sit after the last rated one and both
    // record a change, so a naive "latest row" would report +1.
    const rows = [
      row({ name: 'IRT Carnaval', date: '2026-02-15', eloChange: -1.6 }),
      row({ name: 'Necochea 2026', date: '2026-03-15', eloChange: 19.8, affectsElo: false }),
      row({ name: 'Copa Cultura AFA XX', date: '2026-07-26', eloChange: 1.4, affectsElo: false }),
    ];
    expect(pickLastTournament(rows)).toEqual({ name: 'IRT Carnaval', eloChange: -2 });
  });

  it('falls back to the summed per-game changes when the official figure is missing', () => {
    const rows = [row({ name: 'Masters Ciudad', date: '2025-07-18', gamesChange: 72 })];
    expect(pickLastTournament(rows)).toEqual({ name: 'Masters Ciudad', eloChange: 72 });
  });

  it('names the event even with no change recorded anywhere', () => {
    const rows = [row({ name: 'Club Zugzwang', date: '2025-02-26' })];
    expect(pickLastTournament(rows)).toEqual({ name: 'Club Zugzwang', eloChange: null });
  });

  it('returns null when nothing is dated or nothing is rated', () => {
    expect(pickLastTournament([])).toBeNull();
    expect(pickLastTournament([row({ name: 'Undated', date: null as unknown as string })])).toBeNull();
    expect(pickLastTournament([row({ name: 'Team', date: '2026-07-26', affectsElo: false })])).toBeNull();
  });
});
