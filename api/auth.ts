import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  clearSessionCookie,
  createSessionToken,
  getApiSecret,
  requireSession,
  setSessionCookie,
  timingSafeEqualStr,
} from './_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    if (!requireSession(req, res)) return;
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'POST') {
    const secret = getApiSecret();
    if (!secret) return res.status(500).json({ error: 'API_SECRET is not configured' });
    const password = (req.body as { password?: unknown } | undefined)?.password;
    if (typeof password !== 'string' || !timingSafeEqualStr(password, secret)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = createSessionToken();
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    setSessionCookie(res, token);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    clearSessionCookie(res);
    return res.status(204).end();
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
