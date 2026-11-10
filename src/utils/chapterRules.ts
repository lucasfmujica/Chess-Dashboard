import { Chess, type Move } from 'chess.js';
import rulesJson from '../constants/chapterRules.json';
import { sanitizePgn } from '../hooks/useGameReplay';
import { tokenizeMovesSan } from './repertoireMatch';
import type { Game } from '../types/chess';

/**
 * Reglas por capítulo del estudio de repertorio (Segundo, 10/11/2026): a qué
 * capítulo va cada partida según sus jugadas y posiciones, sin mirar el ECO.
 * Las reglas viven en `constants/chapterRules.json` (copia de
 * repertorio/reglas-capitulos.json) y este motor es un port 1:1 de
 * `reglas_capitulos.py` (index, eval_entry, match, assign), rarezas incluidas.
 */

export type Side = 'W' | 'B';

export interface ReachSpec {
  line: string;
  /** posKey: piezas + turno (2 primeros campos del FEN). */
  fen: string;
  maxPly: number;
}

export type PlaysItem = string | { san: string; maxPly?: number };

export interface Entry {
  id?: string;
  prefix?: string[];
  reaches?: ReachSpec[];
  whitePlays?: PlaysItem[];
  blackPlays?: PlaysItem[];
  firstMoveFrom?: { square: string; to: string };
  maxPly?: number;
  exclude?: Entry[];
}

export interface ChapterRule {
  /** Número NN del título, con dos dígitos ('01'). */
  chapter: string;
  name: string;
  color: Side;
  studyEco: string;
  entries: Entry[];
  exclude: Entry[];
  priority: number;
  transpositions?: string;
  notes?: string;
}

export interface ChapterRulesFile {
  version: string;
  author: string;
  estudio: string;
  semantica: Record<string, unknown>;
  pares: { eco: string; capitulos: string[] }[];
  capitulos: Record<string, ChapterRule>;
}

export const CHAPTER_RULES_FILE = rulesJson as unknown as ChapterRulesFile;
export const CHAPTER_RULES: ChapterRule[] = Object.values(CHAPTER_RULES_FILE.capitulos);

// 10b/28c/28d aprobadas por Lucas el 10/11/2026 10:07; 02a/08c/08d aprobadas por Lucas el 10/11/2026 10:40: se usan todas las entries del JSON (`propuesta` se ignora).

const DEFAULT_MAX_PLY = 30;
/**
 * Plies que se indexan por partida. Nada del motor lee más allá del ply 30: en
 * el JSON el maxPly explícito máximo es 24, el default es DEFAULT_MAX_PLY (30)
 * y el prefijo máximo es 5 jugadas.
 */
export const INDEX_PLIES = 30;

export interface IndexedMove {
  ply: number;
  side: Side;
  san: string;
  from: string;
  to: string;
}

export interface ChapterIndex {
  /** Todas las jugadas SAN de la línea principal, normalizadas. */
  sans: string[];
  /** posKey tras cada uno de los primeros INDEX_PLIES plies. */
  keys: string[];
  /** Los primeros INDEX_PLIES plies. */
  moves: IndexedMove[];
}

const norm = (san: string): string => san.replace(/[+#!?]+$/, '');
const posKey = (fen: string): string => fen.split(' ').slice(0, 2).join(' ');

const buildIndex = (sans: string[], played: Move[]): ChapterIndex => {
  const head = played.slice(0, INDEX_PLIES);
  return {
    sans: sans.map(norm),
    keys: head.map(m => posKey(m.after)),
    moves: head.map((m, i) => ({
      ply: i + 1,
      side: m.color === 'w' ? 'W' : 'B',
      san: norm(m.san),
      from: m.from,
      to: m.to,
    })),
  };
};

/** Índice desde una lista SAN (tests): juega cada jugada con chess.js. */
export const indexFromSans = (sans: string[]): ChapterIndex => {
  const chess = new Chess();
  const played = sans.slice(0, INDEX_PLIES).map(san => chess.move(san));
  return buildIndex(sans, played);
};

const MAX_CACHE = 4000;
const indexCache = new Map<string, ChapterIndex | null>();

const HAS_SETUP = /\[(?:FEN|SetUp) /;

/** Camino completo (PGN con posición inicial propia): loadPgn de toda la partida. */
const indexFromFullPgn = (pgn: string): ChapterIndex | null => {
  const chess = new Chess();
  chess.loadPgn(sanitizePgn(pgn));
  const history = chess.history({ verbose: true });
  return history.length ? buildIndex(history.map(m => m.san), history) : null;
};

/** Camino rápido: el motor solo usa INDEX_PLIES plies, así que juega solo esos tokens. */
const indexFromPrefix = (pgn: string): ChapterIndex | null => {
  const movetext = sanitizePgn(pgn.replace(/^\s*\[.*$/gm, ' '));
  const chess = new Chess();
  const played: Move[] = [];
  for (const token of tokenizeMovesSan(movetext).slice(0, INDEX_PLIES)) {
    played.push(chess.move(token));
  }
  return played.length ? buildIndex(played.map(m => m.san), played) : null;
};

/**
 * Índice de la línea principal de un PGN, con el mismo resultado que `parsePgn`
 * en los primeros INDEX_PLIES plies.
 * null = sin jugadas (vacío, no parsea, jugada ilegal o 0 jugadas).
 */
export const indexFromPgn = (pgn: string | undefined): ChapterIndex | null => {
  if (!pgn || !pgn.trim()) return null;
  const cached = indexCache.get(pgn);
  if (cached !== undefined) return cached;
  let idx: ChapterIndex | null;
  try {
    idx = HAS_SETUP.test(pgn) ? indexFromFullPgn(pgn) : indexFromPrefix(pgn);
  } catch {
    idx = null;
  }
  if (indexCache.size >= MAX_CACHE) indexCache.clear();
  indexCache.set(pgn, idx);
  return idx;
};

/** true si el PGN ya está en la cache de índices (indexarlo no cuesta nada). */
export const isPgnIndexed = (pgn: string | undefined): boolean => !pgn || !pgn.trim() || indexCache.has(pgn);

/** Ply en que la entry quedó cumplida, o null si no matchea. */
export const evalEntry = (e: Entry, idx: ChapterIndex): number | null => {
  const { sans, keys, moves } = idx;
  let depth = 0;
  for (const x of e.exclude ?? []) {
    if (evalEntry(x, idx) !== null) return null;
  }
  if (e.prefix !== undefined) {
    const p = e.prefix;
    const head = sans.slice(0, p.length);
    if (head.length !== p.length || p.some((san, i) => head[i] !== san)) return null;
    depth = Math.max(depth, p.length);
  }
  const mp = e.maxPly ?? DEFAULT_MAX_PLY;
  if (e.reaches !== undefined) {
    let hit: number | null = null;
    for (const r of e.reaches) {
      const i = keys.slice(0, r.maxPly).indexOf(r.fen);
      if (i !== -1) hit = hit === null ? i + 1 : Math.min(hit, i + 1);
    }
    if (hit === null) return null;
    depth = Math.max(depth, hit);
  }
  for (const [side, needs] of [
    ['W', e.whitePlays],
    ['B', e.blackPlays],
  ] as const) {
    for (const need of needs ?? []) {
      const lim = typeof need === 'object' ? (need.maxPly ?? mp) : mp;
      const san = typeof need === 'object' ? need.san : need;
      const m = moves.slice(0, lim).find(x => x.side === side && x.san === san);
      if (!m) return null;
      depth = Math.max(depth, m.ply);
    }
  }
  if (e.firstMoveFrom !== undefined) {
    const f = e.firstMoveFrom;
    // Cualquier lado y pieza, como el Python.
    const first = moves.slice(0, mp).find(x => x.from === f.square);
    if (!first || first.to !== f.to) return null;
    depth = Math.max(depth, first.ply);
  }
  return depth;
};

export interface RuleOptions {
  /** Reglas a usar; por defecto las del JSON. */
  rules?: ChapterRule[];
}

export interface ChapterMatch {
  depth: number;
  entryId: string;
}

/** La entry más profunda del capítulo (empate: la primera), o null. */
export const matchChapter = (rule: ChapterRule, idx: ChapterIndex): ChapterMatch | null => {
  for (const x of rule.exclude) {
    if (evalEntry(x, idx) !== null) return null;
  }
  let best: ChapterMatch | null = null;
  for (const e of rule.entries) {
    const d = evalEntry(e, idx);
    if (d !== null && (best === null || d > best.depth)) best = { depth: d, entryId: e.id ?? '' };
  }
  return best;
};

export interface ChapterAssignment {
  chapter: string;
  entryId: string;
  depth: number;
}

/**
 * Capítulo con regla para una partida de ese color: mayor profundidad, después
 * menor priority, después menor número de capítulo.
 */
export const assignByRules = (color: Side, idx: ChapterIndex, opts: RuleOptions = {}): ChapterAssignment | null => {
  const cands: (ChapterAssignment & { priority: number })[] = [];
  for (const rule of opts.rules ?? CHAPTER_RULES) {
    if (rule.color !== color) continue;
    const m = matchChapter(rule, idx);
    if (m) cands.push({ chapter: rule.chapter, entryId: m.entryId, depth: m.depth, priority: rule.priority });
  }
  if (!cands.length) return null;
  cands.sort((a, b) => b.depth - a.depth || a.priority - b.priority || Number(a.chapter) - Number(b.chapter));
  const { chapter, entryId, depth } = cands[0];
  return { chapter, entryId, depth };
};

export type AssignmentOptions = RuleOptions;

export interface ChapterAssignmentResult {
  byGame: Map<Game, ChapterAssignment>;
  /** Partidas sin jugadas legibles: no entran en capítulos con regla. */
  noMoves: Game[];
  /** Capítulos que tienen regla (claves del JSON). */
  ruleChapters: Set<string>;
}

const assignmentCache = new WeakMap<Game[], ChapterAssignmentResult>();

/** A qué capítulo con regla va cada partida, de una vez para todas. Pura. */
export const buildChapterAssignment = (games: Game[], opts?: AssignmentOptions): ChapterAssignmentResult => {
  if (!opts) {
    const cached = assignmentCache.get(games);
    if (cached) return cached;
  }
  const rules = opts?.rules ?? CHAPTER_RULES;
  const byGame = new Map<Game, ChapterAssignment>();
  const noMoves: Game[] = [];
  for (const game of games) {
    if (game.color !== 'W' && game.color !== 'B') continue;
    const idx = indexFromPgn(game.pgn);
    if (!idx) {
      noMoves.push(game);
      continue;
    }
    const assigned = assignByRules(game.color, idx, opts);
    if (assigned) byGame.set(game, assigned);
  }
  const result: ChapterAssignmentResult = { byGame, noMoves, ruleChapters: new Set(rules.map(r => r.chapter)) };
  if (!opts) assignmentCache.set(games, result);
  return result;
};
