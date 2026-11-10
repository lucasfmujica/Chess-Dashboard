import {
  CHAPTER_TIEBREAKS,
  classifyGame,
  redirectTargets,
  tiebreakGroupFor,
  type TiebreakGroup,
} from './chapterTiebreaks';
import { chapterColor, chapterNumber } from './repertoireMoves';
import { isDue } from './srs';
import type { StudyChapter, StudyChapterHeader } from './studyPgn';
import type { Game, PlayerColor, RepertoireMove } from '../types/chess';

/**
 * Vincula un capítulo del estudio de repertorio con los datos que lo miden:
 * las partidas propias jugadas con esa apertura y las jugadas de repertorio
 * de ese capítulo que están vencidas para repasar.
 *
 * El PGN del estudio no trae ningún id compartido con las partidas, así que
 * el vínculo con ellas es por ECO (o rango ECO), y si falta, por nombre de
 * apertura. Con las jugadas de repertorio sí hay una llave estable: el número
 * `NN` del título del capítulo.
 */

const ECO_CODE = /^([A-E])(\d{2})$/i;
const ECO_RANGE = /^([A-E]\d{2})\s*[-–]\s*([A-E]\d{2})$/i;

/** Código ECO a un número ordenable (A00 → 0, E99 → 499), o null si no es ECO. */
const ecoOrdinal = (eco: string): number | null => {
  const match = ECO_CODE.exec(eco.trim());
  if (!match) return null;
  return (match[1].toUpperCase().charCodeAt(0) - 65) * 100 + Number(match[2]);
};

/**
 * El ECO del capítulo como rango cerrado. Acepta un código suelto (`B30`) o un
 * rango (`B30-B39`); cualquier otra cosa da null.
 */
export const parseEcoRange = (eco: string | undefined): [number, number] | null => {
  if (!eco) return null;
  const trimmed = eco.trim();
  const range = ECO_RANGE.exec(trimmed);
  if (range) {
    const from = ecoOrdinal(range[1]);
    const to = ecoOrdinal(range[2]);
    if (from === null || to === null) return null;
    return from <= to ? [from, to] : [to, from];
  }
  const single = ecoOrdinal(trimmed);
  return single === null ? null : [single, single];
};

/** True si el ECO de la partida cae dentro del ECO (o rango) del capítulo. */
export const ecoMatches = (chapterEco: string | undefined, gameEco: string | undefined): boolean => {
  const range = parseEcoRange(chapterEco);
  if (!range || !gameEco) return false;
  const value = ecoOrdinal(gameEco);
  return value !== null && value >= range[0] && value <= range[1];
};

const normalizeName = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * True si la apertura de la partida es la del capítulo o una variante suya:
 * "Sicilian Defense: Najdorf" entra en un capítulo "Sicilian Defense".
 */
export const openingMatches = (chapterOpening: string | undefined, gameOpening: string | undefined): boolean => {
  if (!chapterOpening || !gameOpening) return false;
  // Split on the `Familia: Variante, Subvariante` punctuation before
  // normalizing, so "French" never swallows "French Defense".
  const parts = (name: string) => name.split(/[:,]/).map(normalizeName);
  const chapter = parts(chapterOpening);
  const game = parts(gameOpening);
  if (!chapter[0] || !game[0] || game.length < chapter.length) return false;
  return chapter.every((part, i) => part === game[i]);
};

/** El lado del jugador en el capítulo, por BLANCAS/NEGRAS en el título. */
export const chapterSide = (header: StudyChapterHeader): PlayerColor | null =>
  chapterColor(header.chapterName);

const sameGame = (a: Game, b: Game): boolean => a === b || (a.id !== undefined && a.id === b.id);

export type GameLinkMethod = 'eco' | 'opening' | 'tiebreak' | null;

export interface ChapterGamesLink {
  games: Game[];
  /** Cómo se vincularon; null cuando el capítulo no trae ni ECO ni apertura. */
  method: GameLinkMethod;
  /** Color filtrado; null cuando cuentan los dos. */
  color: PlayerColor | null;
  /** Partidas del ECO del capítulo sin PGN legible: no se pueden asignar. */
  noPgn: Game[];
  /** Partidas del ECO del par que el desempate no manda a ningún capítulo. */
  unassigned: Game[];
  /** Id del grupo de desempate aplicado, si hubo. */
  tiebreakGroup?: string;
}

/**
 * Las partidas propias que corresponden al capítulo. Por ECO si el capítulo
 * trae uno válido; si no, por nombre de apertura. Filtra por el color del
 * capítulo cuando se puede deducir del título. Si el capítulo comparte ECO con
 * otro (tabla de desempates), después se queda solo con las partidas que las
 * jugadas asignan a este capítulo.
 */
export const linkGamesToChapter = (
  header: StudyChapterHeader,
  games: Game[],
  groups: TiebreakGroup[] = CHAPTER_TIEBREAKS,
): ChapterGamesLink => {
  const color = chapterSide(header);
  const sameSide = color ? games.filter(g => g.color === color) : games;
  const chapterNo = chapterNumber(header.chapterName);

  let method: GameLinkMethod = null;
  let linked: Game[] = [];
  if (parseEcoRange(header.eco)) {
    method = 'eco';
    linked = sameSide.filter(g => ecoMatches(header.eco, g.eco));
  } else if (header.opening.trim()) {
    method = 'opening';
    linked = sameSide.filter(g => openingMatches(header.opening, g.opening));
  }

  const noPgn: Game[] = [];
  const unassigned: Game[] = [];
  let tiebreakGroup: string | undefined;

  const group = method ? tiebreakGroupFor(chapterNo, groups) : null;
  if (group && chapterNo !== null) {
    const own: Game[] = [];
    for (const g of linked) {
      const outcome = classifyGame(g.pgn, group);
      if (outcome.kind === 'noPgn') noPgn.push(g);
      else if (outcome.kind === 'unassigned') unassigned.push(g);
      else if (outcome.chapter === chapterNo) own.push(g);
    }
    linked = own;
    method = 'tiebreak';
    tiebreakGroup = group.id;
  }

  // Capítulo de afuera de un par al que la regla de un grupo le manda partidas.
  if (method && chapterNo !== null) {
    for (const g of groups) {
      if (g.chapters.includes(chapterNo) || !redirectTargets(g).includes(chapterNo)) continue;
      if (color && color !== g.color) continue;
      for (const game of games) {
        if (game.color !== g.color || !ecoMatches(g.eco, game.eco) || linked.some(l => sameGame(l, game))) continue;
        const outcome = classifyGame(game.pgn, g);
        if (outcome.kind === 'chapter' && outcome.chapter === chapterNo) linked = [...linked, game];
      }
    }
  }

  const result: ChapterGamesLink = { games: linked, method, color, noPgn, unassigned };
  if (tiebreakGroup) result.tiebreakGroup = tiebreakGroup;
  return result;
};

export interface LineScore {
  points: number;
  total: number;
  /** Porcentaje 0-100 redondeado; null sin partidas. */
  pct: number | null;
  wins: number;
  draws: number;
  losses: number;
}

export const scoreGames = (games: Pick<Game, 'result'>[]): LineScore => {
  let wins = 0;
  let draws = 0;
  let losses = 0;
  for (const g of games) {
    if (g.result === 'W') wins++;
    else if (g.result === 'D') draws++;
    else if (g.result === 'L') losses++;
  }
  const total = wins + draws + losses;
  const points = wins + draws / 2;
  return { points, total, pct: total ? Math.round((points / total) * 100) : null, wins, draws, losses };
};

/** Puntos con medio punto en notación de planilla: 4.5 → "4½", 0.5 → "½". */
export const formatPoints = (points: number): string => {
  const whole = Math.floor(points);
  const half = points - whole >= 0.5;
  if (!half) return String(whole);
  return whole === 0 ? '½' : `${whole}½`;
};

/** Las jugadas SAN de la línea principal del capítulo, en orden. */
export const chapterMainlineSans = (chapter: StudyChapter): string[] => chapter.mainline.map(n => n.san);

const splitSan = (path: string): string[] => path.split(/\s+/).filter(Boolean);

export type MoveLinkMethod = 'chapter' | 'moves' | null;

export interface ChapterReview {
  /** Jugadas `main` del capítulo vencidas hoy. */
  due: number;
  /** Jugadas `main` del capítulo en total. */
  total: number;
  method: MoveLinkMethod;
}

type ReviewMove = Pick<
  RepertoireMove,
  'chapterNo' | 'chapterName' | 'color' | 'pathSan' | 'expectedSan' | 'role' | 'lastReviewed' | 'confidence'
>;

/**
 * Las jugadas de repertorio de este capítulo y cuántas están vencidas.
 *
 * Primero por el número `NN` del título (la llave que usa el importador);
 * después por nombre exacto de capítulo; y si ninguna de las dos aparece,
 * por secuencia: la jugada pertenece si su línea (camino + jugada esperada)
 * sigue la línea principal del capítulo desde el principio.
 */
export const chapterReview = (chapter: StudyChapter, moves: ReviewMove[], now: number): ChapterReview => {
  const main = moves.filter(m => m.role === 'main');
  const no = chapterNumber(chapter.header.chapterName);

  let linked: ReviewMove[] = [];
  let method: MoveLinkMethod = null;

  if (no !== null) {
    linked = main.filter(m => m.chapterNo === no);
    if (linked.length) method = 'chapter';
  }
  if (!method) {
    const name = normalizeName(chapter.header.chapterName);
    linked = name ? main.filter(m => normalizeName(m.chapterName) === name) : [];
    if (linked.length) method = 'chapter';
  }
  if (!method && !chapter.header.fen) {
    const line = chapterMainlineSans(chapter);
    const side = chapterSide(chapter.header);
    linked = line.length
      ? main.filter(m => {
          if (side && m.color !== side) return false;
          const seq = [...splitSan(m.pathSan), m.expectedSan];
          return seq.length <= line.length && seq.every((san, i) => san === line[i]);
        })
      : [];
    if (linked.length) method = 'moves';
  }

  return {
    due: linked.filter(m => isDue(m.lastReviewed, m.confidence, now)).length,
    total: linked.length,
    method,
  };
};
