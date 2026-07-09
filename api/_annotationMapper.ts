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
}

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
});
