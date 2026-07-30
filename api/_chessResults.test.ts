import { describe, it, expect } from 'vitest';
import {
  parseStartList,
  normalizeName,
  matchOpponents,
  parsePlayerCard,
  normalizePlayerCardUrl,
  playerCardReconciles,
  parseGamePgn,
  toPgn,
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

/**
 * Shaped after a real player card (art=9). Three details are not decoration
 * and each one broke a first attempt at this parser:
 *  - the colour+result cell holds a *nested* table, which truncates any
 *    non-greedy <tr> match,
 *  - the summary's name label is buried at the tail of a cell that also holds
 *    the whole tournament blurb,
 *  - the round table publishes an extra Club/Ciudad column here, so cells have
 *    to be found by header rather than by position.
 */
const PLAYER_CARD_HTML = `
<html><body>
<table class="CRs1">
  <tr><td>Inscripciones 11 3585-9796 HORARIOS Ronda 1 Jueves 19:00 hs. Club Argentino - IRT Damian Reca Nombre</td><td>Mujica, Lucas</td></tr>
  <tr><td>Ranking inicial</td><td>17</td></tr>
  <tr><td>Elo</td><td>0</td></tr>
  <tr><td>Elo internacional</td><td>1651</td></tr>
  <tr><td>Performance</td><td>1777</td></tr>
  <tr><td>FIDE elo +/-</td><td>78,4</td></tr>
  <tr><td>Puntos</td><td>2,0</td></tr>
  <tr><td>Puesto</td><td>8</td></tr>
  <tr><td>C&#243;digo FIDE</td><td>20046847</td></tr>
</table>
<table class="CRs1">
  <tr class="CRg1b"><th>Rd.</th><th>M.</th><th>No.Ini.</th><th></th><th>Nombre</th><th>Elo</th><th>FED</th><th>Club/Ciudad</th><th>Pts.</th><th>Res.</th></tr>
  <tr class="CRg2 ARG"><td>1</td><td>4</td><td>4</td><td></td><td>Prieto, Marcelo</td><td>1902</td><td>ARG</td><td>CAV</td><td>3</td><td class="CR"><table><tr><td><div class="FarbewT"></div></td><td class="CR">1</td></tr></table></td></tr>
  <tr class="CRg1 ARG"><td>2</td><td>39</td><td>-2</td><td></td><td>sin emparejar</td><td>0</td><td></td><td></td><td>0</td><td>- &frac12;</td></tr>
  <tr class="CRg2 ARG"><td>3</td><td>1</td><td>7</td><td>NM</td><td>Medina, Exequiel</td><td>1858</td><td>ARG</td><td>CAV</td><td>3</td><td class="CR"><table><tr><td><div class="FarbesT"></div></td><td class="CR">&frac12;</td></tr></table></td></tr>
  <tr class="CRg1 ARG"><td>4</td><td>4</td><td>1</td><td></td><td>Rueda, Joaquin</td><td>0</td><td>ARG</td><td></td><td>6</td><td class="CR"><table><tr><td><div class="FarbesT"></div></td><td class="CR">0</td></tr></table></td></tr>
</table>
</body></html>`;

describe('normalizePlayerCardUrl', () => {
  it('pins the language, because every label the parser reads is translated', () => {
    // Real links have arrived as Swedish (lan=6) and Romanian (lan=27).
    const url = normalizePlayerCardUrl(
      'https://s3.chess-results.com/tnr1097123.aspx?lan=6&art=9&snr=17'
    );
    expect(url).toContain('lan=2');
    expect(url).not.toContain('lan=6');
  });

  it('forces the player-card view but keeps the player', () => {
    const url = normalizePlayerCardUrl(
      'https://s2.chess-results.com/tnr1258664.aspx?lan=2&art=1&snr=74'
    );
    expect(url).toContain('art=9');
    expect(url).toContain('snr=74');
  });
});

describe('parsePlayerCard', () => {
  const card = parsePlayerCard(PLAYER_CARD_HTML);

  it('reads the summary, taking the name from the tail of the blurb cell', () => {
    expect(card.name).toBe('Mujica, Lucas');
    expect(card.fideId).toBe('20046847');
    expect(card.startingRank).toBe(17);
    expect(card.performanceRating).toBe(1777);
    expect(card.place).toBe(8);
  });

  it('prefers the international rating over the national one', () => {
    // The bare "Elo" row reads 0 for most Argentine players.
    expect(card.eloBefore).toBe(1651);
  });

  it('reads comma decimals', () => {
    expect(card.eloChange).toBe(78.4);
    expect(card.points).toBe(2);
  });

  it('reads colour and result out of the nested sub-table', () => {
    // Left as fixed positions this returns null and the round looks unplayed.
    expect(card.rounds.map(r => r.color)).toEqual(['W', null, 'B', 'B']);
    expect(card.rounds.map(r => r.result)).toEqual(['W', null, 'D', 'L']);
  });

  it('locates cells by header, not position', () => {
    // This card publishes an extra Club/Ciudad column before Pts.
    expect(card.rounds[0].opponent).toBe('Prieto, Marcelo');
    expect(card.rounds[0].opponentElo).toBe(1902);
    expect(card.rounds[2].opponentTitle).toBe('NM');
  });

  it('gives an unrated opponent 0 rather than undefined', () => {
    expect(card.rounds[3].opponentElo).toBe(0);
  });

  it('marks a bye and keeps the points it awarded', () => {
    expect(card.rounds[1]).toMatchObject({ round: 2, bye: true, byePoints: 0.5 });
    expect(card.rounds.filter(r => !r.bye)).toHaveLength(3);
  });
});

describe('playerCardReconciles', () => {
  it('accepts a card whose rounds and byes add up to the official points', () => {
    // 1 (win) + 0.5 (bye) + 0.5 (draw) + 0 (loss) = 2
    expect(playerCardReconciles(parsePlayerCard(PLAYER_CARD_HTML))).toBe(true);
  });

  it('rejects a card whose rounds do not add up to its own summary', () => {
    // The failure mode worth catching: a layout change drops a round and the
    // half-parsed card still looks plausible on its own.
    const tampered = PLAYER_CARD_HTML.replace('<td>Puntos</td><td>2,0</td>', '<td>Puntos</td><td>4</td>');
    expect(playerCardReconciles(parsePlayerCard(tampered))).toBe(false);
  });

  it('rejects a card with no rounds at all', () => {
    expect(playerCardReconciles({ points: 0, rounds: [] })).toBe(false);
  });
});

/**
 * Shaped after a real game viewer page (art=36). It is a JavaScript board, not
 * a PGN download — there are no PGN tags anywhere on it — so the players, the
 * event and the date come from a title line, one anchor per move carries the
 * SAN, and the result sits in its own paragraph after the move list.
 */
const GAME_HTML = `
<html><body>
<div><p><center><a href="partiesuche.aspx?lan=1&amp;art=36&amp;id=5735435&fsize=64>64<a></center></p></div>
<p><b>Mujica, Lucas</b> (1651) - <b>Prieto, Marcelo</b> (1902)<br>Club Argentino - IRT Dami&#225;n Reca (CABA), 09.01.2025</p>
<p>
<a class="game0" href="javascript:c(1)" id="l1">1.c4</a>
<a class="game0" href="javascript:c(2)" id="l2">e5</a>
<a class="game0" href="javascript:c(3)" id="l3">2.g3</a>
<a class="game0" href="javascript:c(4)" id="l4">g6</a>
<a class="game0" href="javascript:c(5)" id="l5">3.Bg2</a>
<a class="game0" href="javascript:c(6)" id="l6">Bg7</a>
</p>
<p>1-0</p>
</body></html>`;

describe('parseGamePgn', () => {
  const game = parseGamePgn(GAME_HTML)!;

  it('reads both players and their ratings off the title line', () => {
    expect(game.white).toBe('Mujica, Lucas');
    expect(game.whiteElo).toBe(1651);
    expect(game.black).toBe('Prieto, Marcelo');
    expect(game.blackElo).toBe(1902);
  });

  it('splits the event from the trailing dd.mm.yyyy date', () => {
    expect(game.event).toBe('Club Argentino - IRT Damián Reca (CABA)');
    expect(game.date).toBe('2025-01-09');
  });

  it('reads the result from the paragraph after the moves', () => {
    expect(game.result).toBe('1-0');
  });

  it('joins the move anchors into SAN movetext', () => {
    expect(game.movetext).toBe('1.c4 e5 2.g3 g6 3.Bg2 Bg7');
  });

  it('returns null for a page with no moves', () => {
    expect(parseGamePgn('<html><body><p>Sin partidas</p></body></html>')).toBeNull();
  });
});

describe('toPgn', () => {
  it('builds a PGN with tags and a terminating result', () => {
    const pgn = toPgn(parseGamePgn(GAME_HTML)!);
    expect(pgn).toContain('[White "Mujica, Lucas"]');
    expect(pgn).toContain('[Result "1-0"]');
    expect(pgn).toContain('[Date "2025.01.09"]');
    // Movetext has to carry the result too, or strict parsers reject it.
    expect(pgn.trimEnd().endsWith('3.Bg2 Bg7 1-0')).toBe(true);
  });

  it('falls back to the caller-supplied result when the page has none', () => {
    // The stored game knows its result; a PGN with none still has to parse.
    const noResult = GAME_HTML.replace('<p>1-0</p>', '');
    expect(toPgn(parseGamePgn(noResult)!, '0-1')).toContain('[Result "0-1"]');
  });

  it('defaults to * rather than inventing a result', () => {
    const noResult = GAME_HTML.replace('<p>1-0</p>', '');
    expect(toPgn(parseGamePgn(noResult)!)).toContain('[Result "*"]');
  });
});

describe('parsePlayerCard game links', () => {
  it('keeps the viewer id, which stripping tags would have thrown away', () => {
    const withLink = PLAYER_CARD_HTML.replace(
      '<td>3</td><td class="CR"><table><tr><td><div class="FarbewT"></div></td><td class="CR">1</td></tr></table></td></tr>',
      '<td>3</td><td class="CR"><table><tr><td><div class="FarbewT"></div></td><td class="CR">1</td></tr></table></td><td class="CR"><a Class="CRlink" href="PartieSuche.aspx?art=36&amp;id=5735435">PGN</a></td></tr>'
    );
    const card = parsePlayerCard(withLink);
    expect(card.rounds[0].pgnId).toBe('5735435');
  });

  it('leaves pgnId unset for an event that published no moves', () => {
    const card = parsePlayerCard(PLAYER_CARD_HTML);
    expect(card.rounds.every(r => r.pgnId === undefined)).toBe(true);
  });
});
