import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db';
import { requireApiKey } from './_auth';

interface FlashcardRow {
  id: string;
  name: string;
  moves: string;
  fen: string;
  color: string;
  difficulty: string;
  review_count: number;
  last_reviewed: string | null;
  next_review: string;
  success_rate: string;
  total_attempts: number;
}

const rowToCard = (row: FlashcardRow) => ({
  id: row.id,
  name: row.name,
  moves: row.moves,
  fen: row.fen,
  color: row.color,
  difficulty: row.difficulty,
  reviewCount: row.review_count,
  lastReviewed: row.last_reviewed ? new Date(row.last_reviewed).getTime() : null,
  nextReview: new Date(row.next_review).getTime(),
  successRate: Number(row.success_rate),
  totalAttempts: row.total_attempts,
});

interface FlashcardInput {
  id?: string;
  name: string;
  moves: string;
  fen: string;
  color: string;
  difficulty: string;
  reviewCount: number;
  lastReviewed: number | null;
  nextReview: number;
  successRate: number;
  totalAttempts: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const rows = (await sql`SELECT * FROM opening_flashcards ORDER BY name ASC`) as FlashcardRow[];
    return res.status(200).json(rows.map(rowToCard));
  }

  if (req.method === 'PUT') {
    if (!requireApiKey(req, res)) return;
    const cards = req.body as FlashcardInput[];
    if (!Array.isArray(cards)) {
      return res.status(400).json({ error: 'Expected an array of flashcards' });
    }

    // Whole-array replace, matching localStorage semantics.
    await sql`DELETE FROM opening_flashcards`;
    for (const c of cards) {
      await sql`
        INSERT INTO opening_flashcards (
          name, moves, fen, color, difficulty, review_count, last_reviewed, next_review,
          success_rate, total_attempts
        ) VALUES (
          ${c.name}, ${c.moves}, ${c.fen}, ${c.color}, ${c.difficulty}, ${c.reviewCount},
          ${c.lastReviewed ? new Date(c.lastReviewed).toISOString() : null},
          ${new Date(c.nextReview).toISOString()}, ${c.successRate}, ${c.totalAttempts}
        )
      `;
    }
    const rows = (await sql`SELECT * FROM opening_flashcards ORDER BY name ASC`) as FlashcardRow[];
    return res.status(200).json(rows.map(rowToCard));
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'Method not allowed' });
}
