import { describe, it, expect } from 'vitest';
import { extractChapterConcepts } from './studyConcepts';
import type { StudyChapter } from './studyPgn';

const chapter = (over: Partial<StudyChapter['header']>, comment: string): StudyChapter => ({
  header: { chapterName: 'Superior minor piece', eco: '', opening: '', studyName: '', ...over },
  mainline: [
    { san: 'e4', moveNumber: 1, turn: 'w', comment, variations: [] },
  ] as StudyChapter['mainline'],
});

describe('extractChapterConcepts', () => {
  it('reads a chapter that does not follow the repertoire naming', () => {
    // El repertorio numera y colorea sus capítulos; un estudio de un libro no.
    const out = extractChapterConcepts(chapter({}, 'El alfil malo queda encerrado por sus propios peones.'));
    expect(out).toHaveLength(1);
    expect(out[0].chapterNo).toBeNull();
    expect(out[0].color).toBeNull();
  });

  it('drops Lichess engine annotations instead of storing them as concepts', () => {
    for (const noise of [
      'Blunder. Best move was a5.',
      'Mistake. Best move was Qd7.',
      'Inaccuracy. Best move was Kxd8.',
      'Checkmate is now unavoidable.',
    ]) {
      expect(extractChapterConcepts(chapter({}, noise))).toHaveLength(0);
    }
  });

  it('still drops notes too short to carry an idea', () => {
    expect(extractChapterConcepts(chapter({}, 'OJO'))).toHaveLength(0);
  });

  it('starts from the chapter FEN when there is one', () => {
    // Sin esto, reproducir e4 desde una posición de diagrama falla y el capítulo
    // entero se pierde en silencio.
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const out = extractChapterConcepts(chapter({ fen }, 'Una nota larga sobre la estructura de peones.'));
    expect(out).toHaveLength(1);
  });
});
