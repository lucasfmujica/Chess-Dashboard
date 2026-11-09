// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { VercelRequest } from '@vercel/node';
import {
  MAX_FAILURES_GLOBAL,
  MAX_FAILURES_PER_IP,
  WINDOW_MS,
  clearIp,
  createStore,
  getClientIp,
  isLimited,
  registerFailure,
} from './_loginRateLimit';

const fail = (store: ReturnType<typeof createStore>, ip: string, n: number, now: number) => {
  for (let i = 0; i < n; i++) registerFailure(ip, store, { now });
};

describe('per-IP limit', () => {
  it('allows up to 4 failures and limits at 5', () => {
    const store = createStore();
    fail(store, '1.1.1.1', MAX_FAILURES_PER_IP - 1, 0);
    expect(isLimited('1.1.1.1', store, { now: 0 })).toBe(0);
    fail(store, '1.1.1.1', 1, 0);
    expect(isLimited('1.1.1.1', store, { now: 0 })).toBeGreaterThan(0);
  });

  it('does not limit other IPs', () => {
    const store = createStore();
    fail(store, '1.1.1.1', MAX_FAILURES_PER_IP, 0);
    expect(isLimited('2.2.2.2', store, { now: 0 })).toBe(0);
  });

  it('reports the seconds left and lifts after the window', () => {
    const store = createStore();
    fail(store, '1.1.1.1', MAX_FAILURES_PER_IP, 0);
    expect(isLimited('1.1.1.1', store, { now: 60_000 })).toBe((WINDOW_MS - 60_000) / 1000);
    expect(isLimited('1.1.1.1', store, { now: WINDOW_MS })).toBe(0);
  });

  it('starts a fresh window after expiry', () => {
    const store = createStore();
    fail(store, '1.1.1.1', MAX_FAILURES_PER_IP, 0);
    fail(store, '1.1.1.1', 1, WINDOW_MS + 1);
    expect(isLimited('1.1.1.1', store, { now: WINDOW_MS + 1 })).toBe(0);
  });

  it('clearIp resets that IP only', () => {
    const store = createStore();
    fail(store, '1.1.1.1', MAX_FAILURES_PER_IP, 0);
    fail(store, '2.2.2.2', MAX_FAILURES_PER_IP, 0);
    clearIp('1.1.1.1', store);
    expect(isLimited('1.1.1.1', store, { now: 0 })).toBe(0);
    expect(isLimited('2.2.2.2', store, { now: 0 })).toBeGreaterThan(0);
  });

  it('evicts expired IP buckets', () => {
    const store = createStore();
    fail(store, '1.1.1.1', 1, 0);
    fail(store, '2.2.2.2', 1, WINDOW_MS + 1);
    expect(store.ips.has('1.1.1.1')).toBe(false);
  });
});

describe('global limit', () => {
  it('limits every IP once 60 failures spread across IPs are reached', () => {
    const store = createStore();
    for (let i = 0; i < MAX_FAILURES_GLOBAL; i++) registerFailure(`10.0.0.${i}`, store, { now: 0 });
    expect(isLimited('9.9.9.9', store, { now: 0 })).toBeGreaterThan(0);
    expect(isLimited('9.9.9.9', store, { now: WINDOW_MS })).toBe(0);
  });

  it('is not cleared by clearIp', () => {
    const store = createStore();
    for (let i = 0; i < MAX_FAILURES_GLOBAL; i++) registerFailure(`10.0.0.${i}`, store, { now: 0 });
    clearIp('10.0.0.0', store);
    expect(isLimited('10.0.0.0', store, { now: 0 })).toBeGreaterThan(0);
  });

  it('honours custom limits', () => {
    const store = createStore();
    fail(store, '1.1.1.1', 2, 0);
    expect(isLimited('1.1.1.1', store, { now: 0, maxPerIp: 2 })).toBeGreaterThan(0);
    expect(isLimited('3.3.3.3', store, { now: 0, maxGlobal: 2 })).toBeGreaterThan(0);
  });
});

describe('getClientIp', () => {
  const req = (headers: Record<string, string | string[]>, remoteAddress?: string) =>
    ({ headers, socket: { remoteAddress } }) as unknown as VercelRequest;

  it('prefers the first x-forwarded-for hop', () => {
    expect(getClientIp(req({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8', 'x-real-ip': '9.9.9.9' }))).toBe(
      '1.2.3.4'
    );
  });

  it('prefers x-vercel-forwarded-for over x-forwarded-for', () => {
    expect(
      getClientIp(req({ 'x-vercel-forwarded-for': '8.8.8.8', 'x-forwarded-for': '1.2.3.4' }))
    ).toBe('8.8.8.8');
  });

  it('falls back to x-real-ip, then the socket, then "unknown"', () => {
    expect(getClientIp(req({ 'x-real-ip': '9.9.9.9' }, '7.7.7.7'))).toBe('9.9.9.9');
    expect(getClientIp(req({}, '7.7.7.7'))).toBe('7.7.7.7');
    expect(getClientIp(req({}))).toBe('unknown');
  });
});
