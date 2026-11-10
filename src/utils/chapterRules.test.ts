import { Chess } from 'chess.js';
import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import cases from './__fixtures__/chapterRuleTests.json';
import {
  CHAPTER_RULES,
  assignByRules,
  buildChapterAssignment,
  INDEX_PLIES,
  evalEntry,
  indexFromPgn,
  isPgnIndexed,
  indexFromSans,
  type ChapterRule,
  type Side,
} from './chapterRules';
import { chapterNumber } from './repertoireMoves';
import { linkGamesToChapter } from './studyChapterLinks';
import { parseStudyPgn, type StudyChapterHeader } from './studyPgn';
import type { Game } from '../types/chess';

const entryOf = (color: Side, moves: string) => assignByRules(color, indexFromSans(moves.split(' ')));
const chapterOf = (color: Side, moves: string) => entryOf(color, moves)?.chapter ?? null;

const hdr = (chapterName: string, eco: string): StudyChapterHeader => ({
  chapterName,
  eco,
  opening: 'English Opening',
  studyName: 'Repertorio',
});

const mk = (pgn: string | undefined, eco: string, color: Side = 'W'): Game => ({
  elo: 1800,
  color,
  result: 'W',
  opp: 'X',
  opp_elo: 1800,
  eco,
  tournament: 'T',
  rated: true,
  pgn,
});

const pgnsOf = (games: Game[]) => games.map(g => g.pgn);
const linked = (h: StudyChapterHeader, games: Game[]) => pgnsOf(linkGamesToChapter(h, games).games);

type RuleCase = { color: string; moves: string; expect: string | null; why?: string };
const table = (cases as RuleCase[]).map((t, i) => ({ ...t, label: `#${i} ${t.expect} ${t.why ?? ''}`.trim() }));

describe('reglas-capitulos.json tests (motor por defecto)', () => {
  it('has the 57 cases', () => {
    expect(table).toHaveLength(57);
  });

  it.each(table)('$label', t => {
    expect(chapterOf(t.color as Side, t.moves)).toBe(t.expect);
  });
});

describe('ampliaciones 10b, 28c y 28d (aprobadas 10/11/2026 10:07)', () => {
  it('28d: 1.Nf3 Nf6 2.c4 c5 goes to 28', () => {
    expect(entryOf('B', 'Nf3 Nf6 c4 c5 g3 g6 Bg2 Bg7')).toMatchObject({ chapter: '28', entryId: '28d' });
  });

  it('28c: 1.c4 Nf6 2.Nc3 c5 goes to 28', () => {
    expect(entryOf('B', 'c4 Nf6 Nc3 c5 g3 g6 Bg2 Bg7')).toMatchObject({ chapter: '28', entryId: '28c' });
  });

  it('10b: Nxc6 after 5.Nc3 Bg7 (move 6) goes to 10', () => {
    expect(entryOf('B', 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 Nc3 Bg7 Nxc6 bxc6')).toMatchObject({ chapter: '10', entryId: '10b' });
  });

  it('10a still takes the direct 5.Nxc6', () => {
    expect(chapterOf('B', 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 Nxc6 bxc6')).toBe('10');
  });
});

describe('desempate entre capítulos', () => {
  it('deepest rule wins: 24 (prefix, ply 4) vs 27 (Nf3 + e3, ply 5)', () => {
    const t = table.find(c => c.expect === '27' && c.why?.includes('24'));
    expect(t).toBeDefined();
    const idx = indexFromSans(t!.moves.split(' '));
    const r24 = CHAPTER_RULES.find(r => r.chapter === '24')!;
    const r27 = CHAPTER_RULES.find(r => r.chapter === '27')!;
    expect(assignByRules('B', idx, { rules: [r24] })?.depth).toBe(4);
    expect(assignByRules('B', idx, { rules: [r27] })?.depth).toBe(5);
    expect(assignByRules('B', idx)?.chapter).toBe('27');
  });

  const rule = (chapter: string, priority: number): ChapterRule => ({
    chapter,
    name: `${chapter} BLANCAS - prueba`,
    color: 'W',
    studyEco: 'A10',
    entries: [{ id: `${chapter}a`, prefix: ['c4'] }],
    exclude: [],
    priority,
  });
  const idx = indexFromSans(['c4', 'e5']);

  it('then the lower priority', () => {
    expect(assignByRules('W', idx, { rules: [rule('03', 100), rule('09', 50)] })?.chapter).toBe('09');
  });

  it('then the lower chapter number', () => {
    expect(assignByRules('W', idx, { rules: [rule('09', 100), rule('03', 100)] })?.chapter).toBe('03');
  });

  it('only the chapters of the game color compete', () => {
    expect(assignByRules('B', idx, { rules: [rule('03', 100)] })).toBeNull();
  });
});

describe('evalEntry', () => {
  it('an entry without conditions matches with depth 0', () => {
    expect(evalEntry({}, indexFromSans(['e4']))).toBe(0);
  });

  it('firstMoveFrom looks at any side and piece, like the Python engine', () => {
    // El alfil blanco come en f8 y sale de ahí a g7 en el ply 7.
    const idx = indexFromSans('b3 e6 Ba3 Nc6 Bxf8 Nf6 Bg7'.split(' '));
    expect(evalEntry({ firstMoveFrom: { square: 'f8', to: 'g7' } }, idx)).toBe(7);
    expect(evalEntry({ firstMoveFrom: { square: 'f8', to: 'c5' } }, idx)).toBeNull();
  });
});

describe('autocontrol: la línea principal de cada capítulo con regla cae en su capítulo', () => {
  it('main line of each chapter', async () => {
    const text = readFileSync(path.join(__dirname, '../../public/data/repertoire-study.pgn'), 'utf8');
    const chapters = await parseStudyPgn(text);
    const keys = new Set(CHAPTER_RULES.map(r => r.chapter));
    let checked = 0;
    for (const ch of chapters) {
      const no = chapterNumber(ch.header.chapterName);
      const key = no === null ? null : String(no).padStart(2, '0');
      if (!key || !keys.has(key)) continue;
      const rule = CHAPTER_RULES.find(r => r.chapter === key)!;
      const sans = ch.mainline.map(n => n.san);
      const got = assignByRules(rule.color, indexFromSans(sans))?.chapter ?? null;
      expect({ chapter: key, got }).toEqual({ chapter: key, got: key });
      checked++;
    }
    expect(checked).toBe(keys.size);
  });
});

// Ejemplos de #36 (desempate 01/05 y 29/30): el JSON los deja en el mismo capítulo.
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
const BE7 = '1. c4 e5 2. Nc3 Nf6 3. Nf3 Nc6 4. g3 Be7 5. Bg2 O-O';

const H01 = hdr('01 BLANCAS - vs 1...Nf6 (doble fianchetto)', 'A14');
const H05 = hdr('05 BLANCAS - vs 1...e6 (Agincourt / Neo-Catalan)', 'A14');
const H29 = hdr('29 BLANCAS - vs 1...e5 Karpov (...Nf6 + ...Bc5) [Marin]', 'A25');
const H30 = hdr('30 BLANCAS - vs 1...e5 Rossolimo invertida (...Bb4) [Marin]', 'A25');
const H02 = hdr('02 BLANCAS - vs 1...e5 ...Nc6', 'A26');
const H04 = hdr('04 BLANCAS - vs 1...c5 (simetrica)', 'A39');

const a14 = [P01a, P01b, P01c, P05a, P05b].map(p => mk(p, 'A14'));
const a25 = [P29fb, P29fen, P30fb, P30, G6a, G6b].map(p => mk(p, 'A25'));

describe('01/05 y 29/30: los ejemplos de #36 siguen en su capítulo', () => {
  it('01/05', () => {
    expect(linked(H01, a14)).toEqual([P01a, P01b, P01c]);
    expect(linked(H05, a14)).toEqual([P05a, P05b]);
    expect(linkGamesToChapter(H01, a14).method).toBe('rule');
  });

  it('29/30', () => {
    expect(linked(H29, a25)).toEqual([P29fb, P29fen]);
    expect(linked(H30, a25)).toEqual([P30fb, P30]);
  });

  it('normalizes annotations on the moves', () => {
    expect(linked(H01, [mk('1. c4 Nf6! 2. g3 e6', 'A14')])).toHaveLength(1);
  });

  it('never puts a game in two chapters', () => {
    const headers = [H01, H05, H29, H30, H02];
    for (const g of [...a14, ...a25]) {
      expect(headers.filter(h => linkGamesToChapter(h, [g]).games.length).length).toBe(1);
    }
  });
});

describe('02a (aprobada 10/11/2026 10:40): ...e5, ...Nc6, ...g6 y ...Bg7 tras 1.c4 van al 02 con cualquier ECO', () => {
  it('goes to 02 whatever the ECO, once, and not to 29/30', () => {
    const own02 = mk('1. c4 e5 2. Nc3 Nc6 3. Nf3', 'A26');
    const games = [own02, ...a25];
    expect(buildChapterAssignment(games).byGame.get(a25[4])).toMatchObject({ chapter: '02', entryId: '02a' });
    expect(linked(H02, games)).toEqual([G6a, G6b]);
    for (const h of [H29, H30]) {
      const link = linkGamesToChapter(h, games);
      expect(pgnsOf(link.games)).not.toContain(G6a);
      expect(pgnsOf(link.games)).not.toContain(G6b);
      expect(pgnsOf(link.unassigned)).not.toContain(G6a);
    }
    const other = mk(G6a, 'A10');
    expect(linked(H02, [other])).toEqual([G6a]);
  });

  it('an early ...c5 or ...f5 does not', () => {
    expect(chapterOf('W', 'c4 e5 g3 c5 Bg2 Nc6 Nc3 g6 Nf3 Bg7')).not.toBe('02');
    expect(chapterOf('W', 'c4 e5 g3 f5 Bg2 Nc6 Nc3 g6 Nf3 Bg7')).not.toBe('02');
  });

  it('a ...Be7 game has no chapter', () => {
    const be7 = mk(BE7, 'A25');
    expect(buildChapterAssignment([be7]).byGame.has(be7)).toBe(false);
    expect(linkGamesToChapter(H29, [be7]).unassigned).toEqual([be7]);
    expect(linked(H02, [be7])).toEqual([]);
  });
});

describe('08c y 08d (aprobadas 10/11/2026 10:40): KID por transposición', () => {
  it('1.c4 Nf6 with ...g6 ...Bg7 ...d6 goes to 08', () => {
    expect(entryOf('W', 'c4 Nf6 Nc3 g6 e4 Bg7 d4 d6 Nf3 O-O')).toMatchObject({ chapter: '08', entryId: '08c' });
  });

  it('1.Nf3 Nf6 2.c4 with ...g6 ...Bg7 ...d6 goes to 08', () => {
    expect(entryOf('W', 'Nf3 Nf6 c4 g6 Nc3 Bg7 e4 d6 d4 O-O')).toMatchObject({ chapter: '08', entryId: '08d' });
  });

  it('...d5 (Grünfeld) or an early ...c5 do not', () => {
    expect(chapterOf('W', 'c4 Nf6 Nc3 g6 e4 d5 exd5 Nxd5 Nf3 Bg7 d4 O-O')).not.toBe('08');
    expect(chapterOf('W', 'Nf3 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 d4 O-O')).not.toBe('08');
    expect(chapterOf('W', 'c4 Nf6 Nc3 c5 g3 g6 Bg2 Bg7 Nf3 d6')).not.toBe('08');
    expect(chapterOf('W', 'Nf3 Nf6 c4 c5 g3 g6 Bg2 Bg7 Nc3 d6')).not.toBe('08');
  });
});

describe('07c (maxPly 8): Stonewall con ...f5 entre los plies 6 y 8', () => {
  it('1.c4 e6 2.Nc3 d5 3.g3 f5 goes to 07', () => {
    expect(entryOf('W', 'c4 e6 Nc3 d5 g3 f5')).toMatchObject({ chapter: '07', entryId: '07c' });
  });

  it('...f5 after ply 8 does not', () => {
    expect(chapterOf('W', 'c4 e6 Nc3 d5 g3 Be7 Bg2 Nd7 Nf3 f5')).not.toBe('07');
  });
});

describe('sin jugadas', () => {
  it('goes to noMoves and to no chapter with a rule', () => {
    const games = [mk(undefined, 'A14'), mk('  ', 'A14'), mk('not a pgn at all', 'A14'), mk('zzz', 'A25')];
    const assignment = buildChapterAssignment(games);
    expect(assignment.noMoves).toEqual(games);
    expect(assignment.byGame.size).toBe(0);
    for (const h of [H01, H05, H29, H30]) {
      const link = linkGamesToChapter(h, games, assignment);
      expect(link.games).toEqual([]);
      expect(link.unassigned).toEqual([]);
    }
    expect(indexFromPgn(undefined)).toBeNull();
  });
});

describe('capítulos sin regla', () => {
  it('04 (A39) links by ECO as before', () => {
    const games = [mk('1. c4 c5 2. g3', 'A39'), mk(undefined, 'A39'), mk('1. c4 c5', 'A30'), mk('1. c4 c5', 'A39', 'B')];
    expect(linkGamesToChapter(H04, games)).toEqual({
      games: games.slice(0, 2),
      method: 'eco',
      color: 'W',
      unassigned: [],
    });
  });

  it('drops an A39 game that a rule sends to another chapter', () => {
    const g = mk(P01a, 'A39');
    expect(linked(H04, [g])).toEqual([]);
    expect(linked(H01, [g])).toEqual([P01a]);
  });

  it('knows which chapters have a rule', () => {
    expect([...buildChapterAssignment([]).ruleChapters].sort()).toEqual(
      ['01', '02', '05', '06', '07', '08', '10', '11', '13', '14', '17', '18', '19', '21', '23', '24', '25', '27', '28', '29', '30', '32'],
    );
  });
});

describe('la regla ignora el ECO', () => {
  it('an A13 that starts 1.c4 e6 goes to 05', () => {
    const g = mk('1. c4 e6 2. g3 d5 3. Bg2 Nf6 4. Nf3 Be7', 'A13');
    expect(linked(H05, [g])).toEqual([g.pgn]);
  });
});

describe('formatos de PGN', () => {
  it('Lichess movetext without numbers and a full PGN give the same index', () => {
    const bare = 'c4 e5 Nc3 Nc6 g3 Nf6 Bg2 Bc5 e3 d6';
    const full = [
      '[Event "Torneo"]',
      '[White "A"]',
      '[Black "B"]',
      '[Result "1-0"]',
      '',
      '1. c4 {[%clk 0:10:00]} e5 2. Nc3 (2. g3 d5) Nc6 3. g3 Nf6 4. Bg2 $1 Bc5 5. e3 ; comentario',
      'd6 1-0',
    ].join('\n');
    const a = indexFromPgn(bare);
    const b = indexFromPgn(full);
    expect(a).not.toBeNull();
    expect(b).toEqual(a);
    expect(a).toEqual(indexFromSans(bare.split(' ')));
    expect(assignByRules('W', b!)?.chapter).toBe('29');
  });
});

describe('INDEX_PLIES', () => {
  const plies = (e: { prefix?: string[]; maxPly?: number; whitePlays?: unknown[]; blackPlays?: unknown[]; reaches?: { maxPly: number }[]; exclude?: unknown[] }): number[] => [
    e.maxPly ?? 0,
    (e.prefix?.length ?? 0),
    ...[...(e.whitePlays ?? []), ...(e.blackPlays ?? [])].map(p => (typeof p === 'object' && p ? ((p as { maxPly?: number }).maxPly ?? 0) : 0)),
    ...(e.reaches ?? []).map(r => r.maxPly),
    ...((e.exclude ?? []) as Parameters<typeof plies>[0][]).flatMap(plies),
  ];

  it('ningún maxPly ni prefix del JSON supera INDEX_PLIES', () => {
    const all = CHAPTER_RULES.flatMap(r => [...r.entries, ...r.exclude].flatMap(plies));
    expect(Math.max(...all)).toBeLessThanOrEqual(INDEX_PLIES);
  });

  it('isPgnIndexed: sin jugadas cuenta como listo, indexar lo marca', () => {
    expect(isPgnIndexed(undefined)).toBe(true);
    const pgn = '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5';
    expect(isPgnIndexed(pgn)).toBe(false);
    indexFromPgn(pgn);
    expect(isPgnIndexed(pgn)).toBe(true);
  });
});

describe('indexFromPgn: camino rápido por prefijo', () => {
  const long =
    'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Nb8 d4 Nbd7 Nbd2 Bb7 Bc2 Re8 Nf1 Bf8 Ng3 g6 a4 c5 d5 c4 Bg5 h6 Be3 Nc5 Qd2 h5 Bg5 Be7 Bxf6 Bxf6 Nxh5';
  const sansOf = (t: string) => t.split(' ');

  it('una partida de más de 30 plies da el mismo índice que el camino completo', () => {
    expect(sansOf(long).length).toBeGreaterThan(30);
    const fast = indexFromPgn(long)!;
    const chess = new Chess();
    chess.loadPgn(long);
    const h = chess.history({ verbose: true });
    const full = indexFromSans(h.map(m => m.san)); // índice de referencia con toda la partida
    expect(fast.sans).toHaveLength(30);
    expect(fast.sans).toEqual(full.sans.slice(0, 30));
    expect(fast.keys).toEqual(full.keys);
    expect(fast.moves).toEqual(full.moves);
  });

  it('headers, comentarios con clk, variantes y 1.e4 sin espacio dan lo mismo que el movetext limpio', () => {
    const clean = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6';
    const messy = [
      '[Event "Torneo (rápido); test"]',
      '[Site "?"]',
      '',
      '1.e4 {[%clk 0:10:00]} e5 2.Nf3 (2.f4 exf4) Nc6 3.Bb5 $1 a6 4.Ba4 Nf6 1/2-1/2',
    ].join('\n');
    expect(indexFromPgn(messy)).toEqual(indexFromPgn(clean));
    expect(indexFromPgn(clean)).not.toBeNull();
  });

  it('un token ilegal da null', () => {
    expect(indexFromPgn('1. e4 e5 2. Ke4')).toBeNull();
  });

  it('un PGN con [FEN usa el camino completo (posición inicial propia)', () => {
    const fen = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
    const pgn = `[SetUp "1"]\n[FEN "${fen}"]\n\n1. e4 Kd7 2. Kd2 Kd6`;
    const idx = indexFromPgn(pgn)!;
    expect(idx).not.toBeNull();
    expect(idx.sans).toEqual(['e4', 'Kd7', 'Kd2', 'Kd6']);
    expect(idx.moves[0]).toMatchObject({ side: 'W', from: 'e2', to: 'e4' });
  });
});
