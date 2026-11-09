import { createHmac, timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Session auth for the whole API. The only credential is API_SECRET, which
 * never leaves the server: the user logs in once (POST /api/auth) and gets an
 * HttpOnly cookie carrying an HMAC-signed, expiring token. Nothing about the
 * secret ships in the client bundle.
 *
 * Fail closed: with no API_SECRET configured nothing authenticates.
 */

export const SESSION_COOKIE = 'chess_session';
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export const getApiSecret = (): string | null => process.env.API_SECRET || null;

/** Constant-time string comparison; unequal lengths are simply false. */
export const timingSafeEqualStr = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
};

const sign = (payload: string, secret: string): string =>
  createHmac('sha256', secret).update(payload).digest('base64url');

/** Token format: `<expiry unix seconds>.<hmac of expiry>`. */
export const createSessionToken = (now = Date.now()): string | null => {
  const secret = getApiSecret();
  if (!secret) return null;
  const exp = String(Math.floor(now / 1000) + SESSION_TTL_SECONDS);
  return `${exp}.${sign(exp, secret)}`;
};

export const verifySessionToken = (token: string | undefined | null, now = Date.now()): boolean => {
  const secret = getApiSecret();
  if (!secret || !token) return false;
  const [exp, mac, ...rest] = token.split('.');
  if (!exp || !mac || rest.length > 0) return false;
  if (!timingSafeEqualStr(mac, sign(exp, secret))) return false;
  const expSeconds = Number(exp);
  return Number.isFinite(expSeconds) && expSeconds * 1000 > now;
};

const cookieAttrs = 'HttpOnly; Secure; SameSite=Strict; Path=/';

export const setSessionCookie = (res: VercelResponse, token: string): void => {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; ${cookieAttrs}; Max-Age=${SESSION_TTL_SECONDS}`
  );
};

export const clearSessionCookie = (res: VercelResponse): void => {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; ${cookieAttrs}; Max-Age=0`);
};

const readCookie = (req: VercelRequest, name: string): string | undefined => {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return undefined;
};

/** Sends the 401 and returns false when the request has no valid session. */
export const requireSession = (req: VercelRequest, res: VercelResponse): boolean => {
  if (verifySessionToken(readCookie(req, SESSION_COOKIE))) return true;
  res.status(401).json({ error: 'Unauthorized' });
  return false;
};
