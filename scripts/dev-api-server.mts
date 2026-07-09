// Local stand-in for Vercel's serverless function runtime, used only in dev.
// Production still uses Vercel's own `/api/*.ts` auto-detection — this file
// isn't part of that; it just lets `npm run dev` exercise the same handlers
// locally without depending on `vercel dev` reaching Vercel's control plane.
//
// Usage: npm run dev:api (proxied from Vite's dev server at /api/*)
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const PORT = 3001;
const API_DIR = path.join(process.cwd(), 'api');

const resolveHandler = (pathname: string): { filePath: string; params: Record<string, string> } | null => {
  const segments = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const exact = path.join(API_DIR, ...segments) + '.ts';
  if (fs.existsSync(exact)) return { filePath: exact, params: {} };

  const index = path.join(API_DIR, ...segments, 'index.ts');
  if (fs.existsSync(index)) return { filePath: index, params: {} };

  const dirSegments = segments.slice(0, -1);
  const lastSegment = segments[segments.length - 1];
  const dynamic = path.join(API_DIR, ...dirSegments, '[id].ts');
  if (fs.existsSync(dynamic)) return { filePath: dynamic, params: { id: lastSegment } };

  return null;
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const resolved = resolveHandler(url.pathname);
  if (!resolved) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const rawBody = Buffer.concat(chunks).toString('utf8');
  let parsedBody: unknown;
  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = rawBody;
    }
  }

  const query: Record<string, string | string[]> = { ...resolved.params };
  for (const [key, value] of url.searchParams.entries()) query[key] = value;

  const vercelReq = Object.assign(req, { query, body: parsedBody, cookies: {} }) as unknown as VercelRequest;

  let statusCode = 200;
  const vercelRes = {
    status(code: number) {
      statusCode = code;
      return vercelRes;
    },
    json(payload: unknown) {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
      return vercelRes;
    },
    setHeader(name: string, value: string) {
      res.setHeader(name, value);
      return vercelRes;
    },
    end() {
      res.writeHead(statusCode);
      res.end();
      return vercelRes;
    },
  } as unknown as VercelResponse;

  try {
    // Cache-bust so edits to handler files are picked up without restarting.
    const mod = await import(`${pathToFileURL(resolved.filePath).href}?t=${Date.now()}`);
    await mod.default(vercelReq, vercelRes);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: (err as Error).message }));
    }
  }
});

server.listen(PORT, () => console.log(`API dev server listening on http://localhost:${PORT}`));
