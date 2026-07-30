// The review queue both concept importers write into.
//
// Nothing either extractor produces is inserted directly. They write entries
// here, you flip `approve` on the ones worth keeping, and a second command
// stores those. Shared so the two sources — your own study annotations and the
// books — land in one file with one approval step rather than two.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Chess } from 'chess.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const REVIEW_PATH = path.join(__dirname, '../concept-candidates.json');

/** Where a candidate came from. Stored on the concept as `source_type`. */
export type ConceptSourceType = 'study-chapter' | 'book';

export interface ReviewEntry {
  /** Flip to true to have the insert step store this one. */
  approve: boolean;
  name: string;
  category: string;
  summary: string;
  sourceChapter: string;
  sourceType: ConceptSourceType;
  exampleFens: string[];
  bookId?: string;
  bookTitle?: string;

  // ---- provenance, for the reviewer only; never stored ----
  /** Study source: book names the note cites. */
  citations?: string[];
  /** Study source: SAN path and move the note is attached to. */
  pathSan?: string;
  san?: string;
  /** Book source: page of the PDF the idea was read from. */
  page?: number;
  /**
   * Book source: the sentence from the book that supports it. Unlike the study
   * extractor — where `summary` IS your own text, verbatim — a book candidate's
   * `summary` is written by the model. This quote is how you check it.
   */
  quote?: string;
  /** Set when an existing concept already has this name. */
  duplicateOf?: string;
}

export const readReview = (): ReviewEntry[] => {
  if (!existsSync(REVIEW_PATH)) return [];
  return JSON.parse(readFileSync(REVIEW_PATH, 'utf8')) as ReviewEntry[];
};

/**
 * Appends to the review file rather than replacing it, so importing a second
 * book doesn't discard the candidates you were halfway through reviewing.
 * Entries already marked `approve` are kept as-is.
 */
export const appendReview = (entries: ReviewEntry[]): { added: number; total: number } => {
  const existing = readReview();
  const seen = new Set(existing.map(e => `${e.sourceType}|${e.sourceChapter}|${e.name}`));
  const added = entries.filter(e => !seen.has(`${e.sourceType}|${e.sourceChapter}|${e.name}`));
  const all = [...existing, ...added];
  writeFileSync(REVIEW_PATH, `${JSON.stringify(all, null, 2)}\n`);
  return { added: added.length, total: all.length };
};

/** Replaces the file outright — for a fresh extraction run. */
export const writeReview = (entries: ReviewEntry[]): void => {
  writeFileSync(REVIEW_PATH, `${JSON.stringify(entries, null, 2)}\n`);
};

/**
 * A FEN the board can actually load. Model-supplied positions are checked here
 * and dropped when invalid: a wrong position stored as an example is worse
 * than no example, because the trainer would show it as if it were yours.
 */
export const isValidFen = (fen: string): boolean => {
  if (!fen.trim()) return false;
  try {
    new Chess(fen);
    return true;
  } catch {
    return false;
  }
};

export const CATEGORIES = [
  'opening',
  'middlegame',
  'endgame',
  'calculation',
  'strategy',
  'mindset',
] as const;
