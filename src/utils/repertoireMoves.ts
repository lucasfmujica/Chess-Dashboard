import { Chess } from 'chess.js';
import type { StudyChapter, StudyMoveNode } from './studyPgn';

/**
 * Explodes the repertoire study into one trainable row per decision.
 *
 * The existing trainer (`OpeningsFlashcardsTab`) grades one text card per
 * chapter — 32 cards for a study that holds ~1100 moves across its mainlines
 * and 295 variations. Half of those moves are the player's, and each one is a
 * separate thing to remember: recalling "I play the Accelerated Dragon" is not
 * the same as recalling that on move 7 it is `O-O` and never `Ng4`.
 *
 * Kept pure and free of React so the walk can be tested directly and reused by
 * the import script, which runs in Node with no DOM.
 */

/** What a row is for. Only `main` is scheduled by the SRS. */
export type RepertoireMoveRole = 'main' | 'alt' | 'trap';

export interface RepertoireMoveRow {
  /** 1-32, parsed from the `NN ` prefix of the chapter name. */
  chapterNo: number;
  chapterName: string;
  eco: string;
  /** The side the player has in this chapter, from BLANCAS/NEGRAS in its name. */
  color: 'W' | 'B';
  /**
   * SAN moves leading to `fenBefore`, space-joined — the identity of the
   * position WITHIN this chapter.
   *
   * Deliberately not the FEN: two paths that transpose are two different
   * things to remember, and collapsing them would silently drop one of the
   * two move-orders the study is teaching.
   */
  pathSan: string;
  fenBefore: string;
  expectedSan: string;
  /** The opponent's scripted answer, so the trainer can play on without re-walking the tree. */
  replySan?: string;
  comment?: string;
  /** False when the row comes from inside a variation rather than the chapter's mainline. */
  isMainline: boolean;
  role: RepertoireMoveRole;
  /** Ply count of `pathSan`, so a session can serve a line front to back. */
  depth: number;
}

/**
 * NAGs that mark a move the study records *because it loses*. The parser
 * strips the `?` suffix off the SAN into this array, so it is the only signal
 * left: `(7... Ng4? { NO! })` arrives as san `Ng4`, nag `['$2']`.
 */
const LOSING_NAGS = new Set(['$2', '$4', '$6']); // ? ?? ?!

const isTrap = (node: StudyMoveNode): boolean =>
  (node.nag ?? []).some(nag => LOSING_NAGS.has(nag));

/**
 * The player's side, from the chapter title. Every chapter in the study is
 * named `NN BLANCAS - …` or `NN NEGRAS vs …`, which is a stronger signal than
 * the ECO code: A10 covers both a White chapter and a Black one.
 */
export const chapterColor = (chapterName: string): 'W' | 'B' | null => {
  if (/BLANCAS/i.test(chapterName)) return 'W';
  if (/NEGRAS/i.test(chapterName)) return 'B';
  return null;
};

/**
 * The `NN` prefix. This is the ONLY stable join between the study PGN and the
 * `repertoire_lines` rows: their `lichess_url`s point at different study ids
 * (the table was filled from an earlier export) and their names differ in
 * punctuation, but both sides carry the same chapter number.
 */
export const chapterNumber = (chapterName: string): number | null => {
  const match = /^\s*(\d{1,2})\b/.exec(chapterName);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
};

interface WalkContext {
  chapterNo: number;
  chapterName: string;
  eco: string;
  color: 'W' | 'B';
  rows: RepertoireMoveRow[];
}

const turnLetter = (color: 'W' | 'B') => (color === 'W' ? 'w' : 'b');

/**
 * Walks one chain of moves from `startFen`, recursing into each node's
 * variations.
 *
 * A node's `variations` REPLACE that node, so they branch from the position
 * *before* it — they are re-walked from the same FEN and path, not from after
 * the move. Getting this backwards would shift every variation by one ply and
 * quietly teach the wrong position.
 */
const walkLine = (
  nodes: StudyMoveNode[],
  startFen: string,
  startPath: string[],
  isMainline: boolean,
  ctx: WalkContext
): void => {
  const chess = new Chess();
  try {
    chess.load(startFen);
  } catch {
    return;
  }
  const path = [...startPath];

  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    const fenBefore = chess.fen();
    const pathBefore = [...path];

    const mine = chess.turn() === turnLetter(ctx.color);
    const trap = isTrap(node);

    // Played BEFORE the row is emitted: an unplayable SAN would otherwise be
    // stored as a card that can never be answered correctly. `played.san` is
    // also chess.js's normalised spelling, which is what the trainer compares
    // the user's move against.
    let played;
    try {
      played = chess.move(node.san);
    } catch {
      return; // Malformed SAN — abandon this branch rather than desync the board.
    }
    if (!played) return;

    if (mine) {
      const pathSan = path.join(' ');
      // First non-trap move recorded from a position is the one to play; a
      // later sibling is a real alternative the study also endorses, but the
      // trainer needs exactly one answer to schedule. This runs BEFORE the
      // variations below, so the node on the line being walked always claims
      // `main` and an alternative offered under it can only ever be `alt`.
      const hasMain = ctx.rows.some(
        row => row.chapterNo === ctx.chapterNo && row.pathSan === pathSan && row.role === 'main'
      );
      const role: RepertoireMoveRole = trap ? 'trap' : hasMain ? 'alt' : 'main';

      ctx.rows.push({
        chapterNo: ctx.chapterNo,
        chapterName: ctx.chapterName,
        eco: ctx.eco,
        color: ctx.color,
        pathSan,
        fenBefore,
        expectedSan: played.san,
        replySan: nodes[i + 1]?.san,
        // A trap's own text is usually empty because the study writes the
        // refutation on the punishing reply instead — `(7... Qb6?! 8. Nf5
        // { El castigo del libro… })`. Falling back to it is what makes the
        // wrong-move feedback say anything at all.
        comment: node.comment ?? (trap ? nodes[i + 1]?.comment : undefined),
        isMainline,
        role,
        depth: path.length,
      });
    }

    // Alternatives to this move branch from the position before it.
    for (const variation of node.variations) {
      walkLine(variation, fenBefore, pathBefore, false, ctx);
    }

    // A trap is a move the study says loses, so the line after it is the
    // punishment, not preparation. Recording the move is the point; walking on
    // would emit the player's moves inside a line they are told never to reach.
    if (trap && mine) return;

    path.push(played.san);
  }
};

/** Every trainable decision in one chapter, mainline and variations. */
export const extractChapterMoves = (chapter: StudyChapter): RepertoireMoveRow[] => {
  const { chapterName, eco } = chapter.header;
  const chapterNo = chapterNumber(chapterName);
  const color = chapterColor(chapterName);
  if (chapterNo === null || color === null) return [];

  const ctx: WalkContext = { chapterNo, chapterName, eco, color, rows: [] };
  walkLine(chapter.mainline, new Chess().fen(), [], true, ctx);
  return ctx.rows;
};

/**
 * Every trainable decision in the study.
 *
 * Rows are deduped on (chapter, path, move): the same position reached twice
 * inside one chapter is one card, and the first occurrence wins so a mainline
 * row is never demoted by a later variation that repeats it.
 */
export const extractRepertoireMoves = (chapters: StudyChapter[]): RepertoireMoveRow[] => {
  const seen = new Set<string>();
  const rows: RepertoireMoveRow[] = [];

  for (const chapter of chapters) {
    for (const row of extractChapterMoves(chapter)) {
      const key = `${row.chapterNo}|${row.pathSan}|${row.expectedSan}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
    }
  }
  return rows;
};

/** Rows the SRS schedules — traps and alternates are reference material. */
export const schedulableMoves = <T extends { role: RepertoireMoveRole }>(rows: T[]): T[] =>
  rows.filter(row => row.role === 'main');

/** The shape `buildLines` needs — satisfied by both the extractor row and the domain type. */
export interface ChainableMove {
  pathSan: string;
  expectedSan: string;
  replySan?: string;
}

/**
 * Where the line continues after this move and the opponent's scripted answer.
 * Null when the study stops here, which is what ends a line.
 */
export const continuationPath = (move: ChainableMove): string | null =>
  move.replySan
    ? [move.pathSan, move.expectedSan, move.replySan].filter(Boolean).join(' ')
    : null;

/**
 * Reassembles the flat rows into the lines a session actually plays.
 *
 * The rows form a tree, not a list: a chapter's mainline and each of its
 * variations are separate branches that only share a prefix. Serving them in
 * depth order would jump between branches mid-line and put a position on the
 * board that does not follow from the move just played.
 *
 * A move chains to the one whose path is exactly this path plus this move plus
 * the reply, so following that link from every head yields one playable line
 * per branch. Heads are the moves nothing else chains into.
 */
export const buildLines = <T extends ChainableMove>(moves: T[]): T[][] => {
  const byPath = new Map<string, T>();
  for (const move of moves) {
    // One `main` move per position; a duplicate would mean a broken import.
    if (!byPath.has(move.pathSan)) byPath.set(move.pathSan, move);
  }

  const chainedInto = new Set<string>();
  for (const move of moves) {
    const next = continuationPath(move);
    if (next !== null && byPath.has(next)) chainedInto.add(next);
  }

  const heads = moves
    .filter(move => !chainedInto.has(move.pathSan))
    .sort((a, b) => a.pathSan.length - b.pathSan.length || a.pathSan.localeCompare(b.pathSan));

  return heads.map(head => {
    const line: T[] = [];
    // `visited` is a cycle guard: a malformed import must not hang the trainer.
    const visited = new Set<string>();
    let current: T | undefined = head;

    while (current && !visited.has(current.pathSan)) {
      visited.add(current.pathSan);
      line.push(current);
      const next = continuationPath(current);
      current = next === null ? undefined : byPath.get(next);
    }
    return line;
  });
};
