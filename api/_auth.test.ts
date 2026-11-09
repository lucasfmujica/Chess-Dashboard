// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  clearSessionCookie,
  createSessionToken,
  requireSession,
  setSessionCookie,
  timingSafeEqualStr,
  verifySessionToken,
} from './_auth';
import authHandler from './_sessionAuth';

const SECRET = 'test-secret-value';

const mockRes = () => {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
    end() {
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
  };
  return res;
};
type MockRes = ReturnType<typeof mockRes>;

const asRes = (r: MockRes) => r as unknown as VercelResponse;
const mockReq = (init: { method?: string; cookie?: string; body?: unknown } = {}) =>
  ({
    method: init.method ?? 'GET',
    headers: init.cookie ? { cookie: init.cookie } : {},
    body: init.body,
    query: {},
  }) as unknown as VercelRequest;

beforeEach(() => {
  vi.stubEnv('API_SECRET', SECRET);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('timingSafeEqualStr', () => {
  it('compares equal and different strings, including different lengths', () => {
    expect(timingSafeEqualStr('abc', 'abc')).toBe(true);
    expect(timingSafeEqualStr('abc', 'abd')).toBe(false);
    expect(timingSafeEqualStr('abc', 'abcd')).toBe(false);
    expect(timingSafeEqualStr('', '')).toBe(true);
  });
});

describe('session tokens', () => {
  it('verifies a fresh token', () => {
    expect(verifySessionToken(createSessionToken())).toBe(true);
  });

  it('rejects an expired token', () => {
    const issued = Date.now() - (SESSION_TTL_SECONDS + 10) * 1000;
    expect(verifySessionToken(createSessionToken(issued))).toBe(false);
  });

  it('rejects a tampered expiry or signature', () => {
    const [exp, mac] = createSessionToken()!.split('.');
    expect(verifySessionToken(`${Number(exp) + 100000}.${mac}`)).toBe(false);
    expect(verifySessionToken(`${exp}.${mac}x`)).toBe(false);
    expect(verifySessionToken('garbage')).toBe(false);
    expect(verifySessionToken('')).toBe(false);
    expect(verifySessionToken(undefined)).toBe(false);
  });

  it('rejects a token signed with a different secret', () => {
    const token = createSessionToken()!;
    vi.stubEnv('API_SECRET', 'another-secret');
    expect(verifySessionToken(token)).toBe(false);
  });

  it('fails closed without API_SECRET', () => {
    const token = createSessionToken()!;
    vi.stubEnv('API_SECRET', '');
    expect(createSessionToken()).toBeNull();
    expect(verifySessionToken(token)).toBe(false);
  });
});

describe('cookies', () => {
  it('sets an HttpOnly, Secure, SameSite=Strict cookie', () => {
    const res = mockRes();
    setSessionCookie(asRes(res), 'tok');
    const cookie = res.headers['Set-Cookie'];
    expect(cookie).toContain(`${SESSION_COOKIE}=tok`);
    for (const attr of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/']) {
      expect(cookie).toContain(attr);
    }
  });

  it('clears the cookie', () => {
    const res = mockRes();
    clearSessionCookie(asRes(res));
    expect(res.headers['Set-Cookie']).toContain('Max-Age=0');
  });
});

describe('requireSession', () => {
  it('lets a valid cookie through', () => {
    const res = mockRes();
    const cookie = `other=1; ${SESSION_COOKIE}=${createSessionToken()}`;
    expect(requireSession(mockReq({ cookie }), asRes(res))).toBe(true);
    expect(res.statusCode).toBe(0);
  });

  it('answers 401 with no cookie or an invalid one', () => {
    for (const cookie of [undefined, `${SESSION_COOKIE}=nope`]) {
      const res = mockRes();
      expect(requireSession(mockReq({ cookie }), asRes(res))).toBe(false);
      expect(res.statusCode).toBe(401);
    }
  });

  it('fails closed with 401 when API_SECRET is missing', () => {
    const cookie = `${SESSION_COOKIE}=${createSessionToken()}`;
    vi.stubEnv('API_SECRET', '');
    const res = mockRes();
    expect(requireSession(mockReq({ cookie }), asRes(res))).toBe(false);
    expect(res.statusCode).toBe(401);
  });
});

describe('/api/auth', () => {
  it('GET is 200 with a session and 401 without', async () => {
    const ok = mockRes();
    await authHandler(mockReq({ cookie: `${SESSION_COOKIE}=${createSessionToken()}` }), asRes(ok));
    expect(ok.statusCode).toBe(200);
    const no = mockRes();
    await authHandler(mockReq(), asRes(no));
    expect(no.statusCode).toBe(401);
  });

  it('POST with the right password sets the cookie', async () => {
    const res = mockRes();
    await authHandler(mockReq({ method: 'POST', body: { password: SECRET } }), asRes(res));
    expect(res.statusCode).toBe(200);
    expect(res.headers['Set-Cookie']).toContain(`${SESSION_COOKIE}=`);
  });

  it('POST with a wrong or non-string password is 401 and sets no cookie', async () => {
    for (const body of [{ password: 'wrong' }, { password: 123 }, {}, undefined]) {
      const res = mockRes();
      await authHandler(mockReq({ method: 'POST', body }), asRes(res));
      expect(res.statusCode).toBe(401);
      expect(res.headers['Set-Cookie']).toBeUndefined();
    }
  });

  it('POST fails closed without API_SECRET, even for an empty password', async () => {
    vi.stubEnv('API_SECRET', '');
    const res = mockRes();
    await authHandler(mockReq({ method: 'POST', body: { password: '' } }), asRes(res));
    expect(res.statusCode).toBe(500);
    expect(res.headers['Set-Cookie']).toBeUndefined();
  });

  it('DELETE clears the cookie', async () => {
    const res = mockRes();
    await authHandler(mockReq({ method: 'DELETE' }), asRes(res));
    expect(res.statusCode).toBe(204);
    expect(res.headers['Set-Cookie']).toContain('Max-Age=0');
  });
});
