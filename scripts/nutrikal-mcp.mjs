// MCP stdio bridge. Never write logs, credentials or banners to stdout.
import { readFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema } from '@modelcontextprotocol/sdk/types.js';

let remote;
let local;
try {
  const token = (process.env.NUTRIKAL_MCP_TOKEN ?? (process.env.NUTRIKAL_MCP_TOKEN_FILE ? readFileSync(process.env.NUTRIKAL_MCP_TOKEN_FILE, 'utf8') : '')).replace(/^\uFEFF/, '').trim();
  if (!/^nk_mcp_[0-9a-f]{64}$/.test(token)) throw new Error('missing_access');
  const url = new URL(process.env.NUTRIKAL_MCP_URL ?? 'https://nutrikal.vercel.app/api/mcp');
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))) || url.username || url.password || url.search || url.hash) throw new Error('invalid_url');
  remote = new Client({ name: 'nutrikal-stdio-bridge', version: '1.0.0' });
  await remote.connect(new StreamableHTTPClientTransport(url, {
    requestInit: { headers: { Authorization: `Bearer ${token}` }, redirect: 'error' },
  }));
  local = new Server({ name: 'nutrikal', version: '1.0.0' }, {
    capabilities: { tools: {}, resources: {}, prompts: {} }, instructions: remote.getInstructions(),
  });
  local.setRequestHandler(ListToolsRequestSchema, (req) => remote.listTools(req.params));
  local.setRequestHandler(CallToolRequestSchema, (req, extra) => remote.callTool(req.params, undefined, { signal: extra.signal, timeout: 60_000 }));
  local.setRequestHandler(ListResourcesRequestSchema, (req) => remote.listResources(req.params));
  local.setRequestHandler(ReadResourceRequestSchema, (req) => remote.readResource(req.params));
  local.setRequestHandler(ListPromptsRequestSchema, (req) => remote.listPrompts(req.params));
  local.setRequestHandler(GetPromptRequestSchema, (req) => remote.getPrompt(req.params));
  const close = async () => { await local?.close(); await remote?.close(); };
  process.once('SIGINT', () => { void close().finally(() => process.exit(0)); });
  process.once('SIGTERM', () => { void close().finally(() => process.exit(0)); });
  process.stdin.once('end', () => { void close().finally(() => process.exit(0)); });
  await local.connect(new StdioServerTransport());
} catch {
  console.error('No pude conectar con Nutrikal. Creá un acceso en https://nutrikal.vercel.app/mcp y configurá NUTRIKAL_MCP_TOKEN o NUTRIKAL_MCP_TOKEN_FILE. Verificá que siga vigente.');
  await local?.close().catch(() => {});
  await remote?.close().catch(() => {});
  process.exit(1);
}
