import { isDue, nextReviewAt } from './srs';
import { localDateKey, dateFromKey, weekdayIndex } from './localDate';
import { programForWeekday } from '../constants/trainingProgram';
import type { Game, RepertoireLine, Tournament } from '../types/chess';

/**
 * Turns a dated tournament into a day-by-day review plan.
 *
 * Everything it needs is already in the database — the start date, the lines
 * with their confidence and last-review timestamps, and the games that say
 * which ECOs actually show up and how they score. The point is to stop doing
 * by hand what was done by hand for the Copa AFA.
 *
 * Two rules it will not break:
 *
 * 1. Nothing new in the last few days. Learning a line you have never drilled
 *    on the eve of a tournament is how you end up half-remembering it over the
 *    board. Lines excluded this way are reported, not hidden.
 *
 * 2. It never claims a ranking the data can't support. Right now every line
 *    sits at confidence 2 with no review history, so the SRS tiebreak is flat
 *    and `priority` carries the whole ordering — `ranked` says which signals
 *    actually separated anything, so the UI can be honest about it.
 */

/** Days before the start in which no unreviewed line may be introduced. */
export const NEW_LINE_FREEZE_DAYS = 3;

/** Roughly how long one line takes to review, for filling a day's budget. */
export const MINUTES_PER_LINE = 8;

/** ECOs seen fewer times than this are noise, not a pattern worth prepping. */
export const MIN_ECO_GAMES = 3;

export interface EcoFocus {
  eco: string;
  games: number;
  /** Score per game, 0-1. Low plus frequent is what deserves the time. */
  score: number;
  /** Prepared lines covering this ECO, if any. */
  lineIds: string[];
}

export interface PrepDay {
  /** Local date key, 'YYYY-MM-DD'. */
  date: string;
  lines: RepertoireLine[];
  minutes: number;
  /** True once inside the freeze window — only known lines from here on. */
  frozen: boolean;
}

export interface PrepPlan {
  tournamentName: string;
  startDate: string;
  /** Whole days from today to the start. 0 means it starts today. */
  daysAvailable: number;
  days: PrepDay[];
  /** Lines held back by the freeze rule, with the reason visible. */
  frozenOut: RepertoireLine[];
  /** Due lines that did not fit in the days remaining. */
  overflow: RepertoireLine[];
  ecoFocus: EcoFocus[];
  /** OTB games the ECO cross actually had to work with. */
  ecoGamesConsidered: number;
  /** OTB games ignored by the ECO cross because they have no real ECO. */
  gamesWithoutEco: number;
  /**
   * Which signals actually discriminated between lines. When `srs` is false
   * the lines are all equally due and only `priority` did any work — the UI
   * must not present the result as a confidence-driven ranking.
   */
  ranked: { priority: boolean; srs: boolean; eco: boolean };
}

/** Whole days between two local date keys. */
const daysBetween = (from: string, to: string): number =>
  Math.round((dateFromKey(to).getTime() - dateFromKey(from).getTime()) / 86_400_000);

/** Local date key `offset` days after `from`. */
const addDays = (from: string, offset: number): string => {
  const date = dateFromKey(from);
  date.setDate(date.getDate() + offset);
  return localDateKey(date);
};

/**
 * Whether a game counts toward tournament prep.
 *
 * OTB only. Prep is for classical over-the-board play, and the online games
 * outnumber them roughly five to one — leaving them in would let a blitz
 * habit decide which chapters get the study time. Tested against 'lichess'
 * rather than for 'otb' so a row with no source recorded is treated as OTB,
 * which is what the column defaults to.
 */
export const isOtb = (game: Game): boolean => game.source !== 'lichess';

/**
 * Score per game by ECO over the games handed in.
 *
 * 'Unknown' is excluded rather than bucketed: those rows are crosstable
 * imports with no movetext, so treating them as one opening would invent the
 * single largest and worst-scoring "ECO" in the set.
 */
export const ecoPerformance = (games: Game[]): EcoFocus[] => {
  const byEco = new Map<string, { games: number; points: number }>();
  for (const game of games) {
    if (!game.eco || game.eco === 'Unknown') continue;
    const entry = byEco.get(game.eco) ?? { games: 0, points: 0 };
    entry.games += 1;
    entry.points += game.result === 'W' ? 1 : game.result === 'D' ? 0.5 : 0;
    byEco.set(game.eco, entry);
  }
  return [...byEco.entries()]
    .filter(([, v]) => v.games >= MIN_ECO_GAMES)
    .map(([eco, v]) => ({ eco, games: v.games, score: v.points / v.games, lineIds: [] }))
    // Frequent and badly scoring first: that product is the cost in points.
    .sort((a, b) => b.games * (1 - b.score) - a.games * (1 - a.score));
};

/**
 * Study order. Lowest number wins.
 *
 * Priority is the primary key because it is the only field the user has
 * actually differentiated. The ECO cross and the SRS interval break ties
 * beneath it, so they sharpen the order without ever overriding an explicit
 * "close this one out first".
 */
const sortLines = (lines: RepertoireLine[], ecoRank: Map<string, number>) =>
  [...lines].sort((a, b) => {
    const priority = (a.priority ?? 99) - (b.priority ?? 99);
    if (priority !== 0) return priority;
    const eco = (ecoRank.get(a.eco ?? '') ?? 99) - (ecoRank.get(b.eco ?? '') ?? 99);
    if (eco !== 0) return eco;
    const due = nextReviewAt(a.lastReviewed, a.confidence) - nextReviewAt(b.lastReviewed, b.confidence);
    if (due !== 0) return due;
    return (a.confidence ?? 5) - (b.confidence ?? 5);
  });

export const buildPrepPlan = (
  tournament: Tournament,
  lines: RepertoireLine[],
  games: Game[],
  today: Date = new Date()
): PrepPlan | null => {
  if (!tournament.startDate) return null;

  const todayKey = localDateKey(today);
  const daysAvailable = Math.max(0, daysBetween(todayKey, tournament.startDate));
  const now = today.getTime();

  const otbGames = games.filter(isOtb);
  const ecoFocusAll = ecoPerformance(otbGames);
  const ecoRank = new Map(ecoFocusAll.map((e, i) => [e.eco, i]));

  const due = lines.filter(l => isDue(l.lastReviewed, l.confidence, now));
  const ordered = sortLines(due, ecoRank);

  // Attach the lines covering each ECO so the UI can say *why* an ECO matters.
  const ecoFocus = ecoFocusAll.map(focus => ({
    ...focus,
    lineIds: lines.filter(l => l.eco === focus.eco).map(l => l.id),
  }));

  const days: PrepDay[] = [];
  const frozenOut: RepertoireLine[] = [];
  const queue = [...ordered];

  for (let offset = 0; offset < daysAvailable; offset += 1) {
    const date = addDays(todayKey, offset);
    // Frozen once the tournament is within the window, counting from the day
    // being planned rather than from today.
    const frozen = daysAvailable - offset <= NEW_LINE_FREEZE_DAYS;
    // The program already says how much time each weekday has; a prep plan
    // that ignores it would just be a wish list.
    const budget = programForWeekday(weekdayIndex(date))
      .blocks.filter(b => b.block === 'repertoire' || b.block === 'analysis')
      .reduce((sum, b) => sum + b.minutes, 0);
    const slots = Math.max(1, Math.floor(budget / MINUTES_PER_LINE));

    const picked: RepertoireLine[] = [];
    while (picked.length < slots && queue.length > 0) {
      const line = queue.shift() as RepertoireLine;
      // A line never drilled is a new line, whatever its confidence says.
      if (frozen && (line.reviewCount ?? 0) === 0) {
        frozenOut.push(line);
        continue;
      }
      picked.push(line);
    }

    days.push({ date, lines: picked, minutes: picked.length * MINUTES_PER_LINE, frozen });
  }

  const confidences = new Set(due.map(l => l.confidence ?? null));
  const reviewed = due.filter(l => l.lastReviewed).length;

  return {
    tournamentName: tournament.name,
    startDate: tournament.startDate,
    daysAvailable,
    days,
    frozenOut,
    overflow: queue,
    ecoFocus,
    ecoGamesConsidered: otbGames.filter(g => g.eco && g.eco !== 'Unknown').length,
    gamesWithoutEco: otbGames.filter(g => !g.eco || g.eco === 'Unknown').length,
    ranked: {
      priority: new Set(due.map(l => l.priority ?? null)).size > 1,
      // Only meaningful once the lines differ in confidence or review history.
      srs: confidences.size > 1 || (reviewed > 0 && reviewed < due.length),
      eco: ecoFocus.some(e => e.lineIds.length > 0),
    },
  };
};
