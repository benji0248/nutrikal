/** Errores transitorios de la API de Gemini (demanda, rate limit del proveedor). */
export function isGeminiTransientError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('429') ||
    msg.includes('high demand') ||
    msg.includes('service unavailable') ||
    msg.includes('resource exhausted') ||
    msg.includes('overloaded') ||
    msg.includes('too many requests') ||
    msg.includes('deadline exceeded')
  );
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reintenta llamadas a Gemini ante picos de tráfico del proveedor.
 * No consume el rate limit diario de NutriKal (solo reintenta la misma operación).
 */
export async function withGeminiRetry<T>(
  fn: () => Promise<T>,
  label: string,
  opts?: { maxAttempts?: number; baseDelayMs?: number },
): Promise<T> {
  const maxAttempts = opts?.maxAttempts ?? 4;
  const baseDelayMs = opts?.baseDelayMs ?? 1500;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isGeminiTransientError(err) || attempt === maxAttempts) {
        throw err;
      }
      const jitter = Math.random() * 400;
      const delay = baseDelayMs * 2 ** (attempt - 1) + jitter;
      console.warn(
        `[gemini:retry] ${label} attempt=${attempt}/${maxAttempts} delayMs=${Math.round(delay)}`,
      );
      await sleep(delay);
    }
  }

  throw lastErr;
}
