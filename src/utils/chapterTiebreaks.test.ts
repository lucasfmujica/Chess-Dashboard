import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import {
  CHAPTER_TIEBREAKS,
  FIANCHETTO_29_30_TARGET,
  classifyGame,
  tiebreakGroupFor,
  type TiebreakGroup,
} from './chapterTiebreaks';
import { linkGamesToChapter } from './studyChapterLinks';
import type { StudyChapterHeader } from './studyPgn';
import type { Game } from '../types/chess';

const P01a = '1. c4 Nf6 2. g3 e6 3. Bg2 d5 4. b3 Be7 5. Bb2 O-O 6. Nf3 c6 7. O-O Nbd7 8. e3 Re8 9. d4 Ne4 10. Qc2 h6';
const P01b = '1. c4 Nf6 2. g3 e6 3. Bg2 d5 4. Nf3 Be7 5. b3 O-O 6. Bb2 c5 7. O-O Nc6 8. d3 d4 9. e3 e5 10. exd4 exd4';
const P01c = '1. Nf3 Nf6 2. c4 e6';
const P05a = '1. c4 e6 2. g3 d5 3. Nf3 Nf6 4. b3 c6 5. Bb2 Be7 6. Bg2 O-O 7. O-O Nbd7 8. e3 b6 9. Qe2 Bb7 10. d4 Ne4';
const P05b = '1. c4 e6 2. g3 d5 3. Nf3 Nf6 4. b3 Be7 5. Bg2 O-O 6. Bb2 c5 7. O-O Nc6 8. e3 b6 9. d4 Bb7 10. Nbd2 Qc7';
const P29fb = '1. c4 e5 2. Nc3 Nc6 3. g3 Bc5 4. e3 Nf6 5. Bg2 d6 6. Nge2 Bf5 7. d4 exd4 8. exd4 Bb4 9. O-O O-O 10. a3 Bxc3';
const P29fen = '1. c4 e5 2. Nc3 Nc6 3. g3 Nf6 4. Bg2 Bc5 5. e3 d6 6. Nge2 Be6 7. d4 Bb4 8. d5 Bg4 9. dxc6 Bxc3+';
const P30fb = '1. c4 e5 2. g3 b6 3. Bg2 Nc6 4. Nc3 Bb7 5. d3 Bb4 6. Bd2 Nge7 7. Nf3 d6 8. O-O Qc8 9. a3 Bxc3 10. Bxc3 Ng6';
const P30 = '1. c4 e5 2. Nc3 Nc6 3. g3 Bb4 4. Bg2 Nf6 5. Nf3 O-O 6. d3 Re8 7. O-O d6 8. Bd2 Bg4 9. a3 Bxc3';
const G6a = '1. c4 e5 2. g3 g6 3. Bg2 Bg7 4. Nc3 Nc6 5. Nf3 Nge7 6. O-O O-O 7. d3 d6 8. Rb1 a5 9. a3 f5 10. Bg5 h6';
const G6b = '1. c4 e5 2. Nc3 Nc6 3. g3 g6 4. Bg2 Bg7 5. d3 Nge7 6. Rb1 a5 7. a3 d6 8. b4 axb4 9. axb4 O-O 10. b5 Nd4';

const hdr = (chapterName: string, eco: string): StudyChapterHeader => ({
  chapterName,
  eco,
  opening: 'English Opening',
  studyName: 'Repertorio',
});
const H01 = hdr('01 BLANCAS - vs 1...Nf6 (doble fianchetto)', 'A14');
const H05 = hdr('05 BLANCAS - vs 1...e6 (Agincourt / Neo-Catalan)', 'A14');
const H29 = hdr('29 BLANCAS - vs 1...e5 Karpov (...Nf6 + ...Bc5) [Marin]', 'A25');
const H30 = hdr('30 BLANCAS - vs 1...e5 Rossolimo invertida (...Bb4) [Marin]', 'A25');
const H02 = hdr('02 BLANCAS - vs 1...e5 ...Nc6', 'A26');

const mk = (pgn: string | undefined, eco: string): Game => ({
  elo: 1800,
  color: 'W',
  result: 'W',
  opp: 'X',
  opp_elo: 1800,
  eco,
  tournament: 'T',
  rated: true,
  pgn,
});

const a14 = [P01a, P01b, P01c, P05a, P05b].map(p => mk(p, 'A14'));
const a25 = [P29fb, P29fen, P30fb, P30, G6a, G6b].map(p => mk(p, 'A25'));
const pgnsOf = (games: Game[]) => games.map(g => g.pgn);
const linked = (h: StudyChapterHeader, games: Game[]) => pgnsOf(linkGamesToChapter(h, games).games);

describe('chapter tiebreaks 01/05', () => {
  it('sends each game to its own chapter only', () => {
    expect(linked(H01, a14)).toEqual([P01a, P01b, P01c]);
    expect(linked(H05, a14)).toEqual([P05a, P05b]);
  });

  it('works with Lichess movetext without move numbers', () => {
    const g = mk('c4 e6 g3 d5', 'A14');
    expect(linked(H05, [g])).toHaveLength(1);
    expect(linked(H01, [g])).toHaveLength(0);
  });

  it('normalizes annotations on the first black move', () => {
    const g = mk('1. c4 Nf6! 2. g3 e6', 'A14');
    expect(linked(H01, [g])).toHaveLength(1);
  });

  it('leaves other first moves unassigned and one-ply games too', () => {
    const odd = mk('1. c4 c5 2. g3', 'A14');
    const one = mk('1. c4', 'A14');
    for (const h of [H01, H05]) {
      const link = linkGamesToChapter(h, [odd, one]);
      expect(link.games).toEqual([]);
      expect(link.unassigned).toEqual([odd, one]);
    }
  });
});

describe('chapter tiebreaks 29/30', () => {
  it('sends each example to its own chapter only', () => {
    expect(linked(H29, a25)).toEqual([P29fb, P29fen]);
    expect(linked(H30, a25)).toEqual([P30fb, P30]);
  });

  it('gives the 29 FEN precedence over a later ...Bb4', () => {
    expect(classifyGame(P29fen, CHAPTER_TIEBREAKS[1])).toEqual({ kind: 'chapter', chapter: 29 });
  });

  it('sends ...g6/...Bg7 to chapter 02 and not to 29, 30 or their unassigned', () => {
    expect(FIANCHETTO_29_30_TARGET).toBe(2);
    for (const h of [H29, H30]) {
      const link = linkGamesToChapter(h, a25);
      expect(pgnsOf(link.games)).not.toContain(G6a);
      expect(pgnsOf(link.games)).not.toContain(G6b);
      expect(link.unassigned).toEqual([]);
    }
    expect(linked(H02, a25)).toEqual([G6a, G6b]);
  });

  it('keeps chapter 02 own ECO games too, without duplicates', () => {
    const own = mk('1. c4 e5 2. Nc3 Nc6 3. Nf3', 'A26');
    expect(linked(H02, [own, ...a25])).toEqual([own.pgn, G6a, G6b]);
  });

  it('dedupes a game that matches chapter 02 by ECO and by the redirect', () => {
    const g = { ...mk(G6a, 'A25'), id: 'x' };
    // Same id in two objects: ECO A25 only reaches 02 via the redirect, so use a range header.
    const wide = hdr('02 BLANCAS - vs 1...e5 ...Nc6', 'A25-A26');
    expect(linkGamesToChapter(wide, [g, { ...g }]).games).toHaveLength(2);
    expect(linkGamesToChapter(wide, [g]).games).toEqual([g]);
  });

  it('returns ...g6/...Bg7 to unassigned with fianchettoChapter null', () => {
    const base = CHAPTER_TIEBREAKS[1];
    if (base.rule.kind !== 'fenThenF8Bishop') throw new Error('unexpected rule');
    const custom: TiebreakGroup = { ...base, rule: { ...base.rule, fianchettoChapter: null } };
    expect(linked(H02, a25.slice(4)).length).toBe(2);
    expect(pgnsOf(linkGamesToChapter(H02, a25, [custom]).games)).toEqual([]);
    const l29 = linkGamesToChapter(H29, a25, [custom]);
    expect(pgnsOf(l29.unassigned)).toEqual([G6a, G6b]);
    expect(pgnsOf(linkGamesToChapter(H30, a25, [custom]).unassigned)).toEqual([G6a, G6b]);
  });

  it('leaves a ...Be7 game unassigned', () => {
    const be7 = mk('1. c4 e5 2. Nc3 Nf6 3. Nf3 Nc6 4. g3 Be7 5. Bg2 O-O', 'A25');
    expect(classifyGame(be7.pgn, CHAPTER_TIEBREAKS[1])).toEqual({ kind: 'unassigned' });
    expect(linkGamesToChapter(H29, [be7]).unassigned).toEqual([be7]);
    expect(linked(H02, [be7])).toEqual([]);
  });

  it('keys match playing the origin lines with chess.js', () => {
    const key = (san: string) => {
      const chess = new Chess();
      for (const m of san.split(' ')) chess.move(m);
      return chess.fen().split(' ').slice(0, 2).join(' ');
    };
    const rule = CHAPTER_TIEBREAKS[1].rule;
    if (rule.kind !== 'fenThenF8Bishop') throw new Error('unexpected rule');
    expect(rule.fens[0].key).toBe(key('c4 e5 Nc3 Nc6 g3 Nf6 Bg2 Bc5'));
    expect(rule.fens[1].key).toBe(key('c4 e5 Nc3 Nc6 g3 Nf6 Bg2 Bb4'));
  });
});

describe('missing or broken PGN', () => {
  it('goes to noPgn and to no chapter', () => {
    const games = [mk(undefined, 'A14'), mk('  ', 'A14'), mk('not a pgn at all', 'A14')];
    for (const h of [H01, H05]) {
      const link = linkGamesToChapter(h, games);
      expect(link.games).toEqual([]);
      expect(link.noPgn).toHaveLength(3);
    }
    const g25 = [mk(undefined, 'A25'), mk('zzz', 'A25')];
    for (const h of [H29, H30]) {
      const link = linkGamesToChapter(h, g25);
      expect(link.games).toEqual([]);
      expect(link.noPgn).toHaveLength(2);
    }
  });
});

describe('exclusivity and compatibility', () => {
  it('never puts a game in both chapters of a pair', () => {
    const pairs: [StudyChapterHeader, StudyChapterHeader, Game[]][] = [
      [H01, H05, a14],
      [H29, H30, a25],
    ];
    for (const [x, y, games] of pairs) {
      for (const g of games) {
        const n = [x, y].filter(h => linkGamesToChapter(h, [g]).games.length).length;
        expect(n).toBeLessThanOrEqual(1);
      }
    }
  });

  it('classifyGame is stable across repeated calls', () => {
    const group = CHAPTER_TIEBREAKS[0];
    expect(classifyGame(P01a, group)).toEqual(classifyGame(P01a, group));
  });

  it('leaves chapters outside the table as before', () => {
    const h04 = hdr('04 BLANCAS - vs 1...c5 (simetrica)', 'A39');
    const games = [mk(P01a, 'A39'), mk(undefined, 'A39'), mk(P01a, 'A30')];
    const link = linkGamesToChapter(h04, games);
    expect(link).toEqual({ games: games.slice(0, 2), method: 'eco', color: 'W', noPgn: [], unassigned: [] });
    expect(tiebreakGroupFor(4)).toBeNull();
    expect(tiebreakGroupFor(null)).toBeNull();
    expect(tiebreakGroupFor(29)?.id).toBe('A25-29-30');
  });
});
