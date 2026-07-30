import { Chess } from 'chess.js';
import type { StudyChapter, StudyMoveNode } from './studyPgn';
import { chapterColor, chapterNumber } from './repertoireMoves';

/**
 * Pulls concept candidates out of the study's own annotations.
 *
 * The `concepts` table has been empty since it was created, and the reason is
 * in the training program: Friday says "pick a concept and write its row", so
 * every concept costs a blank form. Meanwhile the repertoire study already
 * holds ~125 notes written by the player, each one anchored to a real position
 * and many of them citing the book they came from — "REGLA EDAMI II…",
 * "Lalić cap. 2", "verificado: +4.3". Those are concepts. They only need
 * extracting.
 *
 * This half is deterministic on purpose: the position, the chapter and the
 * text are read straight out of the PGN, never generated. A model is used
 * afterwards only to title and categorise, so nothing it invents can end up
 * being presented as something the player wrote.
 */

export interface StudyConceptCandidate {
  /** 1-32. */
  chapterNo: number;
  chapterName: string;
  eco: string;
  color: 'W' | 'B';
  /** SAN path to the position the note is attached to. */
  pathSan: string;
  /** The position AFTER the annotated move — what the note is talking about. */
  fen: string;
  /** The annotated move, in SAN. */
  san: string;
  /** The player's own words, verbatim. */
  text: string;
  /** Book/source names mentioned in the text, for resolving `book_id`. */
  citations: string[];
}

/**
 * Sources the study cites by shorthand. Matched case-insensitively against the
 * note text so a candidate can be pointed at a row in `books` without the
 * model guessing.
 */
export const SOURCE_PATTERNS: { pattern: RegExp; source: string }[] = [
  { pattern: /\bEDAMI\b/i, source: 'EDAMI' },
  // A trailing `\b` cannot close this one: `ć` is not a word character to a
  // JS regex, so `\bLali[cć]\b` silently never matches the accented spelling —
  // which is the one the study actually uses. A unicode-letter lookahead does
  // the same job for both spellings.
  { pattern: /\bLali[cć](?!\p{L})/iu, source: 'Lalić' },
  { pattern: /\bMarin\b/i, source: 'Marin' },
  { pattern: /\bSilman\b/i, source: 'Silman' },
  { pattern: /\bDe la Villa\b/i, source: 'De la Villa' },
  { pattern: /\bStuder\b/i, source: 'Studer' },
  { pattern: /\bKosten\b/i, source: 'Kosten' },
];

export const citationsIn = (text: string): string[] =>
  SOURCE_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ source }) => source);

/**
 * Notes too short to be a concept. The study uses bare interjections ("NO!",
 * "OJO") as move markers, and they carry no idea on their own — they are
 * already surfaced as trap refutations by the trainer.
 */
const MIN_TEXT_LENGTH = 25;

const walk = (
  nodes: StudyMoveNode[],
  startFen: string,
  startPath: string[],
  out: Omit<StudyConceptCandidate, 'chapterNo' | 'chapterName' | 'eco' | 'color'>[]
): void => {
  const chess = new Chess();
  try {
    chess.load(startFen);
  } catch {
    return;
  }
  const path = [...startPath];

  for (const node of nodes) {
    const fenBefore = chess.fen();
    const pathBefore = [...path];

    let played;
    try {
      played = chess.move(node.san);
    } catch {
      return;
    }
    if (!played) return;

    const text = node.comment?.trim();
    if (text && text.length >= MIN_TEXT_LENGTH) {
      out.push({
        pathSan: pathBefore.join(' '),
        // AFTER the move: a note on 7...O-O is about the position it creates.
        fen: chess.fen(),
        san: played.san,
        text,
        citations: citationsIn(text),
      });
    }

    for (const variation of node.variations) {
      walk(variation, fenBefore, pathBefore, out);
    }

    path.push(played.san);
  }
};

export const extractChapterConcepts = (chapter: StudyChapter): StudyConceptCandidate[] => {
  const { chapterName, eco } = chapter.header;
  const chapterNo = chapterNumber(chapterName);
  const color = chapterColor(chapterName);
  if (chapterNo === null || color === null) return [];

  const partial: Omit<StudyConceptCandidate, 'chapterNo' | 'chapterName' | 'eco' | 'color'>[] = [];
  walk(chapter.mainline, new Chess().fen(), [], partial);

  return partial.map(p => ({ ...p, chapterNo, chapterName, eco, color }));
};

/**
 * Every candidate in the study, deduped on the note text: the same rule is
 * sometimes repeated across chapters, and it is one concept, not three.
 */
export const extractStudyConcepts = (chapters: StudyChapter[]): StudyConceptCandidate[] => {
  const seen = new Set<string>();
  const out: StudyConceptCandidate[] = [];

  for (const chapter of chapters) {
    for (const candidate of extractChapterConcepts(chapter)) {
      const key = candidate.text.replace(/\s+/g, ' ').trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(candidate);
    }
  }
  return out;
};
