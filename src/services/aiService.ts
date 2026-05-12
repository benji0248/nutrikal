import type { AiModel } from '../store/useSettingsStore';
import type { AiDishResponse } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const JWT_KEY = 'nutrikal-jwt';

function getToken(): string | null {
  return localStorage.getItem(JWT_KEY);
}

export interface SendMessageResult {
  text: string;
  remaining: number;
  dish?: AiDishResponse;
}

export async function sendMessage(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  model: AiModel = 'deepseek',
): Promise<SendMessageResult> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const endpoint = model === 'gemini' ? '/api/ai/gemini' : '/api/ai/chat';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message, history }),
      signal: controller.signal,
    });
  } catch (fetchErr) {
    clearTimeout(timeoutId);
    if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
      throw new Error('El asistente tardó demasiado. Intentá de nuevo en un momento.');
    }
    throw fetchErr;
  }
  clearTimeout(timeoutId);

  const body = await res.json() as Record<string, unknown>;

  if (!res.ok) {
    if (res.status === 429) {
      return {
        text: typeof body.text === 'string' ? body.text : '¡Uy! Ya usaste todos tus mensajes de hoy. Volvé mañana.',
        remaining: 0,
      };
    }
    const msg = typeof body.text === 'string' ? body.text
      : typeof body.error === 'string' ? body.error
      : 'Error inesperado';
    throw new Error(msg);
  }

  return {
    text: String(body.text ?? ''),
    remaining: typeof body.remaining === 'number' ? body.remaining : 80,
    dish: body.dish as AiDishResponse | undefined,
  };
}
