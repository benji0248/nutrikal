import type { VercelRequest, VercelResponse } from '@vercel/node';
import { assistantBetaEnabled } from '../assistantBeta/access.js';
import { getSupabase } from '../supabase.js';
import { createMcpToken } from './access.js';
import { confirmMcpReview, loadMcpReview } from './reviews.js';
import { crearFuncionesPropuestas } from '../nutrikal/proposalFunctions.js';
import { ErrorFuncionesNutrikal, exigir } from '../../../src/domain/nutrikal/validation.js';

export default async function handler(req: VercelRequest, res: VercelResponse, userId: string) {
  res.setHeader('Cache-Control', 'no-store');
  if (!assistantBetaEnabled(userId)) return res.status(403).json({ error: 'MCP no habilitado para esta cuenta.' });
  try {
    const db = getSupabase();
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
    if (req.method === 'GET') {
      if (typeof req.query.review === 'string') return res.status(200).json(await loadMcpReview(userId, req.query.review));
      if (typeof req.query.proposal === 'string') return res.status(200).json(await crearFuncionesPropuestas(userId, today).leerPropuesta(req.query.proposal));
      const [tokens, proposals] = await Promise.all([
        db.from('nutrikal_mcp_tokens').select('id,name,can_propose,created_at,expires_at,revoked_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
        db.from('nutrikal_proposals').select('id,content->>titulo,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
      ]);
      if (tokens.error || proposals.error) throw new Error('mcp_storage_error');
      return res.status(200).json({ tokens: tokens.data, proposals: proposals.data });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
    const body = req.body;
    exigir(body && typeof body === 'object' && !Array.isArray(body), 'Pedido inválido.');
    if (body.action === 'createToken') return res.status(200).json(await createMcpToken(userId, body.name, body.canPropose));
    if (body.action === 'revokeToken') {
      exigir(typeof body.id === 'string' && /^[0-9a-f-]{36}$/i.test(body.id), 'Acceso inválido.');
      const result = await db.from('nutrikal_mcp_tokens').update({ revoked_at: new Date().toISOString() }).eq('user_id', userId).eq('id', body.id);
      if (result.error) throw new Error('mcp_storage_error');
      return res.status(200).json({ revoked: true });
    }
    if (body.action === 'confirmReview') return res.status(200).json(await confirmMcpReview(userId, body.id, today));
    return res.status(400).json({ error: 'Acción inválida.' });
  } catch (e) {
    if (e instanceof ErrorFuncionesNutrikal) return res.status(e.codigo === 'conflicto' ? 409 : 400).json({ error: e.message });
    console.error('[nutrikal-mcp-manage]', e instanceof Error ? e.name : 'storage_error');
    return res.status(503).json({ error: 'No pude completar esta operación. Recargá para ver su estado antes de reintentar.' });
  }
}
