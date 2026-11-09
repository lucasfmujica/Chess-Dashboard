import type { VercelRequest } from '@vercel/node';

/**
 * In-memory login throttle (Hobby plan: no extra function, no migration).
 * State lives per serverless instance, so it is best-effort: it slows down
 * guessing, it is not a hard global guarantee. Only failed POST logins count.
 */

export const WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILURES_PER_IP = 5;
export const MAX_FAILURES_GLOBAL = 60;

type Bucket = { count: number; resetAt: number };

export type LimiterStore = {
  ips: Map<string, Bucket>;
  global: Bucket;
};

export const createStore = (): LimiterStore => ({
  ips: new Map(),
  global: { count: 0, resetAt: 0 },
});

const defaultStore = createStore();

export type LimitOptions = {
  now?: number;
  maxPerIp?: number;
  maxGlobal?: number;
  windowMs?: number;
};

/** Live count of a bucket; an expired one counts as empty. */
const liveCount = (bucket: Bucket | undefined, now: number): number =>
  bucket && bucket.resetAt > now ? bucket.count : 0;

const bump = (bucket: Bucket | undefined, now: number, windowMs: number): Bucket =>
  bucket && bucket.resetAt > now
    ? { count: bucket.count + 1, resetAt: bucket.resetAt }
    : { count: 1, resetAt: now + windowMs };

/** Seconds until the limit lifts, or 0 when the request may try a password. */
export const isLimited = (
  ip: string,
  store: LimiterStore = defaultStore,
  { now = Date.now(), maxPerIp = MAX_FAILURES_PER_IP, maxGlobal = MAX_FAILURES_GLOBAL }: LimitOptions = {}
): number => {
  const waits: number[] = [];
  if (liveCount(store.ips.get(ip), now) >= maxPerIp) waits.push(store.ips.get(ip)!.resetAt - now);
  if (liveCount(store.global, now) >= maxGlobal) waits.push(store.global.resetAt - now);
  return waits.length === 0 ? 0 : Math.max(1, Math.ceil(Math.max(...waits) / 1000));
};

export const registerFailure = (
  ip: string,
  store: LimiterStore = defaultStore,
  { now = Date.now(), windowMs = WINDOW_MS }: LimitOptions = {}
): void => {
  store.ips.set(ip, bump(store.ips.get(ip), now, windowMs));
  store.global = bump(store.global, now, windowMs);
  // Drop expired buckets so the map cannot grow without bound.
  for (const [key, bucket] of store.ips) if (bucket.resetAt <= now) store.ips.delete(key);
};

export const clearIp = (ip: string, store: LimiterStore = defaultStore): void => {
  store.ips.delete(ip);
};

/**
 * Client IP as Vercel reports it: first hop of x-forwarded-for (Vercel
 * overwrites that header, so the client cannot prepend its own), then
 * x-real-ip, then the socket address.
 */
export const getClientIp = (req: VercelRequest): string => {
  const first = (v: string | string[] | undefined): string | undefined =>
    (Array.isArray(v) ? v[0] : v)?.split(',')[0]?.trim() || undefined;
  return (
    first(req.headers['x-forwarded-for']) ??
    first(req.headers['x-real-ip']) ??
    req.socket?.remoteAddress ??
    'unknown'
  );
};
