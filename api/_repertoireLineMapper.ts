export interface RepertoireLineRow {
  id: string;
  color: string;
  vs_move: string | null;
  eco: string | null;
  line_name: string | null;
  moves_san: string | null;
  key_fen: string | null;
  plan: string | null;
  golden_rule: string | null;
  priority: number | null;
  confidence: number | null;
  lichess_url: string | null;
  last_reviewed: string | null;
  notes: string | null;
  created_at: string;
}

export const rowToRepertoireLine = (row: RepertoireLineRow) => ({
  id: row.id,
  color: row.color as 'W' | 'B',
  vsMove: row.vs_move ?? undefined,
  eco: row.eco ?? undefined,
  lineName: row.line_name ?? undefined,
  movesSan: row.moves_san ?? undefined,
  keyFen: row.key_fen ?? undefined,
  plan: row.plan ?? undefined,
  goldenRule: row.golden_rule ?? undefined,
  priority: row.priority ?? undefined,
  confidence: row.confidence ?? undefined,
  lichessUrl: row.lichess_url ?? undefined,
  lastReviewed: row.last_reviewed ? new Date(row.last_reviewed).getTime() : undefined,
  notes: row.notes ?? undefined,
  createdAt: new Date(row.created_at).getTime(),
});
