/**
 * Logs del flujo de chat en el navegador. Activos si:
 * - `npm run dev`, o
 * - `VITE_CHAT_FLOW_LOG=1` en build, o
 * - `localStorage.setItem('nutrikal-debug-chat', '1')` (útil en preview / prod para QA).
 */

const TAG = '[NutriKal·chat]';

function chatLogEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  if (import.meta.env.VITE_CHAT_FLOW_LOG === '1') return true;
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('nutrikal-debug-chat') === '1';
  } catch {
    return false;
  }
}

export function chatClientLog(phase: string, data?: Record<string, unknown>): void {
  if (!chatLogEnabled()) return;
  const line = { phase, ts: new Date().toISOString(), ...data };
  console.log(TAG, line);
}

export function chatClientLogError(phase: string, err: unknown, data?: Record<string, unknown>): void {
  if (!chatLogEnabled()) return;
  const msg = err instanceof Error ? err.message : String(err);
  console.error(TAG, { phase, err: msg, ...data, ts: new Date().toISOString() });
}
