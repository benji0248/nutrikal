import type { VercelRequest, VercelResponse } from '@vercel/node';
import catchAllHandler from './business/[...route].js';

function resolveRouteFromUrl(req: VercelRequest): string[] {
  const pathRaw = (req.url ?? '').split('?')[0] ?? '';
  return pathRaw
    .replace(/^\/api\/business\/?/, '')
    .split('/')
    .filter(Boolean);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const routeQuery = req.query.route;
  if (!routeQuery || (Array.isArray(routeQuery) && routeQuery.length === 0)) {
    const resolved = resolveRouteFromUrl(req);
    (req.query as Record<string, unknown>).route = resolved;
  }
  return catchAllHandler(req, res);
}
