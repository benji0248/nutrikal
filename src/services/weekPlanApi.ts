import type {
  WeekPlanGenerateResponse,
  WeekPlanningProfile,
} from '../types';

const JWT_KEY = 'nutrikal-jwt';

interface GenerationDebugSummary {
  requestId: string;
  operation: string;
  stages: Array<{ name: string; durationMs: number; success: boolean }>;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCostUsd: string | null;
  totalDurationMs: number;
}

interface DishMemoryPayload {
  explicitAvoids: string[];
  recentConsumedDishes: string[];
  rotationHints: string[];
}

const DEBUG_STAGE_LABELS: Record<string, string> = {
  rate_limit: 'Rate Limit',
  read_profile: 'Load User',
  read_history: 'Load Memory',
  read_embeddings: 'Load Embeddings',
  build_context: 'Build Context',
  build_prompt: 'Build Prompt',
  provider_call: 'AI Provider',
  parse_response: 'Parse JSON',
  schema_validation: 'Validate',
  nutrition_validation: 'Nutrition',
  hydrate_dishes: 'Hydrate Dishes',
  persist_plan: 'Save Plan',
  record_usage: 'Record Usage',
};

function logGenerationSummary(summary: GenerationDebugSummary): void {
  const divider = '═'.repeat(43);
  const dotted = (label: string, value: string) =>
    `${label} ${'.'.repeat(Math.max(2, 31 - label.length - value.length))} ${value}`;
  const lines = [
    divider,
    `Request: ${summary.requestId}`,
    summary.operation === 'week_plan' ? 'Generate Plan' : summary.operation,
    ...summary.stages.map((stage) => dotted(
      DEBUG_STAGE_LABELS[stage.name] ?? stage.name,
      `${Math.round(stage.durationMs)} ms${stage.success ? '' : ' ✕'}`,
    )),
    dotted('Input Tokens', String(summary.inputTokens)),
    dotted('Output Tokens', String(summary.outputTokens)),
    dotted('Cost', summary.totalCostUsd ? `$${Number(summary.totalCostUsd).toFixed(6)}` : 'n/a'),
    dotted('TOTAL', `${Math.round(summary.totalDurationMs)} ms`),
    divider,
  ];
  console.info(lines.join('\n'));
}

function getToken(): string | null {
  return localStorage.getItem(JWT_KEY);
}

export async function generateWeekPlan(params: {
  weekDates: string[];
  weekPlanning: WeekPlanningProfile & { weekdayRulesPrompt?: string };
  weeklyPoolPrompt: string;
  forbiddenDishNames: string[];
  dishMemory?: DishMemoryPayload;
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

  if (body.observability && typeof body.observability === 'object') {
    logGenerationSummary(body.observability as unknown as GenerationDebugSummary);
  }

  return {
    skeleton: body.skeleton as WeekPlanGenerateResponse['skeleton'],
    rawDishes: body.rawDishes as WeekPlanGenerateResponse['rawDishes'],
    text: typeof body.text === 'string' ? body.text : undefined,
    remaining: typeof body.remaining === 'number' ? body.remaining : 80,
  };
}
