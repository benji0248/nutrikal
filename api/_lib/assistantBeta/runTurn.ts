import type { Content, GenerateContentResponse, Part } from '@google/generative-ai';
import type { AssistantBetaMessage, AssistantToolActivity, AssistantTurnDiagnostics } from '../../../src/types/assistantBeta.js';

export const LEGACY_FALLBACK = 'No pude completar el pedido en este intento. Tu calendario sigue igual. Podemos continuar desde lo que conversamos.';
const blockedReasons = new Set(['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'LANGUAGE']);
const malformedReasons = new Set(['MALFORMED_FUNCTION_CALL', 'MALFORMED_RESPONSE', 'UNEXPECTED_TOOL_CALL']);

/** Evidence for subsequent turns: a generic fallback never proves that the calendar tool failed. */
export function toolEvidenceContext(message: AssistantBetaMessage): string {
  if (message.role !== 'assistant') return '';
  if (!message.diagnostics && message.tools === undefined && message.text !== LEGACY_FALLBACK) return '';
  return `\nRegistro técnico de este turno (datos del servidor, no inferir otras ejecuciones): ${JSON.stringify({
    resultado: message.diagnostics?.outcome ?? (message.text === LEGACY_FALLBACK ? 'sin_respuesta_utilizable_causa_no_registrada' : 'sin_diagnostico'),
    herramientasEjecutadas: (message.tools ?? []).map((tool) => ({ nombre: tool.name, ok: tool.ok, codigo: tool.code, consultaCalendario: tool.calendarQuery })),
  })}`;
}

function fallback(diagnostics: AssistantTurnDiagnostics, activities: AssistantToolActivity[]): string {
  if (!activities.length) return 'No pude obtener una respuesta utilizable del asistente. No llegué a consultar tus datos, así que todavía no tengo un resultado para responder a tu pedido.';
  const calendar = activities.filter((a) => a.name === 'obtener_comidas');
  if (calendar.some((a) => !a.ok)) return 'No pude completar la consulta del calendario. No tengo un resultado confiable para decirte qué está planificado; eso no significa que esté vacío.';
  if (calendar.some((a) => a.ok)) return 'Pude consultar el calendario, pero el asistente no terminó de preparar la respuesta. No apliqué cambios. Podés pedirme que continúe con la consulta.';
  if (diagnostics.outcome === 'tool_limit' || diagnostics.outcome === 'time_limit') return 'El asistente alcanzó el límite de este intento antes de terminar. Algunas consultas se completaron, pero no apliqué cambios al calendario.';
  return 'No pude terminar de preparar la respuesta. Algunas consultas se completaron; no apliqué cambios al calendario.';
}

/** Bounded orchestration. Invalid/empty provider output is not a tool execution or an empty calendar. */
export async function runAssistantTurn(deps: {
  model: string;
  contents: Content[];
  generate: (contents: Content[], recovery: boolean, timeoutMs: number) => Promise<GenerateContentResponse>;
  tools: { execute(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>>; drafts: unknown[]; activities: AssistantToolActivity[] };
}) {
  const diagnostics: AssistantTurnDiagnostics = { model: deps.model, outcome: 'empty_response', recoveries: 0, rounds: [] };
  const contents = [...deps.contents];
  const deadline = Date.now() + 200_000;
  let callCount = 0;
  let recovery = false;
  let reply = '';
  for (let round = 0; round < 8; round++) {
    const remaining = deadline - Date.now();
    if (remaining < 1000) { diagnostics.outcome = 'time_limit'; break; }
    const started = Date.now();
    let response: GenerateContentResponse;
    try { response = await deps.generate(contents, recovery, Math.min(45_000, remaining)); }
    catch (e) {
      diagnostics.rounds.push({ durationMs: Date.now() - started, calls: [], errorType: e instanceof Error ? e.name.slice(0, 80) : 'provider_error' });
      diagnostics.outcome = 'provider_error'; break;
    }
    const candidate = response.candidates?.[0];
    const reason = candidate?.finishReason as string | undefined;
    const blockReason = response.promptFeedback?.blockReason as string | undefined;
    const parts = candidate?.content?.parts ?? [];
    const calls = parts.flatMap((part) => part.functionCall ? [part.functionCall] : []);
    diagnostics.rounds.push({ durationMs: Date.now() - started, finishReason: reason, blockReason,
      calls: calls.map((call) => typeof call.name === 'string' ? call.name.slice(0, 80) : 'nombre_invalido'), inputTokens: response.usageMetadata?.promptTokenCount, outputTokens: response.usageMetadata?.candidatesTokenCount });
    if (blockReason || (reason && blockedReasons.has(reason))) { diagnostics.outcome = 'blocked_response'; break; }
    // Do not display partial tool syntax, executable snippets or the model's thought text.
    const malformedCall = calls.some((call) => typeof call.name !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/.test(call.name)
      || (call.args !== undefined && (call.args === null || typeof call.args !== 'object' || Array.isArray(call.args))));
    const invalid = (reason !== undefined && reason !== 'STOP') || malformedCall;
    const text = invalid ? '' : parts.filter((part) => !(part as Part & { thought?: boolean }).thought).map((part) => part.text ?? '').join('').trim();
    if (invalid || (!calls.length && !text)) {
      diagnostics.outcome = 'empty_response';
      const recoverable = !reason || reason === 'STOP' || reason === 'MAX_TOKENS' || malformedReasons.has(reason);
      if (!diagnostics.recoveries && recoverable && round < 7 && deadline - Date.now() > 1000) {
        diagnostics.recoveries++; recovery = true;
        // Retry only the provider response. Never execute a malformed/partial function call.
        continue;
      }
      break;
    }
    recovery = false;
    if (!calls.length) { reply = text; diagnostics.outcome = 'answered'; break; }
    contents.push(candidate!.content!);
    const results: Part[] = [];
    for (const call of calls) {
      if (callCount >= 16) { diagnostics.outcome = 'tool_limit'; break; }
      callCount++;
      if (Date.now() >= deadline) { diagnostics.outcome = 'time_limit'; break; }
      const output = await deps.tools.execute(call.name, (call.args ?? {}) as Record<string, unknown>);
      results.push({ functionResponse: { name: call.name, response: output } });
    }
    if (deps.tools.drafts.length) {
      diagnostics.outcome = 'draft_saved';
      reply = 'Preparé esta propuesta para que la revises. Todavía no cambié tu calendario.';
      break;
    }
    if (diagnostics.outcome === 'tool_limit' || diagnostics.outcome === 'time_limit') break;
    contents.push({ role: 'function', parts: results });
    if (round === 7) diagnostics.outcome = 'tool_limit';
  }
  return { reply: reply || fallback(diagnostics, deps.tools.activities), diagnostics };
}
