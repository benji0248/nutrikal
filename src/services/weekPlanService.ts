import { format, getISOWeek, getISOWeekYear } from 'date-fns';
import type {
  AiDishResponse,
  AiMeal,
  DayPlan,
  IngredientSignalEntry,
  MealType,
  PlannedDay,
  UserProfile,
  WeekPlan,
  WeekPlanningProfile,
  WeekPlanSkeleton,
  WeekPlanSkeletonSlot,
  WeeklyIngredientPool,
} from '../types';
import { MEAL_TYPE_ORDER } from '../types';
import {
  hydrateAiDish,
  normalizeHydratedAiDishToBudget,
  hydratedDishToAiMeal,
} from './dishMatchService';
import { computeMetabolism } from './metabolicService';
import {
  buildWeeklyIngredientPool,
  buildPoolPersonalizationSeed,
  formatWeeklyPoolForPrompt,
} from './ingredientSelectionService';
import { getActiveMealSlots, getMealSlotBudgetForPattern } from './portionEngine';
import { getWeekDayKeys, todayKey } from '../utils/dateHelpers';
import {
  formatWeekdayRulesForPrompt,
  getDayDisplayLabel,
  getFlexModeForDate,
  normalizeWeekPlanningProfile,
} from '../utils/flexDayHelpers';
import { INGREDIENTS_DB } from '../data/ingredients';
import { mergeAvoidDishNames } from './planRotationMemory';
import type { Ingredient } from '../types';

function buildDishFrequencyMap(
  dayPlans: Record<string, DayPlan>,
): Map<string, { count: number; lastDate: string }> {
  const map = new Map<string, { count: number; lastDate: string }>();
  for (const [date, plan] of Object.entries(dayPlans)) {
    for (const mt of MEAL_TYPE_ORDER) {
      for (const m of plan.meals[mt]) {
        const prev = map.get(m.name);
        map.set(m.name, {
          count: (prev?.count ?? 0) + 1,
          lastDate: date,
        });
      }
    }
  }
  return map;
}

function resolveSlotMeal(
  slot: WeekPlanSkeletonSlot,
  dayIndex: number,
  _skeleton: WeekPlanSkeleton,
  templateMeals: Map<string, AiMeal>,
  builtDays: PlannedDay[],
): AiMeal | null {
  if (slot.link === 'prev.cena' && dayIndex > 0) {
    const prev = builtDays[dayIndex - 1]?.meals.cena;
    if (prev) return { ...prev };
  }
  if (slot.link && typeof slot.link === 'object' && slot.link.sameAsTemplateId) {
    const ref = templateMeals.get(slot.link.sameAsTemplateId);
    if (ref) return { ...ref };
  }
  const fromTemplate = templateMeals.get(slot.templateId);
  if (fromTemplate) return { ...fromTemplate };
  return null;
}

export function buildForbiddenDishNames(
  dayPlans: Record<string, DayPlan>,
  weeksBack = 3,
): string[] {
  const names = new Set<string>();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weeksBack * 7);
  const cutoffKey = format(cutoff, 'yyyy-MM-dd');

  for (const [date, plan] of Object.entries(dayPlans)) {
    if (date < cutoffKey) continue;
    for (const mt of MEAL_TYPE_ORDER) {
      for (const m of plan.meals[mt]) {
        if (m.name?.trim()) names.add(m.name.trim());
      }
    }
  }
  return [...names];
}

export function buildWeekPlanningContext(
  profile: UserProfile,
  dayPlans: Record<string, DayPlan>,
  customIngredients: Ingredient[],
  startDate = todayKey(),
  extraAvoidDishNames: string[] = [],
  poolGeneration = 0,
  tasteInput?: {
    signals: IngredientSignalEntry[];
    recentPoolHistory: string[][];
  },
): {
  weekDates: string[];
  weeklyPoolPrompt: string;
  forbiddenDishNames: string[];
  weekId: string;
  pool: WeeklyIngredientPool;
} {
  const weekDates = getWeekDayKeys(startDate);
  const weekId = getIsoWeekId(startDate);
  const freq = buildDishFrequencyMap(dayPlans);
  const seed = buildPoolPersonalizationSeed(freq, profile.name);
  const allIngredients = [...INGREDIENTS_DB, ...customIngredients];
  const tasteContext = tasteInput
    ? {
        signals: tasteInput.signals,
        recentPoolHistory: tasteInput.recentPoolHistory,
        dayPlans,
      }
    : undefined;
  const pool = buildWeeklyIngredientPool(allIngredients, profile, {
    weekId,
    personalizationSeed: seed,
    poolGeneration,
    tasteContext,
  });
  const weeklyPoolPrompt = formatWeeklyPoolForPrompt(pool, allIngredients, !!tasteContext);
  const forbiddenDishNames = mergeAvoidDishNames(
    buildForbiddenDishNames(dayPlans),
    extraAvoidDishNames,
  );
  return { weekDates, weeklyPoolPrompt, forbiddenDishNames, weekId, pool };
}

function parseDate(s: string): Date {
  return new Date(`${s}T12:00:00`);
}

export function getIsoWeekId(dateStr: string): string {
  const d = parseDate(dateStr);
  return `${getISOWeekYear(d)}-W${String(getISOWeek(d)).padStart(2, '0')}`;
}

export function applyWeekdayRulesToSkeleton(
  skeleton: WeekPlanSkeleton,
  weekPlanning: WeekPlanningProfile,
): WeekPlanSkeleton {
  const rules = normalizeWeekPlanningProfile(weekPlanning).weekdayFlexRules;
  return {
    days: skeleton.days.map((day) => {
      const mode = getFlexModeForDate(day.date, rules);
      if (mode === 'full_free') {
        return { date: day.date, dayMode: 'full_free', slots: [] };
      }
      return {
        ...day,
        dayMode: mode === 'maintenance' ? 'maintenance' : day.dayMode ?? 'normal',
        slots: day.slots,
      };
    }),
  };
}

export function expandSkeletonToWeekPlan(params: {
  skeleton: WeekPlanSkeleton;
  rawDishes: Record<string, AiDishResponse>;
  weekPlanning: WeekPlanningProfile;
  profile: UserProfile;
  useGrams?: boolean;
}): WeekPlan {
  const wp = normalizeWeekPlanningProfile(params.weekPlanning);
  const rules = wp.weekdayFlexRules;
  const meta = computeMetabolism(params.profile);
  const templateMeals = new Map<string, AiMeal>();

  const skeleton = applyWeekdayRulesToSkeleton(params.skeleton, wp);

  for (const [templateId, raw] of Object.entries(params.rawDishes)) {
    let hydrated = hydrateAiDish(raw, { useGrams: params.useGrams });
    const slot = skeleton.days
      .flatMap((d) => d.slots)
      .find((s) => s.templateId === templateId);
    const mt = (slot?.mealType ?? 'almuerzo') as MealType;
    const dayDate = skeleton.days.find((d) => d.slots.some((s) => s.templateId === templateId))?.date;
    const dayMode = dayDate ? getFlexModeForDate(dayDate, rules) : 'normal';
    const dailyBudget = dayMode === 'maintenance' ? meta.tdee : meta.budget;
    const budget = getMealSlotBudgetForPattern(
      dailyBudget,
      mt,
      wp.mealPattern,
    );
    const targetBudget =
      slot?.isFlexMeal || dayMode === 'maintenance'
        ? Math.round(budget * (slot?.isFlexMeal ? 1.1 : 1))
        : budget;
    if (targetBudget > 0 && dayMode !== 'full_free') {
      hydrated = normalizeHydratedAiDishToBudget(hydrated, targetBudget, { useGrams: params.useGrams });
    }
    templateMeals.set(templateId, hydratedDishToAiMeal(hydrated));
  }

  const activeSlots = getActiveMealSlots(wp.mealPattern);
  const builtDays: PlannedDay[] = [];

  for (let di = 0; di < skeleton.days.length; di++) {
    const day = skeleton.days[di];
    const mode = getFlexModeForDate(day.date, rules);
    const dayLabel = getDayDisplayLabel(day.date, rules);

    if (mode === 'full_free') {
      builtDays.push({
        date: day.date,
        meals: {},
        dayMode: 'full_free',
        dayLabel: dayLabel ?? 'Día libre',
      });
      continue;
    }

    const meals: PlannedDay['meals'] = {};

    for (const slot of day.slots) {
      if (!activeSlots.includes(slot.mealType as MealType)) continue;
      const meal = resolveSlotMeal(slot, di, skeleton, templateMeals, builtDays);
      if (meal) {
        meals[slot.mealType as MealType] = meal;
      }
    }

    builtDays.push({
      date: day.date,
      meals,
      dayMode: mode === 'maintenance' ? 'maintenance' : 'normal',
      dayLabel,
    });
  }

  return { days: builtDays, applied: false };
}

export function validateWeekPlan(
  plan: WeekPlan,
  weekPlanning: WeekPlanningProfile,
): { ok: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const names = new Map<string, number>();

  for (let i = 0; i < plan.days.length; i++) {
    const day = plan.days[i];
    for (const mt of MEAL_TYPE_ORDER) {
      const meal = day.meals[mt];
      if (!meal) continue;
      names.set(meal.name, (names.get(meal.name) ?? 0) + 1);
    }

    if (weekPlanning.mealRhythmMode === 'carryover_dinner_to_lunch' && i > 0) {
      const prevCena = plan.days[i - 1].meals.cena;
      const lunch = day.meals.almuerzo;
      if (prevCena && lunch && prevCena.name !== lunch.name) {
        warnings.push(`Carryover: ${day.date} almuerzo no coincide con cena anterior`);
      }
    }
  }

  if (weekPlanning.mealRhythmMode === 'max_variety') {
    for (const [name, count] of names) {
      if (count > 1) warnings.push(`Variedad: "${name}" repetido ${count} veces`);
    }
  }

  return { ok: warnings.length === 0, warnings };
}

export function buildFullWeekPlanFromApiResponse(params: {
  skeleton: WeekPlanSkeleton;
  rawDishes: Record<string, AiDishResponse>;
  weekPlanning: WeekPlanningProfile;
  profile: UserProfile;
  useGrams?: boolean;
}): WeekPlan {
  const wp = normalizeWeekPlanningProfile(params.weekPlanning);
  const plan = expandSkeletonToWeekPlan({ ...params, weekPlanning: wp });
  validateWeekPlan(plan, wp);
  return plan;
}

export function weekPlanningForApi(
  weekPlanning: WeekPlanningProfile,
): WeekPlanningProfile & { weekdayRulesPrompt: string } {
  const wp = normalizeWeekPlanningProfile(weekPlanning);
  return {
    ...wp,
    weekdayRulesPrompt: formatWeekdayRulesForPrompt(wp.weekdayFlexRules),
  };
}

/** Presupuesto kcal de un slot según día del plan (mantenimiento / flex). */
export function getMealBudgetForPlanDay(
  date: string,
  mealType: MealType,
  profile: UserProfile,
  weekPlanning: WeekPlanningProfile,
): number | undefined {
  const wp = normalizeWeekPlanningProfile(weekPlanning);
  const dayMode = getFlexModeForDate(date, wp.weekdayFlexRules);
  if (dayMode === 'full_free') return undefined;
  const meta = computeMetabolism(profile);
  const dailyBudget = dayMode === 'maintenance' ? meta.tdee : meta.budget;
  return getMealSlotBudgetForPattern(dailyBudget, mealType, wp.mealPattern);
}
