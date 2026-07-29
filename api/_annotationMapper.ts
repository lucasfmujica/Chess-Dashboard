export interface AnnotationRow {
  id: string;
  game_name: string | null;
  opponent: string | null;
  played_date: string | null;
  opening: string | null;
  eco: string | null;
  result: string | null;
  rating: number | null;
  tags: string[];
  notes: string | null;
  key_moments: unknown;
  pgn: string | null;
  created_at: string;
  // Structured post-mortem fields. tags/notes/key_moments are free text and
  // can't be aggregated; these are what the Training Log charts.
  game_id: string | null;
  error_type: string | null;
  critical_moment_fen: string | null;
  played_move: string | null;
  best_move: string | null;
  lesson: string | null;
}

export type AnnotationErrorType =
  | 'candidate-miss'
  | 'calculation'
  | 'evaluation'
  | 'clock'
  | 'opening'
  | 'technique'
  | 'none';

export const rowToAnnotation = (row: AnnotationRow) => ({
  id: row.id,
  createdAt: new Date(row.created_at).getTime(),
  gameName: row.game_name ?? undefined,
  opponent: row.opponent ?? undefined,
  date: row.played_date ?? undefined,
  opening: row.opening ?? undefined,
  eco: row.eco ?? undefined,
  result: row.result ?? undefined,
  rating: row.rating ?? undefined,
  tags: row.tags ?? [],
  notes: row.notes ?? undefined,
  keyMoments: row.key_moments ?? [],
  pgn: row.pgn ?? undefined,
  gameId: row.game_id ?? undefined,
  errorType: (row.error_type ?? undefined) as AnnotationErrorType | undefined,
  criticalMomentFen: row.critical_moment_fen ?? undefined,
  playedMove: row.played_move ?? undefined,
  bestMove: row.best_move ?? undefined,
  lesson: row.lesson ?? undefined,
});
