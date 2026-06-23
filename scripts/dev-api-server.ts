import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { parse as parseUrl } from 'node:url';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import loginHandler from '../api/auth/login.ts';
import registerHandler from '../api/auth/register.ts';
import meHandler from '../api/auth/me.ts';
import chatHandler from '../api/ai/chat.ts';
import geminiHandler from '../api/ai/gemini.ts';
import embedHandler from '../api/ai/embed.ts';
import searchHandler from '../api/ai/search.ts';
import rawHandler from '../api/ai/raw.ts';
import weekPlanHandler from '../api/ai/week-plan.ts';
import businessHandler from '../api/business/[...route].ts';

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void | VercelResponse>;

const PORT = Number(process.env.PORT ?? 3000);

function loadEnvLocal() {
  try {
    for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      if (!line || line.startsWith('#')) continue;
      const i = line.indexOf('=');
      if (i < 0) continue;
      const key = line.slice(0, i).trim();
      let val = line.slice(i + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    console.warn('[dev-api] No .env.local found — set SUPABASE_URL, JWT_SECRET, etc.');
  }
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  if (req.method === 'GET' || req.method === 'HEAD') return {};
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function buildQuery(url: string): Record<string, string | string[]> {
  const parsed = parseUrl(url, true);
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(parsed.query)) {
    if (value === undefined) continue;
    out[key] = value;
  }
  return out;
}

function createPseudoRes(nodeRes: ServerResponse): {
  res: VercelResponse;
  flush: () => void;
} {
  let statusCode = 200;
  let body: unknown = {};
  const headers: Record<string, string> = {};

  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
      return res;
    },
    json(payload: unknown) {
      body = payload;
      return res;
    },
    send(payload: unknown) {
      body = payload;
      return res;
    },
  } as VercelResponse;

  const flush = () => {
    if (nodeRes.headersSent) return;
    nodeRes.statusCode = statusCode;
    for (const [k, v] of Object.entries(headers)) nodeRes.setHeader(k, v);
    if (!nodeRes.getHeader('content-type')) {
      nodeRes.setHeader('content-type', 'application/json; charset=utf-8');
    }
    nodeRes.end(typeof body === 'string' ? body : JSON.stringify(body ?? {}));
  };

  return { res, flush };
}

const exactRoutes: Record<string, Handler> = {
  'POST /api/auth/login': loginHandler,
  'POST /api/auth/register': registerHandler,
  'GET /api/auth/me': meHandler,
  'POST /api/ai/chat': chatHandler,
  'POST /api/ai/gemini': geminiHandler,
  'POST /api/ai/embed': embedHandler,
  'POST /api/ai/search': searchHandler,
  'POST /api/ai/raw': rawHandler,
  'POST /api/ai/week-plan': weekPlanHandler,
};

function resolveHandler(method: string, pathname: string): {
  handler: Handler;
  query: Record<string, string | string[]>;
} | null {
  const key = `${method} ${pathname}`;
  if (exactRoutes[key]) return { handler: exactRoutes[key], query: {} };

  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/') && !pathname.startsWith('/api/ai/')) {
    const route = pathname.replace(/^\/api\/?/, '');
    if (route) {
      return {
        handler: businessHandler,
        query: { route },
      };
    }
  }

  return null;
}

loadEnvLocal();

const server = createServer(async (nodeReq, nodeRes) => {
  if (nodeReq.method === 'OPTIONS') {
    nodeRes.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'access-control-allow-headers': 'authorization, content-type',
    });
    nodeRes.end();
    return;
  }

  const url = nodeReq.url ?? '/';
  const pathname = url.split('?')[0] ?? '/';
  const method = (nodeReq.method ?? 'GET').toUpperCase();
  const match = resolveHandler(method, pathname);

  if (!match) {
    nodeRes.writeHead(404, { 'content-type': 'application/json' });
    nodeRes.end(JSON.stringify({ error: 'Not found', path: pathname }));
    return;
  }

  const body = await readBody(nodeReq);
  const query = { ...buildQuery(url), ...match.query };
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(nodeReq.headers)) {
    if (v !== undefined) headers[k] = Array.isArray(v) ? v.join(', ') : v;
  }

  const pseudoReq = {
    method,
    url,
    headers,
    query,
    body,
  } as VercelRequest;

  const { res, flush } = createPseudoRes(nodeRes);

  try {
    await match.handler(pseudoReq, res);
    flush();
  } catch (err) {
    console.error('[dev-api] handler error:', err);
    if (!nodeRes.headersSent) {
      nodeRes.writeHead(500, { 'content-type': 'application/json' });
      nodeRes.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }));
    }
  }
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[dev-api] Puerto ${PORT} ocupado. Cerrá el otro servidor o ejecutá:`);
    console.error(`  Get-NetTCPConnection -LocalPort ${PORT} | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[dev-api] Local API ready at http://127.0.0.1:${PORT}`);
  console.log('[dev-api] Use npm run dev (Vite :5173) and open http://localhost:5173');
});
