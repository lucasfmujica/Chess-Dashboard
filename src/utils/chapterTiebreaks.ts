import { Chess, type Move } from 'chess.js';
import { sanitizePgn } from '../hooks/useGameReplay';

/**
 * Desempates por jugadas para capítulos del estudio que comparten ECO (01/05 en
 * A14, 29/30 en A25). Se aplican después del filtro por ECO y color de
 * `linkGamesToChapter`. Reglas de Segundo (10/11/2026), ver
 * repertorio/separacion-capitulos-01-05-29-30.md.
 */

export type TiebreakRule =
  | { kind: 'firstBlackMove'; moves: Record<string, number> }
  | {
      kind: 'fenThenF8Bishop';
      /** key = piezas + turno (2 primeros campos del FEN), en orden de precedencia. */
      fens: { key: string; chapter: number }[];
      fenMaxPly: number;
      /** Casilla destino de la 1ª salida del alfil de f8 negro → capítulo. */
      bishop: Record<string, number>;
      bishopMaxPly: number;
      /** Capítulo para la 1ª salida del alfil a g7; null = sin asignar. */
      fianchettoChapter?: number | null;
    };

export interface TiebreakGroup {
  id: string;
  /** Capítulos que comparten ECO. */
  chapters: number[];
  /** ECO y color del filtro que comparten los capítulos del grupo. */
  eco: string;
  color: 'W' | 'B';
  rule: TiebreakRule;
}

export type TiebreakOutcome = { kind: 'chapter'; chapter: number } | { kind: 'unassigned' } | { kind: 'noPgn' };

/**
 * Decisión de Lucas 10/11/2026 09:52: las ...g6/...Bg7 del par 29/30 van al 02.
 * Configurable: null = sin asignar.
 */
export const FIANCHETTO_29_30_TARGET: number | null = 2;

// Líneas de origen: 1.c4 e5 2.Nc3 Nc6 3.g3 Nf6 4.Bg2 Bc5 (29) / Bb4 (30).
const FEN_29 = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2P5/2N3P1/PP1PPPBP/R1BQK1NR w';
const FEN_30 = 'r1bqk2r/pppp1ppp/2n2n2/4p3/1bP5/2N3P1/PP1PPPBP/R1BQK1NR w';

export const CHAPTER_TIEBREAKS: TiebreakGroup[] = [
  {
    id: 'A14-01-05',
    chapters: [1, 5],
    eco: 'A14',
    color: 'W',
    rule: { kind: 'firstBlackMove', moves: { Nf6: 1, e6: 5 } },
  },
  {
    id: 'A25-29-30',
    chapters: [29, 30],
    eco: 'A25',
    color: 'W',
    rule: {
      kind: 'fenThenF8Bishop',
      fens: [
        { key: FEN_29, chapter: 29 },
        { key: FEN_30, chapter: 30 },
      ],
      fenMaxPly: 30,
      bishop: { c5: 29, b4: 30 },
      bishopMaxPly: 24,
      fianchettoChapter: FIANCHETTO_29_30_TARGET,
    },
  },
];

export const tiebreakGroupFor = (
  chapterNo: number | null,
  groups: TiebreakGroup[] = CHAPTER_TIEBREAKS,
): TiebreakGroup | null => (chapterNo === null ? null : (groups.find(g => g.chapters.includes(chapterNo)) ?? null));

/** Capítulos fuera del grupo a los que la regla puede mandar partidas. */
export const redirectTargets = (group: TiebreakGroup): number[] => {
  const rule = group.rule;
  const all: number[] =
    rule.kind === 'firstBlackMove'
      ? Object.values(rule.moves)
      : [
          ...rule.fens.map(f => f.chapter),
          ...Object.values(rule.bishop),
          ...(typeof rule.fianchettoChapter === 'number' ? [rule.fianchettoChapter] : []),
        ];
  return [...new Set(all)].filter(c => !group.chapters.includes(c));
};

const MAX_CACHE = 2000;
const replayCache = new Map<string, Move[] | null>();

/** Mainline de la partida; null si el PGN está vacío, no parsea o no tiene jugadas. */
const replay = (pgn: string | undefined): Move[] | null => {
  if (!pgn || !pgn.trim()) return null;
  const cached = replayCache.get(pgn);
  if (cached !== undefined) return cached;
  let moves: Move[] | null;
  try {
    const chess = new Chess();
    chess.loadPgn(sanitizePgn(pgn));
    const history = chess.history({ verbose: true });
    moves = history.length ? history : null;
  } catch {
    moves = null;
  }
  if (replayCache.size >= MAX_CACHE) replayCache.clear();
  replayCache.set(pgn, moves);
  return moves;
};

const fenKey = (fen: string): string => fen.split(' ').slice(0, 2).join(' ');

const toOutcome = (chapter: number | null | undefined): TiebreakOutcome =>
  typeof chapter === 'number' ? { kind: 'chapter', chapter } : { kind: 'unassigned' };

/** A qué capítulo del grupo (o de afuera, si la regla redirige) va la partida. */
export const classifyGame = (pgn: string | undefined, group: TiebreakGroup): TiebreakOutcome => {
  const moves = replay(pgn);
  if (!moves) return { kind: 'noPgn' };
  const rule = group.rule;

  if (rule.kind === 'firstBlackMove') {
    const san = moves[1]?.san.replace(/[+#!?]+$/, '');
    return toOutcome(san === undefined ? undefined : rule.moves[san]);
  }

  const keys = moves.slice(0, rule.fenMaxPly).map(m => fenKey(m.after));
  for (const { key, chapter } of rule.fens) {
    if (keys.includes(key)) return { kind: 'chapter', chapter };
  }
  const first = moves
    .slice(0, rule.bishopMaxPly)
    .find(m => m.color === 'b' && m.piece === 'b' && m.from === 'f8');
  if (!first) return { kind: 'unassigned' };
  if (first.to === 'g7') return toOutcome(rule.fianchettoChapter);
  return toOutcome(rule.bishop[first.to]);
};
