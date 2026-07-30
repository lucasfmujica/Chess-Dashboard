/**
 * Training-plan domain types.
 */

/** A single planned training activity within a day. */
export interface TrainingActivity {
  id: string;
  minutes?: number;
  label?: string;
  details?: string;
}

/** A day's plan: a list of activities. */
export type DayPlan = TrainingActivity[];

/** A week's plan keyed by YYYY-MM-DD date string. */
export type WeekPlan = Record<string, DayPlan>;

/** All weekly plans keyed by the week's Monday (YYYY-MM-DD). */
export type WeeklyPlans = Record<string, WeekPlan>;

/** A single day entry produced by getWeekDates. */
export interface WeekDate {
  day: string;
  /** YYYY-MM-DD */
  date: string;
  /** Localized short label, e.g. "Nov 15". */
  displayDate: string;
}

/** Aggregate stats for a planned week (see getWeekStats). */
export interface WeekStats {
  totalPlannedMinutes: number;
  daysPlanned: number;
  restDays: number;
  activityCounts: Record<string, number>;
  avgMinutesPerDay: number;
}

/* ------------------------------------------------------------------ *
 * Executed training (persisted). Everything above describes a *plan*;
 * everything below records what actually happened.
 * ------------------------------------------------------------------ */

/** The kind of work a session consisted of. Mirrors the DB CHECK constraint. */
export type TrainingBlock =
  | 'calculation'
  | 'endgame'
  | 'repertoire'
  | 'play'
  | 'analysis'
  | 'concept'
  | 'lesson'
  | 'tactics';

/** One training block actually performed, on one day. */
export interface TrainingSession {
  id: string;
  /** Calendar day as 'YYYY-MM-DD' — deliberately not a timestamp. */
  sessionDate: string;
  block: TrainingBlock;
  minutes: number;
  source?: string;
  attempted: number;
  solved: number;
  notes?: string;
  createdAt: number;
}

/**
 * `repertoire` is a whole chapter recalled as a card; `repertoire-move` is one
 * move of it played on a board. Kept apart so the training log can tell which
 * of the two a session actually was — they take the same minutes and teach
 * different things.
 */
export type TrainingItemKind =
  | 'blunder'
  | 'endgame'
  | 'repertoire'
  | 'repertoire-move'
  | 'concept'
  | 'external';

/**
 * One exercise attempted inside a session — the diagnostic record.
 *
 * `candidateMiss` is tri-state and only meaningful when `correct` is false:
 *   true      = the right move never appeared in my candidate list
 *               (a candidate-sweep failure — train breadth)
 *   false     = it was on my list and I rejected it
 *               (a calculation/evaluation failure — train depth)
 *   undefined = not asked (the attempt was correct, or predates the question)
 */
export interface TrainingAttempt {
  id: string;
  sessionId?: string;
  itemKind: TrainingItemKind;
  itemId?: string;
  correct: boolean;
  candidateMiss?: boolean;
  candidatesWritten?: string;
  /** Total time on the exercise: calculating plus entering the move. */
  seconds?: number;
  /**
   * Time spent calculating before the answer was revealed — the 5-10 minutes
   * the method is built around, and the number `seconds` used to throw away
   * by restarting its clock at the reveal.
   */
  thinkSeconds?: number;
  createdAt: number;
}

/**
 * A book's role in the training plan, not its reading progress.
 *
 * `activo` is capped by the "nothing new until something finishes" rule,
 * since the diagnosed failure mode is several courses each abandoned a
 * quarter of the way through.
 */
export type BookStatus = 'activo' | 'referencia' | 'archivado';

/**
 * The cap is PER SOURCE, not a single global number: the rule is "2 Chessable
 * courses + 1 video course at a time". A flat cap would wrongly block a PDF
 * used as game material (Fischer on Saturdays), which is not a course and
 * carries none of the abandonment risk the rule is guarding against.
 * Sources not listed here are uncapped.
 */
export const ACTIVE_LIMITS: Record<string, number> = {
  chessable: 2,
  curso: 1,
};

/** Which sources the cap applies to, for display. */
export const CAPPED_SOURCES = Object.keys(ACTIVE_LIMITS);

/**
 * Whether promoting `book` to `activo` would break the cap for its source.
 * Returns the offending limit, or null when the change is allowed.
 */
export const activeLimitBreach = (
  book: Book,
  allBooks: Book[]
): { source: string; limit: number; current: Book[] } | null => {
  const source = (book.source ?? '').toLowerCase();
  const limit = ACTIVE_LIMITS[source];
  if (limit === undefined) return null;
  const current = allBooks.filter(
    b => b.status === 'activo' && (b.source ?? '').toLowerCase() === source && b.id !== book.id
  );
  return current.length >= limit ? { source, limit, current } : null;
};

export interface Book {
  id: string;
  title: string;
  author?: string;
  category?: string;
  level?: string;
  status: BookStatus;
  /** Where it lives: 'chessable' | 'pdf' | 'curso' | 'pgn'. */
  source?: string;
  /** Which weekly block uses it, e.g. 'viernes-conceptos'. */
  block?: string;
  /** Chessable-style completion, e.g. 215 of 516. */
  progressDone?: number;
  progressTotal?: number;
  currentChapter?: string;
  priority?: number;
  notes?: string;
  createdAt: number;
}

/** Completion percentage, or undefined when the book has no counts. */
export const bookProgressPct = (book: Book): number | undefined =>
  book.progressTotal && book.progressTotal > 0
    ? Math.round(((book.progressDone ?? 0) / book.progressTotal) * 100)
    : undefined;

export type HomeworkKind =
  | 'final'
  | 'calculo'
  | 'repertorio'
  | 'concepto'
  | 'lectura'
  | 'partida';

export type HomeworkStatus = 'pendiente' | 'hecho' | 'vencido';

/**
 * Homework assigned in a coaching session.
 *
 * Coaches assign verbally with no commitment language, so meeting-notes
 * tooling extracts nothing and the task only ever lived in memory. This is
 * where it lives instead.
 */
export interface Homework {
  id: string;
  /** 'YYYY-MM-DD', local. */
  assignedDate: string;
  coach: string;
  /** Source recording, when imported rather than typed in. */
  recordingId?: string;
  task: string;
  kind?: HomeworkKind;
  dueDate?: string;
  status: HomeworkStatus;
  sourceUrl?: string;
  notes?: string;
  createdAt: number;
}

/**
 * Overdue is DERIVED, not read from `status`. Storing it would need a job to
 * flip rows at midnight, and a counter that silently under-reports because a
 * cron didn't fire is worse than no counter.
 */
export const isHomeworkOverdue = (hw: Homework, todayKey: string): boolean =>
  hw.status !== 'hecho' && !!hw.dueDate && hw.dueDate < todayKey;

export type ConceptCategory =
  | 'opening'
  | 'middlegame'
  | 'endgame'
  | 'calculation'
  | 'strategy'
  | 'mindset';

export type ConceptStatus = 'to-study' | 'studying' | 'applied' | 'mastered';

/**
 * A studied concept, tied back to the player's own games. A concept with an
 * empty `gameIds` was read, not learned — the UI says so explicitly.
 */
export interface Concept {
  id: string;
  name: string;
  category: ConceptCategory;
  bookId?: string;
  sourceChapter?: string;
  sourceType?: string;
  status: ConceptStatus;
  summary?: string;
  exampleFens: string[];
  gameIds: string[];
  confidence?: number;
  lastReviewed?: number;
  /** How many times this concept has been reviewed. Incremented server-side. */
  reviewCount?: number;
  createdAt: number;
}
