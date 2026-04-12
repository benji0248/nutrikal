import type {
  AiChatContext,
  AiChatResponse,
  AiAction,
  DayPlan,
  Ingredient,
  UserProfile,
  PlanPreferences,
} from '../types';
import { MEAL_TYPE_ORDER } from '../types';
import { addDays, startOfWeek, format, differenceInYears, parseISO } from 'date-fns';
import { chatClientLog } from '../utils/chatFlowLog';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const JWT_KEY = 'nutrikal-jwt';

/** Must match trimming in `buildContext` and `useChatEngine` conversation ref. */
export const AI_CONVERSATION_HISTORY_LIMIT = 10;

const DEFAULT_PLAN_PREFERENCES: PlanPreferences = {
  variety: 'normal',
  cookingTime: 'normal',
  budget: 'normal',
};

function getToken(): string | null {
  return localStorage.getItem(JWT_KEY);
}

async function readResponseBodyJson(res: Response): Promise<unknown> {
  const raw = await res.text();
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return {};
  }
}

function normalizeSuccessBody(data: unknown): AiChatResponse {
  if (!data || typeof data !== 'object') {
    return { text: '', actions: [], quickReplies: [], remaining: 80 };
  }
  const d = data as Record<string, unknown>;
  const text = typeof d.text === 'string' ? d.text : String(d.text ?? '');
  const actions = Array.isArray(d.actions) ? (d.actions as AiAction[]) : [];
  const quickReplies = Array.isArray(d.quickReplies)
    ? d.quickReplies.filter((x): x is string => typeof x === 'string')
    : [];
  const remaining = typeof d.remaining === 'number' ? d.remaining : 80;
  return { text, actions, quickReplies, remaining };
}

/**
 * Compress today's plan into a readable summary for the AI.
 */
function compressTodayPlan(
  plan: DayPlan | undefined,
): unknown | null {
  if (!plan) return null;

  const result: Record<string, Array<{ name: string }>> = {};
  for (const mt of MEAL_TYPE_ORDER) {
    const meals = plan.meals[mt];
    if (meals.length > 0) {
      result[mt] = meals.map((m) => ({ name: m.name }));
    }
  }

  if (Object.keys(result).length === 0) return null;
  return { date: plan.date, meals: result };
}

/**
 * Build a week summary for the AI.
 */
function buildWeekSummary(
  dayPlans: Record<string, DayPlan>,
  weekDates: string[],
): string | null {
  const lines: string[] = [];
  for (const date of weekDates) {
    const plan = dayPlans[date];
    if (!plan) continue;
    const mealNames: string[] = [];
    for (const mt of MEAL_TYPE_ORDER) {
      for (const meal of plan.meals[mt]) {
        mealNames.push(`${mt}: ${meal.name}`);
      }
    }
    if (mealNames.length > 0) {
      lines.push(`${date}: ${mealNames.join(', ')}`);
    }
  }
  return lines.length > 0 ? lines.join('\n') : null;
}

/**
 * Get the next 7 days starting from next Monday (for week planning).
 */
export function getNextWeekDates(): string[] {
  const today = new Date();
  const nextMonday = startOfWeek(addDays(today, 7), { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) =>
    format(addDays(nextMonday, i), 'yyyy-MM-dd'),
  );
}

/**
 * Get the current week dates starting from Monday.
 */
export function getCurrentWeekDates(): string[] {
  const today = new Date();
  const monday = startOfWeek(today, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) =>
    format(addDays(monday, i), 'yyyy-MM-dd'),
  );
}

export interface BuildContextParams {
  profile: UserProfile;
  dailyBudget: number;
  dayPlans: Record<string, DayPlan>;
  allIngredients: Ingredient[];
  conversationHistory: Array<{ role: 'user' | 'assistant'; text: string }>;
  preferences?: PlanPreferences | null;
  weekDates?: string[] | null;
  favorites?: string[];
}

/**
 * Build the context object for the AI endpoint.
 */
export function buildContext(params: BuildContextParams): AiChatContext {
  const {
    profile,
    dailyBudget,
    dayPlans,
    allIngredients,
    conversationHistory,
    preferences,
    weekDates,
    favorites,
  } = params;

  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const currentWeekDates = getCurrentWeekDates();
  const weekPlanActive = Boolean(weekDates && weekDates.length > 0);

  // Compute age from birthDate
  const age = profile.birthDate
    ? differenceInYears(new Date(), parseISO(profile.birthDate))
    : undefined;

  // Resolve disliked ingredient IDs to human-readable names
  const dislikedNames = profile.dislikedIngredientIds
    .map((id) => allIngredients.find((i) => i.id === id)?.name)
    .filter((name): name is string => !!name);

  // Resolve allowed exception IDs to names
  const allowedExceptionNames = (profile.allowedExceptions ?? [])
    .map((id) => allIngredients.find((i) => i.id === id)?.name)
    .filter((name): name is string => !!name);

  // Compute dish frequency from all dayPlans
  const favSet = new Set(favorites ?? []);
  const freqMap = new Map<string, { count: number; lastDate: string }>();
  for (const [date, plan] of Object.entries(dayPlans)) {
    for (const mt of MEAL_TYPE_ORDER) {
      for (const meal of plan.meals[mt]) {
        const existing = freqMap.get(meal.name);
        if (!existing) {
          freqMap.set(meal.name, { count: 1, lastDate: date });
        } else {
          existing.count += 1;
          if (date > existing.lastDate) existing.lastDate = date;
        }
      }
    }
  }

  let dishHistory: AiChatContext['dishHistory'] = null;
  if (freqMap.size > 0) {
    dishHistory = Array.from(freqMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        lastDate: data.lastDate,
        isFavorite: favSet.has(name),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);
  }

  return {
    profile: {
      name: profile.name,
      goal: profile.goal,
      restrictions: profile.restrictions as string[],
      dislikedIds: profile.dislikedIngredientIds,
      dislikedNames,
      dislikedCategories: profile.dislikedCategories ?? [],
      allowedExceptionNames,
      dailyBudget,
      nationality: profile.nationality,
      sex: profile.sex,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      age,
    },
    todayPlan: compressTodayPlan(dayPlans[todayDate]),
    weekSummary: buildWeekSummary(dayPlans, weekDates || currentWeekDates),
    conversationHistory: conversationHistory.slice(-AI_CONVERSATION_HISTORY_LIMIT),
    todayDate,
    weekDates: weekDates || null,
    preferences: (() => {
      const merged = preferences
        ? { ...DEFAULT_PLAN_PREFERENCES, ...preferences }
        : null;
      if (weekPlanActive) {
        return merged ?? DEFAULT_PLAN_PREFERENCES;
      }
      if (merged?.weekRepetitionMode) {
        return merged;
      }
      return null;
    })(),
    dishHistory,
  };
}

/** Catálogos para Gemini: lista completa + pool semanal (ancla). */
export interface SendMessageCatalogOptions {
  /** Todos los IDs válidos según perfil (completar platos). */
  catalog: string;
  /** Subconjunto semanal rotado (variedad / núcleo de la semana). */
  catalogAnchor: string;
}

/**
 * Send a message to the AI chat endpoint.
 */
export async function sendMessage(
  message: string,
  context: AiChatContext,
  catalogs: SendMessageCatalogOptions,
): Promise<AiChatResponse> {
  const token = getToken();
  if (!token) {
    chatClientLog('sendMessage_abort', { reason: 'no_token' });
    throw new Error('Not authenticated');
  }

  const t0 = performance.now();
  chatClientLog('sendMessage_fetch_start', {
    messageLen: message.length,
    historyLen: context.conversationHistory.length,
    weekDatesLen: context.weekDates?.length ?? 0,
    catalogLen: catalogs.catalog.length,
    catalogAnchorLen: catalogs.catalogAnchor.length,
  });

  const res = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message,
      context,
      catalog: catalogs.catalog,
      catalogAnchor: catalogs.catalogAnchor,
    }),
  });

  const body = await readResponseBodyJson(res);
  const fetchMs = Math.round(performance.now() - t0);

  if (!res.ok) {
    chatClientLog('sendMessage_http_error', {
      status: res.status,
      fetchMs,
      bodyKeys: body && typeof body === 'object' ? Object.keys(body as object).join(',') : '',
    });
    const d = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    const messageFromServer =
      typeof d.text === 'string' && d.text.trim()
        ? d.text
        : typeof d.error === 'string'
          ? d.error
          : 'Error inesperado';

    if (res.status === 429) {
      chatClientLog('sendMessage_rate_limited', { fetchMs });
      return {
        text:
          typeof d.text === 'string' && d.text.trim()
            ? d.text
            : '¡Uy! Ya usaste todos tus mensajes de hoy. Volvé mañana.',
        actions: [],
        quickReplies: [],
        remaining: 0,
      };
    }

    throw new Error(messageFromServer);
  }

  const normalized = normalizeSuccessBody(body);
  chatClientLog('sendMessage_ok', {
    fetchMs,
    textLen: normalized.text.length,
    actionCount: normalized.actions.length,
    actionTypes: normalized.actions.map((a) => a.type).join(','),
    quickReplyCount: normalized.quickReplies.length,
    remaining: normalized.remaining,
  });
  return normalized;
}
