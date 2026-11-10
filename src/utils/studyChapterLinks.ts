import { buildChapterAssignment, type ChapterAssignmentResult } from './chapterRules';
import { ecoMatches, parseEcoRange } from './eco';
import { chapterColor, chapterNumber } from './repertoireMoves';
import { isDue } from './srs';
import type { StudyChapter, StudyChapterHeader } from './studyPgn';
import type { Game, PlayerColor, RepertoireMove } from '../types/chess';

/**
 * Vincula un capítulo del estudio de repertorio con los datos que lo miden:
 * las partidas propias jugadas con esa apertura y las jugadas de repertorio
 * de ese capítulo que están vencidas para repasar.
 *
 * El PGN del estudio no trae ningún id compartido con las partidas. Los
 * capítulos con regla (`chapterRules`) se llenan por jugadas y posiciones; el
 * resto, por ECO (o rango ECO), y si falta, por nombre de apertura. Con las
 * jugadas de repertorio sí hay una llave estable: el número `NN` del título
 * del capítulo.
 */

export { ecoMatches, parseEcoRange };

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

export type GameLinkMethod = 'eco' | 'opening' | 'rule' | null;

export interface ChapterGamesLink {
  games: Game[];
  /** Cómo se vincularon; null cuando el capítulo no trae regla, ECO ni apertura. */
  method: GameLinkMethod;
  /** Color filtrado; null cuando cuentan los dos. */
  color: PlayerColor | null;
  /** Capítulo con regla: partidas de su ECO, con jugadas, que ninguna regla asigna. */
  unassigned: Game[];
}

/**
 * Las partidas propias que corresponden al capítulo. Si el capítulo tiene
 * regla, las que la asignación por jugadas le da. Si no, por ECO si trae uno
 * válido, o por nombre de apertura, sin las que una regla mandó a otro
 * capítulo y con las que una regla le mandó a este. Filtra por el color del
 * capítulo cuando se puede deducir del título.
 */
export const linkGamesToChapter = (
  header: StudyChapterHeader,
  games: Game[],
  assignment: ChapterAssignmentResult = buildChapterAssignment(games),
): ChapterGamesLink => {
  const color = chapterSide(header);
  const sameSide = color ? games.filter(g => g.color === color) : games;
  const chapterNo = chapterNumber(header.chapterName);
  const key = chapterNo === null ? null : String(chapterNo).padStart(2, '0');
  const { byGame } = assignment;
  const isHere = (g: Game) => key !== null && byGame.get(g)?.chapter === key;

  if (key !== null && assignment.ruleChapters.has(key)) {
    const noMoves = new Set(assignment.noMoves);
    return {
      games: sameSide.filter(isHere),
      method: 'rule',
      color,
      unassigned: sameSide.filter(g => !noMoves.has(g) && !byGame.has(g) && ecoMatches(header.eco, g.eco)),
    };
  }

  let method: GameLinkMethod = null;
  let linked: Game[] = [];
  if (parseEcoRange(header.eco)) {
    method = 'eco';
    linked = sameSide.filter(g => ecoMatches(header.eco, g.eco));
  } else if (header.opening.trim()) {
    method = 'opening';
    linked = sameSide.filter(g => openingMatches(header.opening, g.opening));
  }
  if (method) {
    linked = linked.filter(g => !byGame.has(g) || isHere(g));
    const seen = new Set(linked);
    linked = [...linked, ...sameSide.filter(g => isHere(g) && !seen.has(g))];
  }

  return { games: linked, method, color, unassigned: [] };
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
