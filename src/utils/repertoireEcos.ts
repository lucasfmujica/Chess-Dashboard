import type { RepertoireLine } from '../types/chess';

/**
 * What ECO codes the repertoire actually covers, derived from the 32 prepared
 * chapters in `repertoire_lines`.
 *
 * The `repertoire` singleton (`white_ecos` / `black_ecos`) was meant to be
 * this, but it is empty: nothing ever wrote it. Everything keyed on it —
 * notably the colour badge in the heroes gallery — therefore resolved to "no
 * colour", which is why every tracked opening piled into an unsorted "Other"
 * group. `repertoire_lines` is the table that is actually populated, so it is
 * the one to read.
 *
 * An ECO is not unique per chapter: nine codes cover two chapters each
 * (A10, A14, A29, A48, A61, A70, B20, B34, B36). Each entry therefore keeps
 * every chapter that uses it rather than pretending there is one.
 */

export interface RepertoireEcoEntry {
  eco: string;
  color: 'W' | 'B';
  /** Lowest (most urgent) priority among the chapters using this ECO. */
  priority: number;
  /** Names of the chapters this code covers, in chapter order. */
  chapters: string[];
}

export type RepertoireEcoIndex = Map<string, RepertoireEcoEntry>;

/** Lines with no priority sort last rather than first. */
const PRIORITY_LAST = Number.MAX_SAFE_INTEGER;

export const buildRepertoireEcoIndex = (lines: RepertoireLine[]): RepertoireEcoIndex => {
  const index: RepertoireEcoIndex = new Map();

  for (const line of lines) {
    const eco = line.eco?.trim();
    if (!eco) continue;

    const priority = line.priority ?? PRIORITY_LAST;
    const chapter = line.lineName ?? eco;
    const existing = index.get(eco);

    if (!existing) {
      index.set(eco, { eco, color: line.color, priority, chapters: [chapter] });
      continue;
    }

    existing.chapters.push(chapter);
    // The most urgent chapter decides where the code sorts, and — if two
    // chapters somehow disagree about colour — which colour it shows under.
    if (priority < existing.priority) {
      existing.priority = priority;
      existing.color = line.color;
    }
  }

  // Chapter names carry a NN prefix, so lexical order is chapter order.
  for (const entry of index.values()) entry.chapters.sort();

  return index;
};

/** The distinct ECOs per colour, for the `repertoire` singleton. */
export const repertoireEcosByColor = (
  index: RepertoireEcoIndex
): { white: string[]; black: string[] } => {
  const white: string[] = [];
  const black: string[] = [];
  for (const entry of index.values()) {
    (entry.color === 'W' ? white : black).push(entry.eco);
  }
  return { white: white.sort(), black: black.sort() };
};

/**
 * Repertoire ECOs with no hero recorded — the gaps. The gallery iterates the
 * heroes map, so without this a missing opening is invisible rather than
 * flagged.
 */
export const ecosMissingHeroes = (
  index: RepertoireEcoIndex,
  heroes: Record<string, string[]>
): RepertoireEcoEntry[] =>
  [...index.values()]
    .filter(entry => !(heroes[entry.eco]?.length > 0))
    .sort((a, b) => a.priority - b.priority || a.eco.localeCompare(b.eco));
