import type {
  AiChatContext,
  AiChatResponse,
  AiAction,
  DayPlan,
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
  conversationHistory: Array<{ role: 'user' | 'assistant'; text: string }>;
  preferences?: PlanPreferences | null;
  weekDates?: string[] | null;
}

/**
 * Build the context object for the AI endpoint.
 */
export function buildContext(params: BuildContextParams): AiChatContext {
  const {
    profile,
    dailyBudget,
    dayPlans,
    conversationHistory,
    preferences,
    weekDates,
  } = params;

  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const currentWeekDates = getCurrentWeekDates();

  // Compute age from birthDate
  const age = profile.birthDate
    ? differenceInYears(new Date(), parseISO(profile.birthDate))
    : undefined;

  return {
    profile: {
      name: profile.name,
      goal: profile.goal,
      restrictions: profile.restrictions as string[],
      dislikedIds: profile.dislikedIngredientIds,
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

  console.group('🤖 AI Request');
  console.log('Message:', message);
  console.log('Context:', context);
  console.groupEnd();

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
  console.group('🤖 AI Response');
  console.log('Raw:', data);
  console.groupEnd();

  return {
    text: data.text,
    actions: (data.actions || []) as AiAction[],
    quickReplies: (data.quickReplies || []) as string[],
    remaining: data.remaining ?? 80,
  };
}
