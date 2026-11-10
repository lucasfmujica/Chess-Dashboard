import { describe, it, expect } from 'vitest';
import { matchesSourceSpeed } from './useGameFilters';

describe('matchesSourceSpeed', () => {
  it('passes everything when both filters are all', () => {
    expect(matchesSourceSpeed(undefined, undefined, 'all', 'all')).toBe(true);
    expect(matchesSourceSpeed('lichess', 'blitz', 'all', 'all')).toBe(true);
  });

  it('reads a missing source as OTB', () => {
    expect(matchesSourceSpeed(undefined, undefined, 'otb', 'all')).toBe(true);
    expect(matchesSourceSpeed(undefined, undefined, 'lichess', 'all')).toBe(false);
  });

  it('treats online as every non-OTB source', () => {
    expect(matchesSourceSpeed('lichess', 'rapid', 'online', 'all')).toBe(true);
    expect(matchesSourceSpeed('otb', undefined, 'online', 'all')).toBe(false);
  });

  it('only an explicit speed filter excludes games without a speed', () => {
    expect(matchesSourceSpeed('otb', undefined, 'all', 'all')).toBe(true);
    expect(matchesSourceSpeed('otb', undefined, 'all', 'blitz')).toBe(false);
    expect(matchesSourceSpeed('lichess', 'blitz', 'all', 'blitz')).toBe(true);
    expect(matchesSourceSpeed('lichess', 'rapid', 'all', 'blitz')).toBe(false);
  });

  it('otb-unset matches only games with no time class', () => {
    expect(matchesSourceSpeed('otb', undefined, 'all', 'otb-unset')).toBe(true);
    expect(matchesSourceSpeed('lichess', 'blitz', 'all', 'otb-unset')).toBe(false);
  });
});
