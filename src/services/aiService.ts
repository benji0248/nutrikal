import type {
  AiChatContext,
  AiChatResponse,
  AiAction,
  Dish,
  Ingredient,
  DayPlan,
  UserProfile,
  PlanPreferences,
} from '../types';
import { MEAL_TYPE_ORDER } from '../types';
import { computeDishMacros } from './dishMatchService';
import { addDays, startOfWeek, format } from 'date-fns';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const JWT_KEY = 'nutrikal-jwt';

function getToken(): string | null {
  return localStorage.getItem(JWT_KEY);
}

/**
 * Compress dish catalog into a compact token-efficient string.
 * Format: id:name|category|tags|kcalApprox
 */
export function compressCatalog(
  dishes: Dish[],
  allIngredients: Ingredient[],
): string {
  return dishes
    .map((d) => {
      const macros = computeDishMacros(d, allIngredients);
      const kcal = Math.round(macros.calories);
      return `${d.id}:${d.name}|${d.category}|${d.tags.join(',')}|${kcal}`;
    })
    .join('\n');
}

/**
 * Compress today's plan into a readable summary for the AI.
 */
function compressTodayPlan(
  plan: DayPlan | undefined,
): unknown | null {
  if (!plan) return null;

  const result: Record<string, Array<{ name: string; dishId?: string }>> = {};
  for (const mt of MEAL_TYPE_ORDER) {
    const meals = plan.meals[mt];
    if (meals.length > 0) {
      result[mt] = meals.map((m) => ({
        name: m.name,
        dishId: m.linkedRecipeId || undefined,
      }));
    }
  }

  if (Object.keys(result).length === 0) return null;
  return { date: plan.date, meals: result, water: plan.water, waterGoal: plan.waterGoal };
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
 * Determine what context to include based on the message content.
 */
function detectIntent(message: string): {
  needsCatalog: boolean;
  needsTodayPlan: boolean;
  needsWeekSummary: boolean;
} {
  const lower = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const weekWords = ['semana', 'plan', 'planifica', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo', 'semanal'];
  const todayWords = ['hoy', 'ahora', 'almuerzo', 'cena', 'desayuno', 'snack', 'como', 'comer', 'cocinar'];
  const emotionalWords = ['ansiedad', 'antojo', 'hambre', 'ansiosa', 'ansioso', 'dulce', 'necesito'];

  const needsWeek = weekWords.some((w) => lower.includes(w));
  const needsToday = todayWords.some((w) => lower.includes(w)) || emotionalWords.some((w) => lower.includes(w));

  return {
    needsCatalog: needsWeek || needsToday,
    needsTodayPlan: needsToday || emotionalWords.some((w) => lower.includes(w)),
    needsWeekSummary: needsWeek,
  };
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
  message: string;
  profile: UserProfile;
  dailyBudget: number;
  allDishes: Dish[];
  allIngredients: Ingredient[];
  dayPlans: Record<string, DayPlan>;
  conversationHistory: Array<{ role: 'user' | 'assistant'; text: string }>;
  preferences?: PlanPreferences | null;
  weekDates?: string[] | null;
}

/**
 * Build the context object for the AI endpoint.
 */
export function buildContext(params: BuildContextParams): AiChatContext {
  const {
    message,
    profile,
    dailyBudget,
    allDishes,
    allIngredients,
    dayPlans,
    conversationHistory,
    preferences,
    weekDates,
  } = params;

  const intent = detectIntent(message);
  const todayDate = format(new Date(), 'yyyy-MM-dd');

  // Build profile
  const profileCtx = {
    name: profile.name,
    goal: profile.goal,
    restrictions: profile.restrictions as string[],
    dislikedIds: profile.dislikedIngredientIds,
    dailyBudget,
  };

  // Build catalog (only when needed)
  const catalog = intent.needsCatalog
    ? compressCatalog(allDishes, allIngredients)
    : '';

  // Today plan
  const todayPlan = intent.needsTodayPlan
    ? compressTodayPlan(dayPlans[todayDate])
    : null;

  // Week summary
  const currentWeekDates = getCurrentWeekDates();
  const weekSummary = intent.needsWeekSummary
    ? buildWeekSummary(dayPlans, weekDates || currentWeekDates)
    : null;

  return {
    profile: profileCtx,
    catalog,
    todayPlan,
    weekSummary,
    conversationHistory: conversationHistory.slice(-10),
    todayDate,
    weekDates: weekDates || null,
    preferences: preferences || null,
  };
}

/**
 * Send a message to the AI chat endpoint.
 */
export async function sendMessage(
  message: string,
  context: AiChatContext,
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
    body: JSON.stringify({ message, context }),
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
