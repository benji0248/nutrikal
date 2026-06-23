/**
 * Logs estructurados para el flujo /api/ai/chat (Vercel Functions → consola del proyecto).
 * No incluye texto completo del usuario ni JWT; sí correlación por reqId.
 */

const TAG = '[nutrikal:chat]';

export function redactUserId(userId: string): string {
  if (userId.length <= 12) return '…';
  return `${userId.slice(0, 8)}…${userId.slice(-4)}`;
}

export function chatApiLog(
  reqId: string,
  phase: string,
  data?: Record<string, string | number | boolean | null | undefined>,
): void {
  const payload = { reqId, phase, ...data, ts: new Date().toISOString() };
  console.log(TAG, JSON.stringify(payload));
}

export function chatApiLogError(reqId: string, phase: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(TAG, JSON.stringify({ reqId, phase, error: msg, ts: new Date().toISOString() }));
}
