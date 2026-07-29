import { describe, it, expect } from 'vitest';
import {
  buildRepertoireMatches,
  changedRepertoireMatches,
  type LinkedGame,
  type MatchableGame,
} from './repertoireMatchRun';
import type { RepertoireLine } from '../types/chess';

const line = (id: string, color: 'W' | 'B', movesSan: string): RepertoireLine =>
  ({ id, color, movesSan }) as RepertoireLine;

const rossolimo = line('rossolimo', 'B', '1.e4 c5 2.Nf3 Nc6 3.Bb5 g6 4.Bxc6 dxc6 5.d3 Bg7');
const benoni = line('benoni', 'B', '1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 exd5 5.cxd5 d6');

const game = (over: Partial<MatchableGame>): MatchableGame => ({
  id: 'g1',
  color: 'B',
  pgn: '1. e4 c5 2. Nf3 Nc6 3. Bb5 g6 4. Bxc6 dxc6 5. O-O',
  ...over,
});

describe('buildRepertoireMatches', () => {
  it('links a game to the deepest matching line and reports the exit ply', () => {
    const { matches, considered, matched, skipped } = buildRepertoireMatches(
      [game({})],
      [benoni, rossolimo]
    );
    expect(matches).toEqual([{ id: 'g1', repertoireLineId: 'rossolimo', bookExitPly: 8 }]);
    expect({ considered, matched, skipped }).toEqual({ considered: 1, matched: 1, skipped: 0 });
  });

  it('parses a full PGN with headers and clock comments', () => {
    const pgn = [
      '[Event "Copa Cultura AFA XX"]',
      '[White "Rival"]',
      '[Black "Yo"]',
      '[Result "0-1"]',
      '',
      '1. e4 { [%clk 0:12:00] } c5 2. Nf3 Nc6 3. Bb5 g6 4. Bxc6 dxc6 5. d3 Bg7 0-1',
    ].join('\n');
    const { matches } = buildRepertoireMatches([game({ pgn })], [rossolimo]);
    expect(matches[0]).toEqual({ id: 'g1', repertoireLineId: 'rossolimo', bookExitPly: 10 });
  });

  it('emits explicit nulls so a stale link gets cleared by the bulk PATCH', () => {
    // Was played as White, so the Black-only lines must not claim it.
    const { matches, matched } = buildRepertoireMatches(
      [game({ color: 'W' })],
      [benoni, rossolimo]
    );
    expect(matches).toEqual([{ id: 'g1', repertoireLineId: null, bookExitPly: null }]);
    expect(matched).toBe(0);
  });

  it('skips games with no id or no movetext rather than dropping them silently', () => {
    const summary = buildRepertoireMatches(
      [game({}), game({ id: undefined }), game({ id: 'g3', pgn: undefined })],
      [rossolimo]
    );
    expect(summary.matches).toHaveLength(1);
    expect(summary.considered).toBe(1);
    expect(summary.skipped).toBe(2);
  });

  it('handles an empty repertoire without throwing', () => {
    const { matches, matched } = buildRepertoireMatches([game({})], []);
    expect(matches).toEqual([{ id: 'g1', repertoireLineId: null, bookExitPly: null }]);
    expect(matched).toBe(0);
  });
});

describe('changedRepertoireMatches', () => {
  const linked = (over: Partial<LinkedGame>): LinkedGame => ({ ...game({}), ...over });

  it('sends nothing when every game already carries its match', () => {
    const already = linked({ repertoireLineId: 'rossolimo', bookExitPly: 8 });
    expect(changedRepertoireMatches([already], [rossolimo]).matches).toEqual([]);
  });

  it('sends a newly imported game that has no link yet', () => {
    const fresh = linked({ id: 'new', repertoireLineId: undefined, bookExitPly: undefined });
    expect(changedRepertoireMatches([fresh], [rossolimo]).matches).toEqual([
      { id: 'new', repertoireLineId: 'rossolimo', bookExitPly: 8 },
    ]);
  });

  it('leaves an already-declined game alone instead of rewriting nulls', () => {
    // The steady state after the backfill: 255 games matched nothing and were
    // written as NULL. They must not be re-sent on every single import.
    const declined = linked({ color: 'W', repertoireLineId: undefined, bookExitPly: undefined });
    expect(changedRepertoireMatches([declined], [rossolimo]).matches).toEqual([]);
  });

  it('clears a stale link when the line no longer matches', () => {
    const stale = linked({ repertoireLineId: 'benoni', bookExitPly: 6 });
    expect(changedRepertoireMatches([stale], [benoni]).matches).toEqual([
      { id: 'g1', repertoireLineId: null, bookExitPly: null },
    ]);
  });

  it('re-sends a game whose exit ply moved after the line was extended', () => {
    const shallower = linked({ repertoireLineId: 'rossolimo', bookExitPly: 6 });
    expect(changedRepertoireMatches([shallower], [rossolimo]).matches).toEqual([
      { id: 'g1', repertoireLineId: 'rossolimo', bookExitPly: 8 },
    ]);
  });
});
