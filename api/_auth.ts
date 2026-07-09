import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Basic deterrent, not real access control: the expected key ships in the
 * client bundle (VITE_API_SECRET). It stops casual bots/scrapers from
 * hitting write endpoints blindly; it does not stop a motivated user who
 * inspects the bundle. There's no per-user auth in this app.
 */
export const requireApiKey = (req: VercelRequest, res: VercelResponse): boolean => {
  const expected = process.env.API_SECRET;
  if (!expected) return true; // no secret configured: allow (e.g. local dev without one set)
  if (req.headers['x-api-key'] === expected) return true;
  res.status(401).json({ error: 'Unauthorized' });
  return false;
};
