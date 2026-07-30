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

/** Named entities chess-results actually emits. `frac12` carries every draw. */
const ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  quot: '"',
  frac12: '½',
  aacute: 'á',
  eacute: 'é',
  iacute: 'í',
  oacute: 'ó',
  uacute: 'ú',
  ntilde: 'ñ',
  auml: 'a',
  ouml: 'o',
  uuml: 'u',
};

const stripTags = (html: string): string =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&([a-z0-9]+);/gi, (match, entity: string) => ENTITIES[entity.toLowerCase()] ?? match)
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

// ---------------------------------------------------------------------------
// Player card (art=9): the official record of one player's tournament.
// ---------------------------------------------------------------------------

export interface PlayerCardRound {
  round: number;
  opponent: string;
  opponentTitle?: string;
  /**
   * Opponent rating. **Zero, never undefined, for an unrated opponent** — same
   * contract as ParsedRound in src/utils/roundsImport.ts, for the same reason:
   * `calculateExpectedScore` only special-cases 0.
   */
  opponentElo: number;
  opponentPoints?: number;
  color: 'W' | 'B' | null;
  result: 'W' | 'D' | 'L' | null;
  /** An unplayed round — bye or not paired. There is no game to store. */
  bye: boolean;
  /** Points a bye awarded (chess-results writes them as "- ½"). */
  byePoints?: number;
  /** Viewer-page id for this game's moves, when the event published them. */
  pgnId?: string;
}

export interface PlayerCard {
  name?: string;
  fideId?: string;
  startingRank?: number;
  /** The player's rating going in, as the card reports it. */
  eloBefore?: number;
  performanceRating?: number;
  /**
   * The rating change **as chess-results computes it**, which is not the same
   * as an official FIDE change: unrated events (team rapid, say) still publish
   * a figure here. Whether it moves the curve is `tournaments.affects_elo`,
   * decided per event, not inferred from this number.
   */
  eloChange?: number;
  points?: number;
  place?: number;
  rounds: PlayerCardRound[];
}

/**
 * Force a player-card URL onto the view and language this parser reads.
 *
 * `art=9` is the card itself. `lan` matters more than it looks: the same
 * tournament is served with whatever language the link was copied in — real
 * links have arrived as Swedish (`lan=6`) and Romanian (`lan=27`) — and every
 * label this parser keys on is translated. Pinning `lan=2` (Spanish) means the
 * labels are fixed regardless of where the link came from.
 */
export const normalizePlayerCardUrl = (url: string): string => {
  const parsed = new URL(url);
  parsed.searchParams.set('lan', '2');
  parsed.searchParams.set('art', '9');
  return parsed.toString();
};

/** Comma decimals ("32,40"), footnote markers ("1,60*)"), thin spaces. */
const parseNumber = (raw: string | undefined): number | undefined => {
  if (raw == null) return undefined;
  const value = parseFloat(raw.replace(/[\s*)]/g, '').replace(',', '.'));
  return Number.isFinite(value) ? value : undefined;
};

/**
 * Collapse the colour+result sub-table into plain text ("w|1") inside its own
 * cell.
 *
 * Each round's colour is a `<div class="FarbewT">` (weiß) / `"FarbesT"`
 * (schwarz) inside a `<table>` **nested in** the result cell. That nested
 * table is not cosmetic to a parser: it makes every non-greedy `<tr>…</tr>`
 * match stop at the inner row, truncating the round to its first nine cells
 * and silently dropping the result. Flattening it first keeps the rows
 * single-level *and* keeps cell positions aligned with the header row.
 */
const flattenColourCells = (html: string): string =>
  html.replace(
    /<table>\s*<tr>\s*<td[^>]*>\s*<div class="Farbe([ws])[^"]*">\s*<\/div>\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>\s*<\/table>/gi,
    (_m, colour: string, result: string) => `${colour}|${result}`
  );

const BYE = /^(sin emparejar|not paired|bye|spielfrei|inte parad)/i;

/**
 * Parse a chess-results player card: the summary block plus one row per round.
 *
 * Read-only and tolerant, like parseStartList above — and for the same reason,
 * plus one specific to this page: the round table's columns differ between
 * tournaments (some publish Club/Ciudad, some `we` / `w-we` / `K` / `elo+/-`,
 * some a per-game PGN link), so cells are located by header and never by fixed
 * position.
 */
export const parsePlayerCard = (html: string): PlayerCard => {
  const flat = flattenColourCells(html.replace(/\s+/g, ' '));
  // Raw row kept alongside the stripped cells: the per-game PGN link is an
  // href, which stripTags throws away.
  const rawRows = flat.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  const rows = rawRows.map(row =>
    (row.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) ?? []).map(stripTags)
  );

  // --- summary: two-cell label/value rows --------------------------------
  const info = new Map<string, string>();
  for (const cells of rows) {
    if (cells.length !== 2 || !cells[0]) continue;
    // The name's label sits at the tail of a cell that also holds the whole
    // tournament blurb (schedule, fees, organiser), so key on the tail only.
    info.set(cells[0].length > 40 ? cells[0].slice(-40) : cells[0], cells[1]);
  }
  /** Value whose label ends with any of `labels`, tried in order. */
  const field = (...labels: string[]): string | undefined => {
    for (const label of labels) {
      for (const [key, value] of info) {
        if (key.toLowerCase().endsWith(label.toLowerCase())) return value;
      }
    }
    return undefined;
  };

  const card: PlayerCard = {
    name: field('Nombre', 'Namn', 'Name'),
    fideId: field('Código FIDE', 'Fide ID', 'FIDE-ID'),
    startingRank: parseNumber(field('Ranking inicial', 'Pozitia de start', 'Startnummer')),
    // "Elo internacional" first: on cards that publish both, the bare "Elo"
    // row is the national rating and reads 0 for most Argentine players.
    eloBefore: parseNumber(field('Elo internacional')) ?? parseNumber(field('Elo', 'Rating')),
    performanceRating: parseNumber(field('Performance', 'Perf.rating', 'prestationsrating')),
    eloChange: parseNumber(field('FIDE elo +/-', 'Elo +/-', 'FIDE rtg +/-')),
    points: parseNumber(field('Puntos', 'Puncte', 'Poang')),
    place: parseNumber(field('Puesto', 'Locul', 'Placering')),
    rounds: [],
  };

  // --- rounds -------------------------------------------------------------
  const headerIdx = rows.findIndex(
    cells => cells.length >= 6 && /^Rd\.?$/i.test(cells[0] ?? '')
  );
  if (headerIdx === -1) return card;

  const headers = rows[headerIdx];
  const nameCol = columnIndex(headers, [/^(nombre|namn|name)$/i]);
  if (nameCol === -1) return card;

  const cols = {
    startNo: columnIndex(headers, [/^(no\.?ini\.?|snr|nr\.?ini)$/i]),
    name: nameCol,
    // The title column ships with an empty header, immediately left of the name.
    title: nameCol > 0 && headers[nameCol - 1] === '' ? nameCol - 1 : -1,
    elo: columnIndex(headers, [/^(elo|rating|rtg)$/i]),
    points: columnIndex(headers, [/^(pts\.?|puntos|poang|puncte)$/i]),
    result: columnIndex(headers, [/^res\.?$/i]),
  };

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const cells = rows[i];
    const round = parseNumber(cells[0]);
    // Anything without a leading round number is a separator or the page footer.
    if (round === undefined || cells.length < 5) continue;

    const opponent = cells[cols.name] ?? '';
    const bye = BYE.test(opponent);
    // Only some tournaments publish the moves; when they do, each round links
    // to a viewer page for that game.
    const pgnId = rawRows[i].match(/PartieSuche\.aspx\?art=36&(?:amp;)?id=(\d+)/i)?.[1];

    const rawResult = cols.result >= 0 ? (cells[cols.result] ?? '') : '';
    const colourMatch = rawResult.match(/^([ws])\|(.*)$/);
    const score = (colourMatch ? colourMatch[2] : rawResult).trim();

    card.rounds.push({
      round,
      opponent,
      ...(cols.title >= 0 && cells[cols.title] ? { opponentTitle: cells[cols.title] } : {}),
      opponentElo: (cols.elo >= 0 ? parseNumber(cells[cols.elo]) : undefined) ?? 0,
      ...(cols.points >= 0 && parseNumber(cells[cols.points]) !== undefined
        ? { opponentPoints: parseNumber(cells[cols.points]) }
        : {}),
      // A bye has no colour and no opponent, so both stay null rather than
      // guessing — the caller skips those rounds.
      color: colourMatch ? (colourMatch[1] === 'w' ? 'W' : 'B') : null,
      result:
        score === '1' || score === '+'
          ? 'W'
          : score === '0' || score === '-'
            ? 'L'
            : score === '½'
              ? 'D'
              : null,
      bye,
      ...(bye ? { byePoints: /½/.test(score) ? 0.5 : /1/.test(score) ? 1 : 0 } : {}),
      ...(pgnId ? { pgnId } : {}),
    });
  }

  return card;
};

// ---------------------------------------------------------------------------
// A single game's moves (PartieSuche.aspx?art=36&id=…)
// ---------------------------------------------------------------------------

export interface ParsedGamePgn {
  white: string;
  whiteElo?: number;
  black: string;
  blackElo?: number;
  event?: string;
  /** ISO date, when the page's dd.mm.yyyy could be read. */
  date?: string;
  result?: string;
  /** SAN movetext, move numbers included: "1.c4 e5 2.g3 …". */
  movetext: string;
}

/**
 * Parse the game viewer page chess-results links each round to.
 *
 * The page is a JavaScript board, not a PGN download: there are no PGN
 * headers anywhere on it. What it does have is a title line with both players
 * and their ratings, one anchor per move, and the result in its own paragraph
 * after the moves — which is enough to rebuild a real PGN.
 */
export const parseGamePgn = (html: string): ParsedGamePgn | null => {
  const compact = html.replace(/\s+/g, ' ');

  const moves = [...compact.matchAll(/<a class="game0"[^>]*>([^<]+)<\/a>/gi)].map(m =>
    stripTags(m[1])
  );
  if (moves.length === 0) return null;

  // "<b>Mujica, Lucas</b> (1651) - <b>Prieto, Marcelo</b> (1902)<br>Event …, 09.01.2025"
  const header = compact.match(
    /<b>([^<]+)<\/b>\s*\(([^)]*)\)\s*-\s*<b>([^<]+)<\/b>\s*\(([^)]*)\)\s*<br>([\s\S]*?)<\/p>/i
  );
  const trailer = stripTags(header?.[5] ?? '');
  const dmy = trailer.match(/(\d{2})\.(\d{2})\.(\d{4})/);

  // The result is its own paragraph immediately after the move list.
  const result = compact.match(/<\/p>\s*<p>\s*(1-0|0-1|1\/2-1\/2|½-½|\*)\s*<\/p>/i)?.[1];

  return {
    white: stripTags(header?.[1] ?? ''),
    ...(parseNumber(header?.[2]) ? { whiteElo: parseNumber(header?.[2]) } : {}),
    black: stripTags(header?.[3] ?? ''),
    ...(parseNumber(header?.[4]) ? { blackElo: parseNumber(header?.[4]) } : {}),
    ...(trailer ? { event: trailer.replace(/,?\s*\d{2}\.\d{2}\.\d{4}\s*$/, '').trim() } : {}),
    ...(dmy ? { date: `${dmy[3]}-${dmy[2]}-${dmy[1]}` } : {}),
    ...(result ? { result: result === '½-½' ? '1/2-1/2' : result } : {}),
    movetext: moves.join(' '),
  };
};

/**
 * Assemble a PGN string from a parsed game.
 *
 * `fallbackResult` covers the rare page with no result paragraph: the caller
 * knows the result from the stored game, and a PGN whose movetext ends without
 * one still has to parse.
 */
export const toPgn = (game: ParsedGamePgn, fallbackResult = '*'): string => {
  const result = game.result ?? fallbackResult;
  const headers: [string, string][] = [
    ['Event', game.event ?? 'Unknown'],
    ['Date', game.date ? game.date.replace(/-/g, '.') : '????.??.??'],
    ['White', game.white || 'Unknown'],
    ['Black', game.black || 'Unknown'],
    ['Result', result],
  ];
  if (game.whiteElo) headers.push(['WhiteElo', String(game.whiteElo)]);
  if (game.blackElo) headers.push(['BlackElo', String(game.blackElo)]);

  const tags = headers.map(([key, value]) => `[${key} "${value}"]`).join('\n');
  return `${tags}\n\n${game.movetext} ${result}\n`;
};

/**
 * Does the card reconcile with its own summary?
 *
 * The rounds and the official points come from different parts of the page, so
 * comparing them catches a layout change that silently drops or misreads a
 * round — the failure mode that matters, because a half-parsed card still
 * looks plausible.
 */
export const playerCardReconciles = (card: PlayerCard): boolean => {
  const played = card.rounds.filter(round => !round.bye);
  if (played.length === 0) return false;
  if (played.some(round => !round.color || !round.result)) return false;
  if (card.points === undefined) return false;

  const scored = card.rounds.reduce((sum, round) => {
    if (round.bye) return sum + (round.byePoints ?? 0);
    return sum + (round.result === 'W' ? 1 : round.result === 'D' ? 0.5 : 0);
  }, 0);
  return scored === card.points;
};
