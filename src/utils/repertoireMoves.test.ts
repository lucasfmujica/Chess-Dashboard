import { describe, it, expect } from 'vitest';
import {
  chapterColor,
  chapterNumber,
  extractChapterMoves,
  extractRepertoireMoves,
  schedulableMoves,
  buildLines,
} from './repertoireMoves';
import { parseStudyPgn, type StudyChapter, type StudyMoveNode } from './studyPgn';

/** Terse node builder — most tests only care about san, nag and variations. */
const node = (
  san: string,
  extra: Partial<Omit<StudyMoveNode, 'san'>> = {}
): StudyMoveNode => ({
  san,
  moveNumber: 0,
  turn: 'w',
  variations: [],
  ...extra,
});

const chapter = (chapterName: string, mainline: StudyMoveNode[], eco = 'A00'): StudyChapter => ({
  header: { chapterName, eco, opening: '', studyName: 'test' },
  mainline,
});

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('chapterColor', () => {
  it('reads the side from the chapter title', () => {
    expect(chapterColor('01 BLANCAS - vs 1...Nf6 (doble fianchetto)')).toBe('W');
    expect(chapterColor('09 NEGRAS vs e4 - Dragon Acelerado Bc4')).toBe('B');
  });

  it('returns null when the title names no side', () => {
    expect(chapterColor('Some other study chapter')).toBeNull();
  });
});

describe('chapterNumber', () => {
  it('reads the NN prefix, which is the only stable join to repertoire_lines', () => {
    expect(chapterNumber('01 BLANCAS - vs 1...Nf6')).toBe(1);
    expect(chapterNumber('32 NEGRAS vs e4 - Dragon Acelerado Clasica')).toBe(32);
  });

  it('returns null without a leading number', () => {
    expect(chapterNumber('BLANCAS - vs 1...Nf6')).toBeNull();
  });
});

describe('extractChapterMoves', () => {
  it('emits only the player-side moves, with the position before each', () => {
    const rows = extractChapterMoves(chapter('01 BLANCAS - test', [node('e4'), node('e5'), node('Nf3')]));

    expect(rows.map(r => r.expectedSan)).toEqual(['e4', 'Nf3']);
    expect(rows[0].fenBefore).toBe(START);
    expect(rows[0].pathSan).toBe('');
    expect(rows[0].depth).toBe(0);
    expect(rows[1].pathSan).toBe('e4 e5');
    expect(rows[1].depth).toBe(2);
  });

  it('emits the black moves for a NEGRAS chapter, starting after white', () => {
    const rows = extractChapterMoves(chapter('09 NEGRAS - test', [node('e4'), node('c5'), node('Nf3')]));

    expect(rows.map(r => r.expectedSan)).toEqual(['c5']);
    expect(rows[0].pathSan).toBe('e4');
    expect(rows[0].color).toBe('B');
  });

  it('carries the opponent reply so the trainer can play on', () => {
    const rows = extractChapterMoves(chapter('01 BLANCAS - test', [node('e4'), node('e5'), node('Nf3')]));

    expect(rows[0].replySan).toBe('e5');
    expect(rows[1].replySan).toBeUndefined();
  });

  it('skips a chapter whose title has no number or no side', () => {
    expect(extractChapterMoves(chapter('BLANCAS - no number', [node('e4')]))).toEqual([]);
    expect(extractChapterMoves(chapter('01 - no side', [node('e4')]))).toEqual([]);
  });

  it('copies the chapter metadata onto every row', () => {
    const rows = extractChapterMoves(chapter('07 BLANCAS - Holandesa', [node('d4')], 'A10'));

    expect(rows[0]).toMatchObject({ chapterNo: 7, chapterName: '07 BLANCAS - Holandesa', eco: 'A10' });
  });
});

describe('variations', () => {
  it('branches from the position BEFORE the node it replaces, not after it', () => {
    // 1.e4 e5 2.Nf3 with (2.Bc4) as an alternative second white move.
    const rows = extractChapterMoves(
      chapter('01 BLANCAS - test', [
        node('e4'),
        node('e5'),
        node('Nf3', { variations: [[node('Bc4')]] }),
      ])
    );

    const alt = rows.find(r => r.expectedSan === 'Bc4');
    // Shifting the branch by a ply would put the path at 'e4 e5 Nf3'.
    expect(alt?.pathSan).toBe('e4 e5');
    expect(alt?.fenBefore).toBe(rows.find(r => r.expectedSan === 'Nf3')?.fenBefore);
  });

  it('marks variation rows as off-mainline', () => {
    const rows = extractChapterMoves(
      chapter('01 BLANCAS - test', [node('e4'), node('e5'), node('Nf3', { variations: [[node('Bc4')]] })])
    );

    expect(rows.find(r => r.expectedSan === 'Nf3')?.isMainline).toBe(true);
    expect(rows.find(r => r.expectedSan === 'Bc4')?.isMainline).toBe(false);
  });

  it('keeps the walked line as `main` and demotes only its sibling to `alt`', () => {
    const rows = extractChapterMoves(
      chapter('01 BLANCAS - test', [node('e4'), node('e5'), node('Nf3', { variations: [[node('Bc4')]] })])
    );

    expect(rows.find(r => r.expectedSan === 'Nf3')?.role).toBe('main');
    expect(rows.find(r => r.expectedSan === 'Bc4')?.role).toBe('alt');
  });

  it('walks variations of the opponent move too — those are tries to answer', () => {
    // 1.e4 c5 (1...e5 2.Nf3) as Black: both of white's second moves are ours to face.
    const rows = extractChapterMoves(
      chapter('09 NEGRAS - test', [
        node('e4', { variations: [[node('d4'), node('d5')]] }),
        node('c5'),
      ])
    );

    expect(rows.map(r => r.expectedSan).sort()).toEqual(['c5', 'd5']);
    expect(rows.find(r => r.expectedSan === 'd5')?.pathSan).toBe('d4');
  });
});

describe('traps', () => {
  const trapChapter = chapter('09 NEGRAS - test', [
    node('e4'),
    node('c5', { variations: [[node('e5', { nag: ['$2'], comment: 'NO!' })]] }),
  ]);

  it('marks a ?-annotated player move as a trap', () => {
    const rows = extractChapterMoves(trapChapter);

    expect(rows.find(r => r.expectedSan === 'e5')?.role).toBe('trap');
    expect(rows.find(r => r.expectedSan === 'c5')?.role).toBe('main');
  });

  it('treats ?? and ?! the same, and leaves ! moves alone', () => {
    const roleOf = (nag: string) =>
      extractChapterMoves(
        chapter('09 NEGRAS - test', [node('e4'), node('c5', { variations: [[node('e5', { nag: [nag] })]] })])
      ).find(r => r.expectedSan === 'e5')?.role;

    expect(roleOf('$4')).toBe('trap');
    expect(roleOf('$6')).toBe('trap');
    expect(roleOf('$1')).toBe('alt');
  });

  it('falls back to the punishing reply for the refutation text', () => {
    // The study writes the refutation on white's punishment, not on the trap.
    const rows = extractChapterMoves(
      chapter('09 NEGRAS - test', [
        node('e4'),
        node('c5', {
          variations: [[node('e5', { nag: ['$6'] }), node('Nf3', { comment: 'El castigo del libro' })]],
        }),
      ])
    );

    expect(rows.find(r => r.expectedSan === 'e5')?.comment).toBe('El castigo del libro');
  });

  it('stops walking after a trap — the line past it is punishment, not preparation', () => {
    const rows = extractChapterMoves(
      chapter('09 NEGRAS - test', [
        node('e4'),
        node('c5', {
          variations: [[node('e5', { nag: ['$2'] }), node('Nf3'), node('Nc6')]],
        }),
      ])
    );

    // Nc6 sits inside a line we are told never to reach.
    expect(rows.map(r => r.expectedSan)).not.toContain('Nc6');
  });

  it('excludes traps and alternates from what the SRS schedules', () => {
    const rows = extractChapterMoves(trapChapter);

    expect(schedulableMoves(rows).map(r => r.expectedSan)).toEqual(['c5']);
  });
});

describe('extractRepertoireMoves', () => {
  it('dedupes on (chapter, path, move), keeping the first occurrence', () => {
    // A variation that simply repeats the mainline move must not double up.
    const rows = extractRepertoireMoves([
      chapter('01 BLANCAS - test', [node('e4', { variations: [[node('e4')]] }), node('e5')]),
    ]);

    expect(rows.filter(r => r.expectedSan === 'e4')).toHaveLength(1);
    expect(rows[0].role).toBe('main');
  });

  it('keeps chapters with the same number distinct from each other', () => {
    const rows = extractRepertoireMoves([
      chapter('01 BLANCAS - a', [node('e4')]),
      chapter('02 BLANCAS - b', [node('e4')]),
    ]);

    expect(rows).toHaveLength(2);
  });

  it('abandons a branch with illegal SAN instead of throwing', () => {
    const rows = extractRepertoireMoves([
      chapter('01 BLANCAS - test', [node('e4'), node('e5'), node('Qxh8'), node('Nf3')]),
    ]);

    expect(rows.map(r => r.expectedSan)).toEqual(['e4']);
  });
});

describe('against a real study export', () => {
  // Guards the parser contract: `?` arrives as a NAG, not as a SAN suffix, and
  // a comment arrives on `commentAfter`. A parser upgrade that changed either
  // would silently produce zero traps and no feedback text.
  const PGN = `[Event "Test"]
[ChapterName "09 NEGRAS vs e4 - trampa"]
[ECO "B35"]
[StudyName "Test"]

1. e4 c5 2. Nf3 Nc6 3. Bc4 (3. d4 cxd4 { toma siempre }) 3... e6 (3... Nf6? { NO! }) *
`;

  it('extracts roles, comments and paths from parsed PGN', async () => {
    const chapters = await parseStudyPgn(PGN);
    const rows = extractChapterMoves(chapters[0]);

    expect(rows.find(r => r.expectedSan === 'e6')?.role).toBe('main');

    const trap = rows.find(r => r.expectedSan === 'Nf6');
    expect(trap?.role).toBe('trap');
    expect(trap?.comment).toBe('NO!');
    expect(trap?.pathSan).toBe('e4 c5 Nf3 Nc6 Bc4');

    const sideline = rows.find(r => r.expectedSan === 'cxd4');
    expect(sideline?.isMainline).toBe(false);
    expect(sideline?.comment).toBe('toma siempre');
  });
});

describe('buildLines', () => {
  const move = (pathSan: string, expectedSan: string, replySan?: string) => ({
    pathSan,
    expectedSan,
    replySan,
  });

  it('chains moves into one playable line', () => {
    const lines = buildLines([
      move('', 'e4', 'e5'),
      move('e4 e5', 'Nf3', 'Nc6'),
      move('e4 e5 Nf3 Nc6', 'Bb5'),
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0].map(m => m.expectedSan)).toEqual(['e4', 'Nf3', 'Bb5']);
  });

  it('splits branches into separate lines rather than interleaving them', () => {
    // Same first move, two opponent replies — two lines, not one jumbled one.
    const lines = buildLines([
      move('', 'e4', 'e5'),
      move('e4 e5', 'Nf3'),
      move('e4 c5', 'Nf3'),
    ]);

    expect(lines).toHaveLength(2);
    expect(lines[0].map(m => m.pathSan)).toEqual(['', 'e4 e5']);
    expect(lines[1].map(m => m.pathSan)).toEqual(['e4 c5']);
  });

  it('ends a line where the study stops', () => {
    const lines = buildLines([move('', 'e4', 'e5'), move('e4 e5', 'Nf3')]);

    expect(lines[0]).toHaveLength(2);
  });

  it('does not hang on a cycle', () => {
    // Self-referential rows can only come from a broken import, but the
    // trainer must not freeze on them.
    const lines = buildLines([move('', 'e4', 'e5'), move('e4 e5', 'Nf3', 'Nc6')]);
    expect(lines.flat().length).toBeLessThanOrEqual(2);
  });

  it('covers every move exactly once across all lines', () => {
    const moves = [
      move('', 'e4', 'e5'),
      move('e4 e5', 'Nf3', 'Nc6'),
      move('e4 e5 Nf3 Nc6', 'Bb5'),
      move('e4 c5', 'Nf3', 'd6'),
      move('e4 c5 Nf3 d6', 'd4'),
    ];
    const lines = buildLines(moves);

    expect(lines.flat()).toHaveLength(moves.length);
  });
});
