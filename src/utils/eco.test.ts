import { describe, it, expect } from 'vitest';
import { hasEco, UNKNOWN_ECO } from './eco';

describe('hasEco', () => {
  it('accepts a real code', () => {
    expect(hasEco('A15')).toBe(true);
  });

  it('rejects the import placeholder', () => {
    expect(hasEco(UNKNOWN_ECO)).toBe(false);
  });

  it('rejects missing and empty codes', () => {
    expect(hasEco(undefined)).toBe(false);
    expect(hasEco(null)).toBe(false);
    expect(hasEco('')).toBe(false);
  });
});
