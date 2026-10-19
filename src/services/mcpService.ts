import type { PropuestaGuardada } from '../domain/nutrikal/proposals.js';
import type { CalendarOperationResult } from './calendarPlanTypes.js';
import type { PrevisualizacionPropuesta } from '../domain/nutrikal/proposalOperations.js';

export interface McpToken { id: string; name: string; can_propose: boolean; expires_at: string; revoked_at: string | null }
export interface McpReview {
  id: string; kind: 'apply' | 'undo'; targetId: string; expiresAt: string; applied: boolean; undone: boolean; title: string;
  preview?: PrevisualizacionPropuesta;
  slots?: Array<{ fecha: string; tipo: string; antes: string[]; despues: string[] }>;
  shopping?: { antes: string[]; despues: string[] };
}
async function request<T>(path = '', body?: unknown): Promise<T> {
  const token = localStorage.getItem('nutrikal-jwt');
  if (!token) throw new Error('Iniciá sesión para administrar tu conexión.');
  const response = await fetch(`/api/mcp/manage${path}`, { method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'No pude completar el pedido.');
  return data as T;
}
export const loadMcpManagement = () => request<{ tokens: McpToken[]; proposals: Array<{ id: string; titulo: string; created_at: string }> }>();
export const createPersonalMcpToken = (name: string, canPropose: boolean) => request<{ token: McpToken; secret: string }>('', { action: 'createToken', name, canPropose });
export const revokePersonalMcpToken = (id: string) => request('', { action: 'revokeToken', id });
export const loadMcpReview = (id: string) => request<McpReview>(`?review=${encodeURIComponent(id)}`);
export const loadMcpProposal = (id: string) => request<PropuestaGuardada>(`?proposal=${encodeURIComponent(id)}`);
export const confirmMcpReview = (id: string) => request<CalendarOperationResult>('', { action: 'confirmReview', id });
