import { describe, it, expect } from 'vitest';
import {
  parseStartList,
  normalizeName,
  matchOpponents,
  type PlayedOpponent,
} from './_chessResults';

/**
 * Shaped after a real chess-results start list: a layout/nav table first, the
 * player table second, group separator rows interleaved, and the class names
 * the site actually emits.
 */
const START_LIST_HTML = `
<html><body>
<table class="CRnav"><tr><td>Torneo</td></tr><tr><td>Copa Cultura AFA XXI</td></tr></table>
<table class="CRs1">
  <tr class="CRng1"><th>No.</th><th>Title</th><th>Name</th><th>FED</th><th>Rtg</th></tr>
  <tr class="CRg1"><td>1</td><td>FM</td><td>Quadri,Silvio</td><td>ARG</td><td>2210</td></tr>
  <tr class="CRg2"><td>2</td><td>&nbsp;</td><td>Paredes,&nbsp;Ezequiel</td><td>ARG</td><td>1954</td></tr>
  <tr class="CRg1"><td colspan="5"><b>Grupo B</b></td></tr>
  <tr class="CRg2"><td>3</td><td></td><td>Mart&#237;nez, Jos&#233;</td><td>ARG</td><td>1801</td></tr>
  <tr class="CRg1"><td>4</td><td></td><td>Borras, Anibal</td><td>ARG</td><td>0</td></tr>
</table>
</body></html>`;

describe('normalizeName', () => {
  it('makes both name orders equal', () => {
    expect(normalizeName('Paredes, Ezequiel')).toBe(normalizeName('Ezequiel Paredes'));
  });

  it('strips accents so the same person matches across sources', () => {
    expect(normalizeName('Martínez, José')).toBe(normalizeName('Jose Martinez'));
  });

  it('ignores punctuation and casing', () => {
    expect(normalizeName('O`Neill,  Sean')).toBe(normalizeName('sean o neill'));
  });

  it('keeps a single-token name rather than dropping it', () => {
    // Lichess handles are one token and still need to compare.
    expect(normalizeName('Magnus_misr')).toBe('magnus misr');
  });

  it('is empty for a name with no letters or digits', () => {
    expect(normalizeName('  --  ')).toBe('');
  });
});

describe('parseStartList', () => {
  const entries = parseStartList(START_LIST_HTML);

  it('skips the layout table and finds the one with a Name column', () => {
    expect(entries.map(e => e.name)).toEqual([
      'Quadri,Silvio',
      'Paredes, Ezequiel',
      'Martínez, José',
      'Borras, Anibal',
    ]);
  });

  it('reads the columns by header, not by position', () => {
    expect(entries[0]).toEqual({
      rank: 1,
      title: 'FM',
      name: 'Quadri,Silvio',
      rating: 2210,
      federation: 'ARG',
    });
  });

  it('drops the group separator row', () => {
    expect(entries.some(e => e.name.includes('Grupo'))).toBe(false);
  });

  it('omits an unrated rating rather than reporting 0', () => {
    expect(entries[3]).not.toHaveProperty('rating');
    expect(entries[1]).not.toHaveProperty('title');
  });

  it('decodes entities and collapses whitespace', () => {
    expect(entries[1].name).toBe('Paredes, Ezequiel');
    expect(entries[2].name).toBe('Martínez, José');
  });

  it('returns empty for HTML with no player table, instead of throwing', () => {
    expect(parseStartList('<html><body><p>Torneo no encontrado</p></body></html>')).toEqual([]);
    expect(parseStartList('')).toEqual([]);
  });

  it('recovers the title column when its header is blank', () => {
    // The real page ships this column with an empty header cell, which is why
    // every title was being dropped.
    const real = `<table>
      <tr><th>No.</th><th>&nbsp;</th><th></th><th>Nombre</th><th>FIDE-ID</th><th>Fed</th><th>Elo</th></tr>
      <tr><td>5</td><td></td><td>GM</td><td>Mareco, Sandro</td><td>112275</td><td>ARG</td><td>2580</td></tr>
      <tr><td>7</td><td></td><td></td><td>Sin titulo, Juan</td><td>999</td><td>ARG</td><td>1900</td></tr>
    </table>`;
    const rows = parseStartList(real);
    expect(rows[0]).toMatchObject({ rank: 5, title: 'GM', name: 'Mareco, Sandro', rating: 2580 });
    expect(rows[1]).not.toHaveProperty('title');
  });

  it('does not mistake a non-title column for the title column', () => {
    const noTitles = `<table>
      <tr><th>No.</th><th></th><th>Name</th><th>Rtg</th></tr>
      <tr><td>1</td><td>Club Zugzwang</td><td>Rueda, Joaquin</td><td>1888</td></tr>
    </table>`;
    expect(parseStartList(noTitles)[0]).not.toHaveProperty('title');
  });

  it('handles a Spanish-language table', () => {
    const spanish = `<table>
      <tr><th>Nr.</th><th>Nombre</th><th>Elo</th></tr>
      <tr><td>1</td><td>Rueda, Joaquin</td><td>1888</td></tr>
    </table>`;
    expect(parseStartList(spanish)).toEqual([{ rank: 1, name: 'Rueda, Joaquin', rating: 1888 }]);
  });
});

describe('matchOpponents', () => {
  const played: PlayedOpponent[] = [
    { opponent: 'Paredes, Ezequiel', games: 1, score: 0 },
    { opponent: 'Borras, Anibal', games: 2, score: 1.5 },
    { opponent: 'Duarte, Pablo', games: 1, score: 1 },
  ];

  it('returns only players actually faced, most-played first', () => {
    const matches = matchOpponents(parseStartList(START_LIST_HTML), played);
    expect(matches.map(m => m.entry.name)).toEqual(['Borras, Anibal', 'Paredes, Ezequiel']);
    expect(matches[0]).toMatchObject({ playedAs: 'Borras, Anibal', games: 2, score: 1.5 });
  });

  it('matches across name order', () => {
    const matches = matchOpponents([{ name: 'Ezequiel Paredes' }], played);
    expect(matches).toHaveLength(1);
    expect(matches[0].playedAs).toBe('Paredes, Ezequiel');
  });

  it('does not match on a shared surname alone', () => {
    // The head-to-head panel uses a substring and says so; proposing a
    // scouting target for a namesake would be worse than proposing nothing.
    expect(matchOpponents([{ name: 'Paredes, Marcos' }], played)).toEqual([]);
  });

  it('collapses two spellings of one opponent into a single head-to-head', () => {
    const duplicated: PlayedOpponent[] = [
      { opponent: 'Borras, Anibal', games: 2, score: 1.5 },
      { opponent: 'Anibal Borras', games: 1, score: 1 },
    ];
    const matches = matchOpponents([{ name: 'Borras, Anibal' }], duplicated);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ games: 3, score: 2.5 });
  });

  it('is empty when nothing overlaps', () => {
    expect(matchOpponents(parseStartList(START_LIST_HTML), [])).toEqual([]);
  });
});
