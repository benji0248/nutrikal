/**
 * Logs del flujo de chat en el navegador.
 * Por defecto **activos** (consola). Silenciar: `localStorage.setItem('nutrikal-debug-chat', '0')`.
 * Forzar también con `VITE_CHAT_FLOW_LOG=1` en build (no hace falta en dev).
 */

const TAG = '[NutriKal·chat]';

function chatLogEnabled(): boolean {
  if (import.meta.env.VITE_CHAT_FLOW_LOG === '1') return true;
  try {
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem('nutrikal-debug-chat');
      if (v === '0') return false;
    }
  } catch {
    /* ignore */
  }
  return true;
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
