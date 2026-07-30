import { describe, it, expect } from 'vitest';
import { citationsIn, extractChapterConcepts, extractStudyConcepts } from './studyConcepts';
import type { StudyChapter, StudyMoveNode } from './studyPgn';

const node = (san: string, extra: Partial<Omit<StudyMoveNode, 'san'>> = {}): StudyMoveNode => ({
  san,
  moveNumber: 0,
  turn: 'w',
  variations: [],
  ...extra,
});

const chapter = (chapterName: string, mainline: StudyMoveNode[], eco = 'B35'): StudyChapter => ({
  header: { chapterName, eco, opening: '', studyName: 'test' },
  mainline,
});

const LONG = 'REGLA DE ORO: enrocar siempre antes de tocar el caballo de rey.';

describe('citationsIn', () => {
  it('finds the sources the study cites by shorthand', () => {
    expect(citationsIn('REGLA EDAMI II: recapturo bxc6')).toEqual(['EDAMI']);
    expect(citationsIn('Lalić cap. 2 (verificado: 0.00)')).toEqual(['Lalić']);
  });

  it('matches the unaccented spelling too', () => {
    expect(citationsIn('segun Lalic esto iguala')).toEqual(['Lalić']);
  });

  it('returns every source when a note cites more than one', () => {
    expect(citationsIn('EDAMI II y Lalić coinciden')).toEqual(['EDAMI', 'Lalić']);
  });

  it('returns nothing for a note that cites no source', () => {
    expect(citationsIn('esta jugada iguala')).toEqual([]);
  });
});

describe('extractChapterConcepts', () => {
  it('takes the position AFTER the annotated move', () => {
    // A note on 1.e4 is about the position that move creates.
    const [candidate] = extractChapterConcepts(
      chapter('09 NEGRAS - test', [node('e4', { comment: LONG })])
    );

    expect(candidate.san).toBe('e4');
    expect(candidate.pathSan).toBe('');
    expect(candidate.fen.startsWith('rnbqkbnr/pppppppp/8/8/4P3')).toBe(true);
  });

  it('keeps the player’s words verbatim', () => {
    const [candidate] = extractChapterConcepts(
      chapter('09 NEGRAS - test', [node('e4', { comment: `  ${LONG}  ` })])
    );

    expect(candidate.text).toBe(LONG);
  });

  it('drops the bare interjections the study uses as move markers', () => {
    // "NO!" carries no idea on its own — the trainer already shows it as a
    // trap refutation, and it would be a useless concept row.
    const candidates = extractChapterConcepts(
      chapter('09 NEGRAS - test', [node('e4', { comment: 'NO!' }), node('c5', { comment: 'OJO' })])
    );

    expect(candidates).toEqual([]);
  });

  it('takes notes from inside variations, not just the mainline', () => {
    const candidates = extractChapterConcepts(
      chapter('09 NEGRAS - test', [
        node('e4'),
        node('c5', { variations: [[node('e5', { comment: LONG })]] }),
      ])
    );

    expect(candidates.map(c => c.san)).toEqual(['e5']);
  });

  it('copies the chapter metadata onto every candidate', () => {
    const [candidate] = extractChapterConcepts(
      chapter('09 NEGRAS vs e4 - Dragon', [node('e4', { comment: LONG })], 'B35')
    );

    expect(candidate).toMatchObject({ chapterNo: 9, color: 'B', eco: 'B35' });
  });

  it('records the citations found in the note', () => {
    const [candidate] = extractChapterConcepts(
      chapter('09 NEGRAS - test', [node('e4', { comment: `${LONG} Segun Lalic esto iguala.` })])
    );

    expect(candidate.citations).toEqual(['Lalić']);
  });

  it('skips a chapter whose title has no number or side', () => {
    expect(extractChapterConcepts(chapter('sin numero', [node('e4', { comment: LONG })]))).toEqual(
      []
    );
  });
});

describe('extractStudyConcepts', () => {
  it('dedupes the same note repeated across chapters', () => {
    const candidates = extractStudyConcepts([
      chapter('01 BLANCAS - a', [node('d4', { comment: LONG })]),
      chapter('09 NEGRAS - b', [node('e4', { comment: `  ${LONG.toUpperCase()}  ` })]),
    ]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0].chapterNo).toBe(1);
  });

  it('keeps distinct notes apart', () => {
    const candidates = extractStudyConcepts([
      chapter('01 BLANCAS - a', [node('d4', { comment: LONG })]),
      chapter('09 NEGRAS - b', [node('e4', { comment: `${LONG} Pero con Bg5 cambia todo.` })]),
    ]);

    expect(candidates).toHaveLength(2);
  });
});
