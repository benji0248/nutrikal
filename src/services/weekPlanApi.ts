import type {
  WeekPlanGenerateResponse,
  WeekPlanningProfile,
} from '../types';

const JWT_KEY = 'nutrikal-jwt';

function getToken(): string | null {
  return localStorage.getItem(JWT_KEY);
}

export async function generateWeekPlan(params: {
  weekDates: string[];
  weekPlanning: WeekPlanningProfile & { weekdayRulesPrompt?: string };
  weeklyPoolPrompt: string;
  forbiddenDishNames: string[];
  variationSeed?: string;
}): Promise<WeekPlanGenerateResponse> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180_000);

  let res: Response;
  try {
    res = await fetch('/api/ai/week-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
  } catch (fetchErr) {
    clearTimeout(timeoutId);
    if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
      throw new Error('Armar la semana tardó demasiado. Intentá de nuevo.');
    }
    throw fetchErr;
  }
  clearTimeout(timeoutId);

  const body = await res.json() as Record<string, unknown>;

  if (!res.ok) {
    if (res.status === 429) {
      return {
        skeleton: { days: [] },
        rawDishes: {},
        text: typeof body.text === 'string' ? body.text : 'Límite diario alcanzado.',
        remaining: 0,
      };
    }
    if (res.status === 503 && typeof body.text === 'string') {
      throw new Error(body.text);
    }
    const msg =
      typeof body.text === 'string'
        ? body.text
        : typeof body.error === 'string'
          ? body.error
          : 'Error al generar semana';
    throw new Error(msg);
  }

  return {
    skeleton: body.skeleton as WeekPlanGenerateResponse['skeleton'],
    rawDishes: body.rawDishes as WeekPlanGenerateResponse['rawDishes'],
    text: typeof body.text === 'string' ? body.text : undefined,
    remaining: typeof body.remaining === 'number' ? body.remaining : 80,
  };
}
