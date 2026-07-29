// Start-list parsing for chess-results.com, and matching those players
// against opponents already in `games`.
//
// Regex over the HTML rather than a DOM library, matching how this project
// already parses PGN headers and pasted crosstables (src/utils/pgnUtils.ts,
// src/utils/roundsImport.ts). Adding a scraping dependency for one page shape
// is not worth it, and chess-results serves plain server-rendered tables.
//
// Parsing someone else's HTML is brittle by nature, so nothing here writes:
// it returns candidates for the user to confirm.

export interface StartListEntry {
  /** Starting rank, when the table has that column. */
  rank?: number;
  title?: string;
  name: string;
  rating?: number;
  federation?: string;
}

export interface OpponentMatch {
  entry: StartListEntry;
  /** How the opponent's name is spelled in `games`. */
  playedAs: string;
  games: number;
  /** Score against them, in points. */
  score: number;
}

const stripTags = (html: string): string =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Comparable form of a player name.
 *
 * Chess-results writes "Paredes, Ezequiel"; a PGN might carry "Ezequiel
 * Paredes" and a hand-typed row either. Sorting the name tokens makes the two
 * orders equal, and stripping diacritics makes "Martínez" match "Martinez".
 * Single-token names are kept as-is rather than dropped — a Lichess handle is
 * still a name.
 */
export const normalizeName = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .sort()
    .join(' ');

/** Column index of the first header matching one of `patterns`. */
const columnIndex = (headers: string[], patterns: RegExp[]): number =>
  headers.findIndex(h => patterns.some(p => p.test(h)));

/**
 * FIDE titles, for recovering the title column when it has no header.
 *
 * Real chess-results start lists ship the title column with an empty header
 * cell, so matching on the header alone silently drops every title. The cell
 * sits immediately left of the name, and its contents are from a closed set,
 * so identifying it by content is safe.
 */
const TITLE = /^(G|I|F|C|N)M$|^W(G|I|F|C|N)M$/;

/**
 * Extract the player rows of a chess-results start list.
 *
 * Works off the column headers rather than fixed positions, because the
 * columns differ between the starting-rank list and the alphabetical list,
 * and between tournaments that publish FIDE ratings and those that don't.
 */
export const parseStartList = (html: string): StartListEntry[] => {
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];

  for (const table of tables) {
    const [headerRow, ...bodyRows] = table.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
    if (!headerRow || bodyRows.length === 0) continue;

    const cellsOf = (row: string) =>
      (row.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) ?? []).map(stripTags);

    const headers = cellsOf(headerRow).map(h => h.toLowerCase());
    const nameCol = columnIndex(headers, [/^name$/, /^nombre$/, /apellido/]);
    if (nameCol === -1) continue;

    const rankCol = columnIndex(headers, [/^n[or]\.?$/, /^rk\.?$/, /rank/, /^nr\.?$/]);
    const ratingCol = columnIndex(headers, [/^rtg$/, /rating/, /^elo$/]);
    const fedCol = columnIndex(headers, [/^fed$/, /feder/]);

    const bodyCells = bodyRows.map(cellsOf);
    const headedTitleCol = columnIndex(headers, [/^title$/, /^tit\.?$/, /t[ií]tulo/]);
    // Fall back to the unheaded column just left of the name, when what it
    // actually holds are FIDE titles.
    const titleCol =
      headedTitleCol !== -1
        ? headedTitleCol
        : nameCol > 0 && bodyCells.some(cells => TITLE.test(cells[nameCol - 1] ?? ''))
          ? nameCol - 1
          : -1;

    const entries = bodyCells.flatMap<StartListEntry>(cells => {
      const name = cells[nameCol];
      // Chess-results interleaves group/section separator rows that have far
      // fewer cells; a row without a name in the name column is one of those.
      if (!name || cells.length <= nameCol) return [];
      const rating = ratingCol === -1 ? NaN : Number(cells[ratingCol]);
      const rank = rankCol === -1 ? NaN : Number(cells[rankCol]);
      return [
        {
          name,
          ...(Number.isFinite(rank) && rank > 0 ? { rank } : {}),
          ...(titleCol !== -1 && cells[titleCol] ? { title: cells[titleCol] } : {}),
          ...(Number.isFinite(rating) && rating > 0 ? { rating } : {}),
          ...(fedCol !== -1 && cells[fedCol] ? { federation: cells[fedCol] } : {}),
        },
      ];
    });

    if (entries.length > 0) return entries;
  }

  return [];
};

/** One row per distinct opponent already faced, with the head-to-head. */
export interface PlayedOpponent {
  opponent: string;
  games: number;
  score: number;
}

/**
 * Intersect a start list with opponents already played.
 *
 * Exact match on the normalized name only. The head-to-head panel matches on
 * a raw substring and is flagged in its own code as heuristic; doing that here
 * would propose scouting targets for anyone sharing a surname, and these
 * results are meant to be trustworthy enough to accept in one click.
 */
export const matchOpponents = (
  entries: StartListEntry[],
  played: PlayedOpponent[]
): OpponentMatch[] => {
  const byName = new Map<string, PlayedOpponent>();
  for (const row of played) {
    const key = normalizeName(row.opponent);
    if (!key) continue;
    const existing = byName.get(key);
    // Two spellings of the same person collapse into one head-to-head.
    if (existing) {
      existing.games += row.games;
      existing.score += row.score;
    } else {
      byName.set(key, { ...row });
    }
  }

  return entries
    .flatMap<OpponentMatch>(entry => {
      const hit = byName.get(normalizeName(entry.name));
      return hit ? [{ entry, playedAs: hit.opponent, games: hit.games, score: hit.score }] : [];
    })
    .sort((a, b) => b.games - a.games);
};
