import { getSupabase } from '../supabase.js';
import type { McpAccess } from './access.js';
import { readSnapshot, toClient, undoChanges, type Snapshot } from '../calendarPlanning.js';
import { crearFuncionesPropuestas } from '../nutrikal/proposalFunctions.js';
import { exigir } from '../../../src/domain/nutrikal/validation.js';
import type { PrevisualizacionPropuesta } from '../../../src/domain/nutrikal/proposalOperations.js';
import type { CalendarPlanningSnapshot } from '../../../src/services/calendarPlanTypes.js';

const isUuid = (x: unknown): x is string => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
export interface McpReview {
  id: string; kind: 'apply' | 'undo'; targetId: string; expiresAt: string; applied: boolean; undone: boolean;
  title: string; preview?: PrevisualizacionPropuesta;
  slots?: Array<{ fecha: string; tipo: string; antes: string[]; despues: string[] }>;
  shopping?: { antes: string[]; despues: string[] };
}
async function activeToken(userId: string, tokenId: string) {
  const result = await getSupabase().from('nutrikal_mcp_tokens').select('id').eq('user_id', userId).eq('id', tokenId).eq('can_propose', true).is('revoked_at', null).gt('expires_at', new Date().toISOString()).maybeSingle();
  if (result.error) throw new Error('mcp_review_storage_error');
  exigir(result.data, 'El acceso que pidió este cambio fue revocado, venció o es de solo lectura.');
}
async function operationState(userId: string, id: string) {
  const result = await getSupabase().from('calendar_operations').select('id,undone_by').eq('user_id', userId).eq('id', id).maybeSingle();
  if (result.error) throw new Error('mcp_review_storage_error');
  return { applied: Boolean(result.data), undone: Boolean(result.data?.undone_by) };
}
export async function requestMcpReview(access: McpAccess, kind: 'apply' | 'undo', targetId: string, today: string, appOrigin: string): Promise<Record<string, unknown>> {
  exigir(access.canPropose && isUuid(targetId), 'Acceso sin permiso para preparar cambios o identificador inválido.');
  const db = getSupabase();
  const existing = await db.from('nutrikal_mcp_reviews').select('id,expires_at').eq('user_id', access.userId).eq('token_id', access.tokenId).eq('kind', kind).eq('target_id', targetId).maybeSingle();
  if (existing.error) throw new Error('mcp_review_storage_error');
  const response = (id: string, expiresAt: string) => ({ estado: 'requiere_confirmacion_en_nutrikal', calendarioModificado: false, solicitudId: id, venceEn: expiresAt,
    enlaceRevision: `${appOrigin}/mcp?review=${id}`, instruccion: 'La persona debe abrir este enlace, revisar y confirmar en Nutrikal. No afirmes que el calendario cambió. consultar_operacion permite comprobar el resultado.' });
  if (existing.data) {
    const state = await operationState(access.userId, kind === 'apply' ? targetId : existing.data.id);
    return state.applied ? { solicitudId: existing.data.id, estado: state.undone ? 'deshecha' : 'aplicada', operacionId: kind === 'apply' ? targetId : existing.data.id, calendarioModificadoEnEstaLlamada: false } : response(existing.data.id, existing.data.expires_at);
  }
  let review: Omit<McpReview, 'id' | 'expiresAt' | 'applied' | 'undone'>;
  let expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
  let calendarVersion: string;
  if (kind === 'apply') {
    const preview = await db.from('nutrikal_previews').select('review,expires_at').eq('user_id', access.userId).eq('id', targetId).maybeSingle();
    if (preview.error) throw new Error('mcp_review_storage_error');
    exigir(preview.data && Date.parse(preview.data.expires_at) > Date.now(), 'La previsualización no existe o venció. Prepará una nueva.');
    const p = preview.data.review as PrevisualizacionPropuesta;
    calendarVersion = p.versionCalendario; expiresAt = preview.data.expires_at;
    review = { kind, targetId, title: 'Agregar propuesta al calendario', preview: p };
  } else {
    const before = await readSnapshot(access.userId);
    const history = await db.from('calendar_operations').select('before_state,after_state,undone_by').eq('user_id', access.userId).eq('id', targetId).maybeSingle();
    if (history.error) throw new Error('mcp_review_storage_error');
    exigir(history.data && !history.data.undone_by, 'La operación no existe o ya fue deshecha.');
    const after = undoChanges(before, history.data.before_state as Snapshot, history.data.after_state as Snapshot);
    const current = toClient(before), restored = toClient(after);
    calendarVersion = current.version;
    const keys = new Set([...current.meals, ...restored.meals].map((m) => `${m.date}:${m.mealType}`));
    const slots = [...keys].flatMap((key) => {
      const select = (state: CalendarPlanningSnapshot) => state.meals.filter((m) => `${m.date}:${m.mealType}` === key);
      const old = select(current), next = select(restored);
      if (JSON.stringify(old) === JSON.stringify(next)) return [];
      exigir(![...old, ...next].some((m) => m.completed || m.date < today), 'Este cambio incluye comidas realizadas o fechas pasadas.');
      const sample = old[0] ?? next[0];
      const names = (rows: typeof old) => rows.map((m) => `${m.name}${m.isAlternative ? ' (alternativa)' : ''}`);
      return [{ fecha: sample.date, tipo: sample.mealType, antes: names(old), despues: names(next) }];
    });
    const shopping = (state: CalendarPlanningSnapshot) => state.shoppingLists.flatMap((l) => l.items.map((i) => `${l.name} · ${i.name}: ${i.quantity}${i.checked ? ' (comprado)' : ''}`));
    review = { kind, targetId, title: 'Deshacer un cambio de calendario', slots, shopping: { antes: shopping(current), despues: shopping(restored) } };
  }
  const saved = await db.from('nutrikal_mcp_reviews').insert({ user_id: access.userId, token_id: access.tokenId, kind, target_id: targetId, calendar_version: calendarVersion, review, expires_at: expiresAt }).select('id').single();
  if (saved.error?.code === '23505') return requestMcpReview(access, kind, targetId, today, appOrigin);
  if (saved.error) throw new Error('mcp_review_storage_error');
  return response(saved.data.id, expiresAt);
}
export async function loadMcpReview(userId: string, id: string): Promise<McpReview> {
  exigir(isUuid(id), 'Solicitud inválida.');
  const row = await getSupabase().from('nutrikal_mcp_reviews').select('*').eq('user_id', userId).eq('id', id).maybeSingle();
  if (row.error) throw new Error('mcp_review_storage_error');
  exigir(row.data, 'No encontré esa solicitud.');
  await activeToken(userId, row.data.token_id);
  const state = await operationState(userId, row.data.kind === 'apply' ? row.data.target_id : id);
  return { ...(row.data.review as Omit<McpReview, 'id' | 'expiresAt' | 'applied' | 'undone'>), id, expiresAt: row.data.expires_at, ...state };
}
/** Called exclusively by the JWT-authenticated app, never with an MCP personal token. */
export async function confirmMcpReview(userId: string, id: string, today: string) {
  const review = await loadMcpReview(userId, id);
  exigir(review.applied || Date.parse(review.expiresAt) > Date.now(), 'La solicitud venció. Pedí una previsualización nueva al asistente.');
  const f = crearFuncionesPropuestas(userId, today);
  if (review.kind === 'apply') return f.aplicarCambios(review.targetId);
  const stored = await getSupabase().from('nutrikal_mcp_reviews').select('calendar_version').eq('user_id', userId).eq('id', id).single();
  if (stored.error) throw new Error('mcp_review_storage_error');
  return f.deshacerOperacion(review.targetId, stored.data.calendar_version, id);
}
