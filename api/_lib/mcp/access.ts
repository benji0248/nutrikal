import { createHash, randomBytes } from 'node:crypto';
import { getSupabase } from '../supabase.js';
import { assistantBetaEnabled } from '../assistantBeta/access.js';
import { exigir } from '../../../src/domain/nutrikal/validation.js';

export interface McpAccess { userId: string; tokenId: string; canPropose: boolean }
export const hashToken = (secret: string) => createHash('sha256').update(secret).digest('hex');
export async function authenticateMcp(header: string | undefined): Promise<McpAccess | null> {
  if (!header?.startsWith('Bearer nk_mcp_') || header.length > 150) return null;
  const { data, error } = await getSupabase().from('nutrikal_mcp_tokens').select('id,user_id,can_propose,expires_at,revoked_at').eq('secret_hash', hashToken(header.slice(7))).maybeSingle();
  if (error) throw new Error('mcp_auth_unavailable');
  if (!data || data.revoked_at || Date.parse(data.expires_at) <= Date.now() || !assistantBetaEnabled(data.user_id)) return null;
  return { userId: data.user_id, tokenId: data.id, canPropose: data.can_propose };
}
export async function createMcpToken(userId: string, name: unknown, canPropose: unknown) {
  exigir(typeof name === 'string' && name.trim().length > 0 && name.length <= 80 && typeof canPropose === 'boolean', 'Indicá un nombre de acceso y sus permisos.');
  const db = getSupabase();
  const count = await db.from('nutrikal_mcp_tokens').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('revoked_at', null).gt('expires_at', new Date().toISOString());
  if (count.error) throw new Error('mcp_token_storage_error');
  exigir((count.count ?? 0) < 10, 'Tenés 10 accesos activos. Revocá uno antes de crear otro.');
  const secret = `nk_mcp_${randomBytes(32).toString('hex')}`;
  const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
  const saved = await db.from('nutrikal_mcp_tokens').insert({ user_id: userId, name: name.trim(), secret_hash: hashToken(secret), can_propose: canPropose, expires_at: expiresAt }).select('id,name,can_propose,created_at,expires_at,revoked_at').single();
  if (saved.error) throw new Error('mcp_token_storage_error');
  return { token: saved.data, secret };
}
