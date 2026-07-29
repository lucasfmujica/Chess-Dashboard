import type { Book, BookStatus } from '../types/training';

/**
 * Parser for the pasted library format:
 *
 *   Título | Autor | Fuente | Estado | Bloque o nota
 *
 * Only the title is required; trailing fields may be blank or missing. The
 * note field mixes three things in practice — a weekly-block token, a
 * Chessable-style `215/516` count, and free prose — so they are pulled apart
 * here rather than left as one opaque string, since the "nothing new until
 * something finishes" rule needs the count to be a number.
 */

export type ParsedBook = Pick<
  Book,
  'title' | 'author' | 'status' | 'source' | 'block' | 'progressDone' | 'progressTotal' | 'notes'
>;

const STATUSES: BookStatus[] = ['activo', 'referencia', 'archivado'];

/** Weekly-block tokens as written in the plan, e.g. 'viernes-conceptos'. */
const BLOCK_TOKEN = /\b((?:lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo|5min)[-\w]*)/i;

/** A Chessable-style completion count: '215/516'. */
const PROGRESS = /(\d+)\s*\/\s*(\d+)/;

/**
 * Normalize an accented/miscased status word. Anything unrecognized falls
 * back to `archivado` — the safe default, since wrongly promoting a book to
 * `activo` is the exact failure this whole feature exists to prevent.
 */
const parseStatus = (raw?: string): BookStatus => {
  const normalized = (raw ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // strip combining accents
  return (STATUSES as string[]).includes(normalized) ? (normalized as BookStatus) : 'archivado';
};

/** Split the note field into block / progress / leftover prose. */
export const parseNote = (
  note: string
): Pick<ParsedBook, 'block' | 'progressDone' | 'progressTotal' | 'notes'> => {
  let rest = note.trim();

  const progressMatch = rest.match(PROGRESS);
  const progressDone = progressMatch ? Number(progressMatch[1]) : undefined;
  const progressTotal = progressMatch ? Number(progressMatch[2]) : undefined;
  if (progressMatch) rest = rest.replace(progressMatch[0], ' ');

  const blockMatch = rest.match(BLOCK_TOKEN);
  const block = blockMatch ? blockMatch[1].toLowerCase() : undefined;
  if (blockMatch) rest = rest.replace(blockMatch[0], ' ');

  // Whatever is left is prose; strip the separator dots the plan uses.
  const notes = rest
    .split('·')
    .map(part => part.trim())
    .filter(Boolean)
    .join(' · ')
    .trim();

  return { block, progressDone, progressTotal, notes: notes || undefined };
};

/** Parse one pasted line. Returns null for a line with no title. */
export const parseLibraryLine = (line: string): ParsedBook | null => {
  // Split on '|' only. The previous parser split on ' - ', which mangled
  // titles that legitimately contain a dash ('Tal - Botvinnik 1960').
  const fields = line.split('|').map(f => f.trim());
  const title = fields[0]?.trim();
  if (!title) return null;

  const [, author, source, status, ...noteParts] = fields;
  const { block, progressDone, progressTotal, notes } = parseNote(noteParts.join(' | '));

  return {
    title,
    author: author || undefined,
    source: source ? source.toLowerCase() : undefined,
    status: parseStatus(status),
    block,
    progressDone,
    progressTotal,
    notes,
  };
};

/** Parse a whole pasted block, skipping blank lines. */
export const parseLibrary = (text: string): ParsedBook[] =>
  text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(parseLibraryLine)
    .filter((b): b is ParsedBook => b !== null);
