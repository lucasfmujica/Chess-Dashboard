export interface EndgameDrillRow {
  id: string;
  game_id: string;
  ply: number;
  fen: string;
  material_delta: number;
  endgame_type: string;
  confidence: number | null;
  last_reviewed: string | null;
  review_count: number;
  archived: boolean;
  created_at: string;
  // Joined from `games`.
  opponent: string;
  played_date: string | null;
  eco: string | null;
  opening_name: string | null;
  color: string;
  result: string;
}

export const rowToEndgameDrill = (row: EndgameDrillRow) => ({
  id: row.id,
  gameId: row.game_id,
  ply: row.ply,
  fen: row.fen,
  materialDelta: row.material_delta,
  endgameType: row.endgame_type as 'pawn' | 'rook' | 'minor' | 'queen' | 'mixed',
  confidence: row.confidence ?? undefined,
  lastReviewed: row.last_reviewed ? new Date(row.last_reviewed).getTime() : undefined,
  reviewCount: row.review_count,
  archived: row.archived,
  createdAt: new Date(row.created_at).getTime(),
  game: {
    opponent: row.opponent,
    playedDate: row.played_date ?? undefined,
    eco: row.eco ?? undefined,
    openingName: row.opening_name ?? undefined,
    color: row.color as 'W' | 'B',
    result: row.result as 'W' | 'D' | 'L',
  },
});
