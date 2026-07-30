import { describe, it, expect } from 'vitest';
import { samePlayer, nameTokens } from './playerNames';

describe('nameTokens', () => {
  it('is order- and punctuation-independent', () => {
    expect(nameTokens('Medina, Exequiel').sort()).toEqual(nameTokens('Exequiel Medina').sort());
  });

  it('strips accents', () => {
    expect(nameTokens('Martínez')).toEqual(['martinez']);
  });
});

describe('samePlayer', () => {
  it('matches the same name written in either order', () => {
    expect(samePlayer('Prieto, Marcelo', 'Marcelo Prieto')).toBe(true);
  });

  it('matches when a middle name was dropped', () => {
    // Every one of these is a real pair from this project's data: chess-results
    // publishes the full name, the stored game has the short one.
    expect(samePlayer('Medina, Exequiel Alexis', 'Exequiel Medina')).toBe(true);
    expect(samePlayer('Castillo Gonzalez, Thomas', 'Thomas Castillo')).toBe(true);
    expect(samePlayer('Gil Chacon, Fernando Enrique', 'Fernando Gil Chacon')).toBe(true);
    expect(samePlayer('Rugiero, Pablo Anibal', 'Pablo Rugiero')).toBe(true);
  });

  it('ignores accent differences between sources', () => {
    expect(samePlayer('Meza Astrada, Agustin', 'Agustín Meza Astrada')).toBe(true);
  });

  it('does NOT match two players who only share a surname', () => {
    // Both played in IRT Carnaval, one token apart. A surname-only match here
    // would attach the wrong game's moves to the wrong opponent.
    expect(samePlayer('Borras, Jonathan', 'Borras, Anibal')).toBe(false);
  });

  it('does not match different people entirely', () => {
    expect(samePlayer('Dib, Nadir', 'Fournel, Bautista')).toBe(false);
  });

  it('matches a single-token alias against itself', () => {
    expect(samePlayer('Magnus_misr', 'magnus misr')).toBe(true);
  });

  it('is false for an empty name rather than matching everything', () => {
    expect(samePlayer('', 'Prieto, Marcelo')).toBe(false);
    expect(samePlayer('  ', '')).toBe(false);
  });
});
