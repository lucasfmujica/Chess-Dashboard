export interface BlunderDrillRow {
  id: string;
  game_id: string;
  ply: number;
  fen_before: string;
  played_san: string;
  best_move_uci: string;
  cp_loss: number;
  eval_before: number;
  eval_after: number;
  confidence: number | null;
  last_reviewed: string | null;
  review_count: number;
  solved_count: number;
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

export const rowToBlunderDrill = (row: BlunderDrillRow) => ({
  id: row.id,
  gameId: row.game_id,
  ply: row.ply,
  fenBefore: row.fen_before,
  playedSan: row.played_san,
  bestMoveUci: row.best_move_uci,
  cpLoss: row.cp_loss,
  evalBefore: row.eval_before,
  evalAfter: row.eval_after,
  confidence: row.confidence ?? undefined,
  lastReviewed: row.last_reviewed ? new Date(row.last_reviewed).getTime() : undefined,
  reviewCount: row.review_count,
  solvedCount: row.solved_count,
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
