// Row -> domain mappers for the training-loop resources (sessions, attempts,
// books, concepts). Same snake_case -> camelCase convention as the other
// _*Mapper files, with timestamps normalized to epoch millis.

export interface TrainingSessionRow {
  id: string;
  /** DATE column — the driver returns a Date, not a string. See toDateString. */
  session_date: string | Date;
  block: string;
  minutes: number;
  source: string | null;
  attempted: number;
  solved: number;
  notes: string | null;
  created_at: string;
}

/**
 * Normalize a DATE column to 'YYYY-MM-DD'.
 *
 * The Neon driver hands DATE back as a JS Date at *local* midnight, so
 * `String(date)` yields 'Wed Jul 29 2026 …' and `toISOString()` would shift
 * the calendar day backwards for anyone west of UTC. Formatting with the
 * local getters is the only variant that round-trips the day itself, which
 * is the entire point of the column.
 */
const toDateString = (value: unknown): string => {
  if (value instanceof Date) {
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
};

export const rowToTrainingSession = (row: TrainingSessionRow) => ({
  id: row.id,
  sessionDate: toDateString(row.session_date),
  block: row.block as TrainingBlockName,
  minutes: row.minutes,
  source: row.source ?? undefined,
  attempted: row.attempted,
  solved: row.solved,
  notes: row.notes ?? undefined,
  createdAt: new Date(row.created_at).getTime(),
});

export type TrainingBlockName =
  | 'calculation'
  | 'endgame'
  | 'repertoire'
  | 'play'
  | 'analysis'
  | 'concept'
  | 'lesson'
  | 'tactics';

export interface TrainingAttemptRow {
  id: string;
  session_id: string | null;
  item_kind: string;
  item_id: string | null;
  correct: boolean;
  candidate_miss: boolean | null;
  candidates_written: string | null;
  seconds: number | null;
  think_seconds: number | null;
  created_at: string;
}

export const rowToTrainingAttempt = (row: TrainingAttemptRow) => ({
  id: row.id,
  sessionId: row.session_id ?? undefined,
  itemKind: row.item_kind as 'blunder' | 'endgame' | 'repertoire' | 'external',
  itemId: row.item_id ?? undefined,
  correct: row.correct,
  // Tri-state on purpose: null means "not asked" (the attempt was correct, or
  // predates the question), which is not the same as false ("it was on my
  // list and I rejected it"). Collapsing null into false would silently
  // inflate the calculation-failure share of the diagnostic chart.
  candidateMiss: row.candidate_miss ?? undefined,
  candidatesWritten: row.candidates_written ?? undefined,
  seconds: row.seconds ?? undefined,
  thinkSeconds: row.think_seconds ?? undefined,
  createdAt: new Date(row.created_at).getTime(),
});

export interface BookRow {
  id: string;
  title: string;
  author: string | null;
  category: string | null;
  level: string | null;
  status: string;
  source: string | null;
  block: string | null;
  progress_done: number | null;
  progress_total: number | null;
  current_chapter: string | null;
  priority: number | null;
  notes: string | null;
  created_at: string;
}

export const rowToBook = (row: BookRow) => ({
  id: row.id,
  title: row.title,
  author: row.author ?? undefined,
  category: row.category ?? undefined,
  level: row.level ?? undefined,
  status: row.status as 'activo' | 'referencia' | 'archivado',
  source: row.source ?? undefined,
  block: row.block ?? undefined,
  progressDone: row.progress_done ?? undefined,
  progressTotal: row.progress_total ?? undefined,
  currentChapter: row.current_chapter ?? undefined,
  priority: row.priority ?? undefined,
  notes: row.notes ?? undefined,
  createdAt: new Date(row.created_at).getTime(),
});

export interface HomeworkRow {
  id: string;
  assigned_date: string | Date;
  coach: string;
  recording_id: string | number | null;
  task: string;
  kind: string | null;
  due_date: string | Date | null;
  status: string;
  source_url: string | null;
  notes: string | null;
  created_at: string;
}

export const rowToHomework = (row: HomeworkRow) => ({
  id: row.id,
  assignedDate: toDateString(row.assigned_date),
  coach: row.coach,
  // BIGINT comes back as a string from the driver to avoid precision loss.
  recordingId: row.recording_id != null ? String(row.recording_id) : undefined,
  task: row.task,
  kind: (row.kind ?? undefined) as HomeworkKind | undefined,
  dueDate: row.due_date ? toDateString(row.due_date) : undefined,
  status: row.status as 'pendiente' | 'hecho' | 'vencido',
  sourceUrl: row.source_url ?? undefined,
  notes: row.notes ?? undefined,
  createdAt: new Date(row.created_at).getTime(),
});

export type HomeworkKind =
  | 'final'
  | 'calculo'
  | 'repertorio'
  | 'concepto'
  | 'lectura'
  | 'partida';

export interface ConceptRow {
  id: string;
  name: string;
  category: string;
  book_id: string | null;
  source_chapter: string | null;
  source_type: string | null;
  status: string;
  summary: string | null;
  example_fens: string[];
  game_ids: string[];
  confidence: number | null;
  last_reviewed: string | null;
  review_count: number;
  created_at: string;
}

export const rowToConcept = (row: ConceptRow) => ({
  id: row.id,
  name: row.name,
  category: row.category as
    | 'opening'
    | 'middlegame'
    | 'endgame'
    | 'calculation'
    | 'strategy'
    | 'mindset',
  bookId: row.book_id ?? undefined,
  sourceChapter: row.source_chapter ?? undefined,
  sourceType: row.source_type ?? undefined,
  status: row.status as 'to-study' | 'studying' | 'applied' | 'mastered',
  summary: row.summary ?? undefined,
  exampleFens: row.example_fens ?? [],
  gameIds: row.game_ids ?? [],
  confidence: row.confidence ?? undefined,
  lastReviewed: row.last_reviewed ? new Date(row.last_reviewed).getTime() : undefined,
  reviewCount: row.review_count ?? 0,
  createdAt: new Date(row.created_at).getTime(),
});
