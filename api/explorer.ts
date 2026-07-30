import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Proxies the Lichess masters opening explorer. Lichess now requires an
 * OAuth2 token on this endpoint (no scope needed, just any authenticated
 * request) after abuse forced them to lock down anonymous access. The token
 * lives server-side only so it never ships in the client bundle.
 *
 * Two shapes, both behind the same token:
 *   ?fen=...&moves=&topGames=   the explorer itself
 *   ?gameId=...                 one master game's PGN, for storing as a model
 *                               game. Same host, so it cannot be fetched from
 *                               the client either.
 */

/** Lichess game ids are 8 alphanumeric characters. Anything else is not a path we forward. */
const GAME_ID = /^[a-zA-Z0-9]{8}$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.LICHESS_TOKEN;
  if (!token) {
    return res.status(503).json({ error: 'LICHESS_TOKEN is not configured on the server' });
  }

  const { gameId } = req.query;
  if (typeof gameId === 'string' && gameId) {
    // Validated rather than interpolated as-is: this segment becomes part of
    // the upstream path, so a slash in it would let a caller choose the
    // endpoint being called with our token.
    if (!GAME_ID.test(gameId)) {
      return res.status(400).json({ error: 'gameId must be 8 alphanumeric characters' });
    }
    const upstream = await fetch(`https://explorer.lichess.org/masters/pgn/${gameId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const pgn = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/x-chess-pgn');
    return res.send(pgn);
  }

  const fen = req.query.fen;
  if (typeof fen !== 'string' || !fen) {
    return res.status(400).json({ error: 'fen or gameId query param is required' });
  }
  const moves = typeof req.query.moves === 'string' ? req.query.moves : '12';
  const topGames = typeof req.query.topGames === 'string' ? req.query.topGames : '0';

  const url = `https://explorer.lichess.org/masters?fen=${encodeURIComponent(fen)}&moves=${encodeURIComponent(moves)}&topGames=${encodeURIComponent(topGames)}`;

  const upstream = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await upstream.text();
  res.status(upstream.status);
  res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json');
  return res.send(body);
}
