import type { VercelRequest, VercelResponse } from '@vercel/node';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { authenticateMcp } from './access.js';
import { createNutrikalMcpServer } from './server.js';

export function mcpOrigin() {
  return process.env.NODE_ENV !== 'production' && process.env.NUTRIKAL_MCP_ORIGIN ? new URL(process.env.NUTRIKAL_MCP_ORIGIN).origin : 'https://nutrikal.vercel.app';
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const origin = mcpOrigin();
  if (req.headers.origin && req.headers.origin !== origin) return res.status(403).json({ error: 'Origen no permitido.' });
  if (!['GET', 'POST', 'DELETE'].includes(req.method ?? '')) return res.status(405).json({ error: 'Método no permitido.' });
  try {
    const access = await authenticateMcp(req.headers.authorization);
    if (!access) { res.setHeader('WWW-Authenticate', 'Bearer realm="Nutrikal MCP"'); return res.status(401).json({ error: 'Acceso MCP requerido, revocado o vencido. Crealo desde Nutrikal /mcp.' }); }
    // Stateless JSON transport: no process memory, sessions or persistent SSE in Vercel.
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Este servidor MCP usa POST sin sesiones ni stream GET.' }); }
    const body = JSON.stringify(req.body ?? {});
    if (Buffer.byteLength(body) > 256 * 1024) return res.status(413).json({ error: 'Pedido demasiado grande.' });
    const server = createNutrikalMcpServer(access, origin);
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true, maxRequestBodySize: 256 * 1024 });
    try {
      await server.connect(transport);
      const headers = new Headers();
      for (const key of ['accept', 'content-type', 'mcp-protocol-version']) { const value = req.headers[key]; if (typeof value === 'string') headers.set(key, value); }
      const response = await transport.handleRequest(new Request(`${origin}/api/mcp`, { method: 'POST', headers, body }));
      const text = await response.text();
      response.headers.forEach((value, key) => res.setHeader(key, value));
      return res.status(response.status).send(text);
    } finally { await server.close(); await transport.close(); }
  } catch (e) {
    console.error('[nutrikal-mcp]', e instanceof Error ? e.name : 'server_error');
    return res.status(503).json({ error: 'MCP no disponible en este momento.' });
  }
}
