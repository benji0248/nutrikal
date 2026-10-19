import type { AssistantBetaConversation, AssistantBetaState } from '../types/assistantBeta';
import type { ConsultaPrevisualizacion, PrevisualizacionPropuesta } from '../domain/nutrikal/proposalOperations.js';
import type { CalendarOperationResult } from './calendarPlanTypes.js';

async function request<T>(path = '', body?: unknown): Promise<T> {
  const token = localStorage.getItem('nutrikal-jwt');
  if (!token) throw new Error('Tu sesión expiró. Volvé a iniciar sesión.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 240_000);
  try {
    const response = await fetch(`/api/assistant-beta${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'No pude cargar el asistente.');
    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('El pedido está tardando demasiado. Recargá la conversación antes de reintentar.');
    throw error;
  } finally { clearTimeout(timer); }
}

export const getAssistantBetaAccess = () => request<{ enabled: boolean }>('?capability=1');
const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
export const previewAssistantProposal = (consulta: ConsultaPrevisualizacion) => request<PrevisualizacionPropuesta>('', { action: 'preview', ...consulta, timeZone: timeZone() });
export const applyAssistantPreview = (previsualizacionId: string) => request<CalendarOperationResult>('', { action: 'applyPreview', previsualizacionId, timeZone: timeZone() });
export const undoAssistantOperation = (operacionId: string, versionCalendario: string, requestId: string) => request<CalendarOperationResult>('', { action: 'undoProposal', operacionId, versionCalendario, requestId, timeZone: timeZone() });
export const loadAssistantBeta = (id?: string) => request<AssistantBetaState>(id ? `?id=${encodeURIComponent(id)}` : '');
export const createAssistantBetaConversation = () => request<{ conversation: AssistantBetaConversation }>('', { action: 'create' });
export const sendAssistantBetaMessage = (conversation: AssistantBetaConversation, text: string, requestId: string, draftReferenceId?: string) =>
  request<{ conversation: AssistantBetaConversation }>('', {
    action: 'message', conversationId: conversation.id, revision: conversation.revision,
    requestId, text, draftReferenceId, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
