export interface RepertoireMoveRow {
  id: string;
  chapter_no: number;
  chapter_name: string;
  eco: string | null;
  color: string;
  path_san: string;
  fen_before: string;
  expected_san: string;
  reply_san: string | null;
  comment: string | null;
  is_mainline: boolean;
  role: string;
  depth: number;
  confidence: number | null;
  last_reviewed: string | null;
  review_count: number;
  created_at: string;
}

export const rowToRepertoireMove = (row: RepertoireMoveRow) => ({
  id: row.id,
  chapterNo: row.chapter_no,
  chapterName: row.chapter_name,
  eco: row.eco ?? undefined,
  color: row.color as 'W' | 'B',
  pathSan: row.path_san,
  fenBefore: row.fen_before,
  expectedSan: row.expected_san,
  replySan: row.reply_san ?? undefined,
  comment: row.comment ?? undefined,
  isMainline: row.is_mainline,
  role: row.role as 'main' | 'alt' | 'trap',
  depth: row.depth,
  confidence: row.confidence ?? undefined,
  lastReviewed: row.last_reviewed ? new Date(row.last_reviewed).getTime() : undefined,
  reviewCount: row.review_count ?? 0,
  createdAt: new Date(row.created_at).getTime(),
});
