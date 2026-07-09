import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db';
import { requireApiKey } from './_auth';

interface AnalysisRow {
  pgn_hash: string;
  depth: number;
  evals: number[];
  moves: unknown;
  accuracy_white: string;
  accuracy_black: string;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
}

const rowToEntry = (row: AnalysisRow) => ({
  pgnHash: row.pgn_hash,
  analysis: {
    depth: row.depth,
    evals: row.evals,
    moves: row.moves,
    accuracyWhite: Number(row.accuracy_white),
    accuracyBlack: Number(row.accuracy_black),
    blunders: row.blunders,
    mistakes: row.mistakes,
    inaccuracies: row.inaccuracies,
  },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const rows = (await sql`SELECT * FROM game_analyses`) as AnalysisRow[];
    return res.status(200).json(rows.map(rowToEntry));
  }

  if (req.method === 'POST') {
    if (!requireApiKey(req, res)) return;
    const { pgnHash, analysis } = req.body as {
      pgnHash: string;
      analysis: {
        depth: number;
        evals: number[];
        moves: unknown;
        accuracyWhite: number;
        accuracyBlack: number;
        blunders: number;
        mistakes: number;
        inaccuracies: number;
      };
    };
    await sql`
      INSERT INTO game_analyses (
        pgn_hash, depth, evals, moves, accuracy_white, accuracy_black, blunders, mistakes, inaccuracies
      ) VALUES (
        ${pgnHash}, ${analysis.depth}, ${analysis.evals}, ${JSON.stringify(analysis.moves)},
        ${analysis.accuracyWhite}, ${analysis.accuracyBlack}, ${analysis.blunders},
        ${analysis.mistakes}, ${analysis.inaccuracies}
      )
      ON CONFLICT (pgn_hash, depth) DO UPDATE SET
        evals = EXCLUDED.evals, moves = EXCLUDED.moves, accuracy_white = EXCLUDED.accuracy_white,
        accuracy_black = EXCLUDED.accuracy_black, blunders = EXCLUDED.blunders,
        mistakes = EXCLUDED.mistakes, inaccuracies = EXCLUDED.inaccuracies
    `;
    return res.status(201).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
