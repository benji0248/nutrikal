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

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const JWT_KEY = 'nutrikal-jwt';

function getToken(): string | null {
  return localStorage.getItem(JWT_KEY);
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
    conversationHistory: conversationHistory.slice(-10),
    todayDate,
    weekDates: weekDates || null,
    preferences: preferences || null,
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
    throw new Error('Not authenticated');
  }

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

  if (!res.ok) {
    const data = await res.json();
    if (res.status === 429) {
      return {
        text: data.text || '¡Uy! Ya usaste todos tus mensajes de hoy. Volvé mañana.',
        actions: [],
        quickReplies: [],
        remaining: 0,
      };
    }
    throw new Error(data.text || data.error || 'Error inesperado');
  }

  const data = await res.json();

  return {
    text: data.text,
    actions: (data.actions || []) as AiAction[],
    quickReplies: (data.quickReplies || []) as string[],
    remaining: data.remaining ?? 80,
  };
}
