import type {
  Dish,
  DayPlan,
  MealType,
  Meal,
  Ingredient,
  Macros,
  AiDishResponse,
  HydratedAiDish,
  HydratedAiIngredient,
  AiIngredient,
  AiMeal,
} from '../types';
import { INGREDIENTS_DB } from '../data/ingredients';
import { computeTotalMacros } from '../utils/macroHelpers';
import { gramsToHumanPortion } from '../utils/portionHelpers';
import { generateId } from '../utils/dateHelpers';
import { chatClientLog } from '../utils/chatFlowLog';

/** Gemini a veces usa nombres distintos a la DB local. */
const INGREDIENT_ALIASES: Record<string, string> = {
  zucchini: 'Zapallito',
  courgette: 'Zapallito',
  'calabacín': 'Zapallito',
  calabacin: 'Zapallito',
  'pechuga de pollo': 'Pechuga de pollo',
  pollo: 'Pechuga de pollo',
  'pollo pechuga': 'Pechuga de pollo',
  quinoa: 'Quinoa cocida',
  'quinoa cocida': 'Quinoa cocida',
  'aceite oliva': 'Aceite de oliva',
  'aceite de oliva extra virgen': 'Aceite de oliva',
  'perejil fresco': 'Perejil fresco',
  oregano: 'Orégano',
  'ají molido': 'Ají molido',
  'aji molido': 'Ají molido',
  'vino tinto': 'Vino tinto',
  'morron rojo': 'Morrón rojo',
  'morrón rojo': 'Morrón rojo',
  'morron': 'Morrón rojo',
  'papa blanca': 'Papa',
  patata: 'Papa',
  'arroz': 'Arroz blanco cocido',
  'arroz blanco': 'Arroz blanco cocido',
  'fideos': 'Fideos secos',
  pasta: 'Fideos secos',
  'huevos': 'Huevo',
  'clara de huevo': 'Huevo',
  'yogur': 'Yogur natural',
  yogurt: 'Yogur natural',
  'yoghurt': 'Yogur natural',
  'queso crema': 'Queso cremoso',
  'carne molida': 'Carne picada común',
  'carne picada': 'Carne picada común',
  'bife': 'Bife de chorizo',
  ajo: 'Ajo',
  cebolla: 'Cebolla',
  tomate: 'Tomate',
  limon: 'Limón',
  'limón': 'Limón',
};

const GRAM_STEP = 5;
/** ±8% del presupuesto del slot = “dentro de tolerancia”. */
export const CALORIE_TOLERANCE = 0.08;
/** Umbral SP-9: platos de prueba dentro de ±10% del slot. */
export const TRUST_BUDGET_TOLERANCE = 0.1;
const MIN_MATCH_SCORE = 0.55;
const MAX_NORMALIZE_PASSES = 3;

export interface NormalizeBudgetResult {
  dish: HydratedAiDish;
  scaled: boolean;
  beforeKcal: number;
  afterKcal: number;
  budgetKcal: number;
  unmatchedCount: number;
  emptyOrZero: boolean;
  withinTolerance: boolean;
}

/**
 * Compute macros for a dish using ingredient DB.
 */
export function computeDishMacros(dish: Dish, allIngredients: Ingredient[]): Macros {
  return computeTotalMacros(
    dish.ingredients.map((di) => ({ ingredientId: di.ingredientId, grams: di.grams })),
    allIngredients,
  );
}

/**
 * Compute consumed calories for a day from the day plan.
 */
export function computeDayConsumed(
  dayPlan: DayPlan | undefined,
  allIngredients: Ingredient[],
): number {
  if (!dayPlan) return 0;
  let total = 0;
  for (const mealType of Object.keys(dayPlan.meals) as MealType[]) {
    for (const meal of dayPlan.meals[mealType]) {
      if (meal.calories) {
        total += meal.calories;
      } else if (meal.entries && meal.entries.length > 0) {
        const macros = computeTotalMacros(meal.entries, allIngredients);
        total += macros.calories;
      }
    }
  }
  return total;
}

function resolveAlias(name: string): string {
  const lower = name.toLowerCase().trim();
  return INGREDIENT_ALIASES[lower] ?? name;
}

function normalizeToken(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function scoreNameMatch(query: string, candidate: string): number {
  const q = normalizeToken(query);
  const c = normalizeToken(candidate);
  if (!q || !c) return 0;
  if (q === c) return 1;
  if (c.startsWith(q) || q.startsWith(c)) return 0.9;
  if (c.includes(q) || q.includes(c)) {
    const shorter = Math.min(q.length, c.length);
    const longer = Math.max(q.length, c.length);
    // Evitar matches frágiles tipo "sal" ⊂ "salmón"
    if (shorter < 4 && longer > shorter + 2) return 0.2;
    return shorter / longer;
  }
  const qWords = q.split(/\s+/).filter(Boolean);
  const cWords = c.split(/\s+/).filter(Boolean);
  if (qWords.length === 0) return 0;
  let hits = 0;
  for (const w of qWords) {
    if (w.length < 3) continue;
    if (cWords.some((cw) => cw === w || cw.startsWith(w) || w.startsWith(cw))) hits += 1;
  }
  return hits / qWords.length;
}

/**
 * Fuzzy match an ingredient name from Gemini against INGREDIENTS_DB.
 * Exportado para smoke / tests (SP-9).
 */
export function fuzzyMatchIngredient(name: string): Ingredient | undefined {
  const resolved = resolveAlias(name);
  const normalized = resolved.toLowerCase().trim();
  if (!normalized) return undefined;

  const exact = INGREDIENTS_DB.find(
    (ing) => ing.name.toLowerCase() === normalized
      || normalizeToken(ing.name) === normalizeToken(normalized),
  );
  if (exact) return exact;

  let best: Ingredient | undefined;
  let bestScore = 0;
  for (const ing of INGREDIENTS_DB) {
    const score = scoreNameMatch(normalized, ing.name);
    if (score > bestScore) {
      bestScore = score;
      best = ing;
    }
  }

  if (best && bestScore >= MIN_MATCH_SCORE) return best;
  return undefined;
}

/** kcal estimadas cuando el ingrediente no está en la DB (para no subcontar). */
export function estimateUnmatchedKcal(name: string, grams: number): number {
  if (grams <= 0) return 0;
  const n = normalizeToken(name);
  if (n.includes('sal') || n === 'agua' || n.includes('agua ')) return 0;
  if (n.includes('aceite')) return (884 * grams) / 100;
  if (n.includes('manteca') || n.includes('mantequilla')) return (717 * grams) / 100;
  if (
    n.includes('hierba')
    || n.includes('especi')
    || n.includes('oregano')
    || n.includes('perejil')
    || n.includes('albahaca')
    || n.includes('cilantro')
  ) {
    return (40 * grams) / 100;
  }
  if (n.includes('limon') || n.includes('lima')) return (29 * grams) / 100;
  if (
    n.includes('zucchini')
    || n.includes('zapallito')
    || n.includes('morron')
    || n.includes('cebolla')
    || n.includes('tomate')
    || n.includes('lechuga')
    || n.includes('verdura')
    || n.includes('espinaca')
    || n.includes('zanahoria')
    || n.includes('brocoli')
    || n.includes('pepino')
  ) {
    return (25 * grams) / 100;
  }
  if (
    n.includes('pollo')
    || n.includes('carne')
    || n.includes('pescado')
    || n.includes('huevo')
    || n.includes('merluza')
    || n.includes('atun')
    || n.includes('salmon')
    || n.includes('cerdo')
  ) {
    return (150 * grams) / 100;
  }
  if (
    n.includes('quinoa')
    || n.includes('arroz')
    || n.includes('papa')
    || n.includes('fideo')
    || n.includes('choclo')
    || n.includes('avena')
    || n.includes('pan')
  ) {
    return (120 * grams) / 100;
  }
  if (n.includes('queso') || n.includes('yogur') || n.includes('yogurt')) {
    return (200 * grams) / 100;
  }
  // Default conservador (antes 100): evita inventar platos densos
  return (80 * grams) / 100;
}

function kcalForEntry(
  ingredientId: string | null,
  grams: number,
  name: string,
): number {
  if (grams <= 0) return 0;
  if (ingredientId) {
    const ing = INGREDIENTS_DB.find((i) => i.id === ingredientId);
    if (ing) return (ing.calories * grams) / 100;
  }
  return estimateUnmatchedKcal(name, grams);
}

function macrosFromIngredients(
  items: Array<{ ingredientId: string | null; name: string; grams: number }>,
): Macros {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;

  for (const item of items) {
    const kcal = kcalForEntry(item.ingredientId, item.grams, item.name);
    calories += kcal;
    if (item.ingredientId) {
      const ing = INGREDIENTS_DB.find((i) => i.id === item.ingredientId);
      if (ing) {
        const factor = item.grams / 100;
        protein += ing.protein * factor;
        carbs += ing.carbs * factor;
        fat += ing.fat * factor;
      }
    } else {
      protein += 0.15 * kcal / 4;
      carbs += 0.5 * kcal / 4;
      fat += 0.35 * kcal / 9;
    }
  }

  return {
    calories: Math.round(calories),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
  };
}

function buildHumanIngredients(
  entries: Array<{ ingredientId: string | null; name: string; grams: number }>,
  useGrams: boolean,
): HydratedAiIngredient[] {
  return entries.map((e) => {
    const ingredient = e.ingredientId
      ? INGREDIENTS_DB.find((ing) => ing.id === e.ingredientId)
      : undefined;
    return {
      name: e.name,
      grams: e.grams,
      humanPortion: useGrams
        ? `${Math.round(e.grams)}g`
        : gramsToHumanPortion(e.ingredientId ?? '', e.grams, ingredient),
      ingredientId: e.ingredientId,
    };
  });
}

function totalDishKcal(items: HydratedAiIngredient[]): number {
  return items.reduce(
    (sum, h) => sum + kcalForEntry(h.ingredientId, h.grams, h.name),
    0,
  );
}

function scaleIngredientGrams(grams: number, factor: number): number {
  if (!Number.isFinite(grams) || grams <= 0) return GRAM_STEP;
  const scaled = Math.floor((grams * factor) / GRAM_STEP) * GRAM_STEP;
  return Math.max(GRAM_STEP, scaled);
}

function countUnmatched(items: HydratedAiIngredient[]): number {
  return items.filter((h) => !h.ingredientId).length;
}

function isWithinTolerance(kcal: number, budgetKcal: number, tol = CALORIE_TOLERANCE): boolean {
  if (budgetKcal <= 0) return true;
  const ratio = kcal / budgetKcal;
  return ratio >= 1 - tol && ratio <= 1 + tol;
}

/**
 * Hydrate an AiDishResponse from Gemini into a HydratedAiDish
 * with fuzzy-matched ingredients, macros, and human portions.
 */
export function hydrateAiDish(
  dish: AiDishResponse,
  options?: { useGrams?: boolean },
): HydratedAiDish {
  const useGrams = options?.useGrams ?? false;
  const rawList = Array.isArray(dish.ingredientes) ? dish.ingredientes : [];
  const entries = rawList
    .filter((ai) => ai && typeof ai.nombre === 'string' && Number(ai.gramos) > 0)
    .map((ai) => {
      const matched = fuzzyMatchIngredient(ai.nombre);
      return {
        ingredientId: matched?.id ?? null,
        name: matched?.name ?? ai.nombre.trim(),
        grams: Math.max(GRAM_STEP, Math.round(Number(ai.gramos) || 0)),
      };
    });

  const unmatchedNames = entries.filter((e) => !e.ingredientId).map((e) => e.name);
  chatClientLog('hydrate_dish', {
    name: dish.nombre,
    count: entries.length,
    unmatchedCount: unmatchedNames.length,
    unmatched: unmatchedNames.slice(0, 8),
  });

  if (entries.length === 0) {
    return {
      name: dish.nombre?.trim() || 'Plato',
      humanIngredients: [],
      macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      prepMinutes: dish.tiempo_prep ?? 0,
      preparation: dish.preparacion ?? '',
      tip: 'No pude interpretar los ingredientes. Probá regenerar el plato.',
    };
  }

  const humanIngredients = buildHumanIngredients(entries, useGrams);
  const macros = macrosFromIngredients(entries);

  return {
    name: dish.nombre,
    humanIngredients,
    macros,
    prepMinutes: dish.tiempo_prep,
    preparation: dish.preparacion,
    tip: dish.tip,
  };
}

/**
 * Normaliza al presupuesto del slot y expone si hubo escala (SP-9 trust layer).
 */
export function normalizeHydratedAiDishToBudgetDetailed(
  dish: HydratedAiDish,
  budgetKcal: number,
  options?: { useGrams?: boolean },
): NormalizeBudgetResult {
  const useGrams = options?.useGrams ?? false;
  const unmatchedCount = countUnmatched(dish.humanIngredients);
  const beforeKcal = Math.round(totalDishKcal(dish.humanIngredients));

  if (budgetKcal <= 0 || dish.humanIngredients.length === 0 || beforeKcal <= 0) {
    chatClientLog('normalize_budget', {
      name: dish.name,
      budgetKcal,
      beforeKcal,
      emptyOrZero: true,
      scaled: false,
    });
    return {
      dish,
      scaled: false,
      beforeKcal,
      afterKcal: beforeKcal,
      budgetKcal,
      unmatchedCount,
      emptyOrZero: true,
      withinTolerance: false,
    };
  }

  if (isWithinTolerance(beforeKcal, budgetKcal)) {
    return {
      dish,
      scaled: false,
      beforeKcal,
      afterKcal: beforeKcal,
      budgetKcal,
      unmatchedCount,
      emptyOrZero: false,
      withinTolerance: true,
    };
  }

  let working = dish.humanIngredients;
  let scaled = false;
  for (let pass = 0; pass < MAX_NORMALIZE_PASSES; pass++) {
    const current = totalDishKcal(working);
    if (current <= 0) break;
    if (isWithinTolerance(current, budgetKcal)) break;

    const factor = budgetKcal / current;
    working = working.map((h) => ({
      ...h,
      grams: scaleIngredientGrams(h.grams, factor),
    }));
    scaled = true;
  }

  // Si sigue muy por encima, recorte adicional agresivo (±10% trust band)
  let afterKcal = totalDishKcal(working);
  if (afterKcal > budgetKcal * (1 + TRUST_BUDGET_TOLERANCE)) {
    const factor = (budgetKcal * 0.98) / afterKcal;
    working = working.map((h) => ({
      ...h,
      grams: scaleIngredientGrams(h.grams, factor),
    }));
    scaled = true;
    afterKcal = totalDishKcal(working);
  }

  const entries = working.map((h) => ({
    ingredientId: h.ingredientId,
    name: h.name,
    grams: h.grams,
  }));
  const humanIngredients = buildHumanIngredients(entries, useGrams);
  const macros = macrosFromIngredients(entries);
  const resultDish = { ...dish, humanIngredients, macros };
  afterKcal = Math.round(macros.calories);
  const withinTolerance = isWithinTolerance(afterKcal, budgetKcal, TRUST_BUDGET_TOLERANCE);

  chatClientLog(scaled ? 'budget_miss' : 'normalize_budget', {
    name: dish.name,
    beforeKcal,
    afterKcal,
    budgetKcal,
    scaled,
    withinTolerance,
    unmatchedCount,
  });

  return {
    dish: resultDish,
    scaled,
    beforeKcal,
    afterKcal,
    budgetKcal,
    unmatchedCount,
    emptyOrZero: false,
    withinTolerance,
  };
}

/**
 * Ajusta gramos hacia arriba o abajo para acercar el plato al presupuesto del slot (±8%).
 */
export function normalizeHydratedAiDishToBudget(
  dish: HydratedAiDish,
  budgetKcal: number,
  options?: { useGrams?: boolean },
): HydratedAiDish {
  return normalizeHydratedAiDishToBudgetDetailed(dish, budgetKcal, options).dish;
}

/** Copy cuando el motor escala porciones (SP-9). */
export const PORTION_ADJUST_COPY = 'Ajusté las cantidades para tu objetivo de hoy.';

/** @deprecated Use normalizeHydratedAiDishToBudget */
export function trimHydratedAiDishToBudget(
  dish: HydratedAiDish,
  budgetKcal: number,
  options?: { useGrams?: boolean },
): HydratedAiDish {
  return normalizeHydratedAiDishToBudget(dish, budgetKcal, options);
}

/** Convert a hydrated AI dish into AiMeal for week plan / calendar bridge. */
export function hydratedDishToAiMeal(dish: HydratedAiDish): AiMeal {
  const aiIngredients: AiIngredient[] = dish.humanIngredients.map((h) => ({
    name: h.name,
    grams: h.grams,
    kcal: Math.round(kcalForEntry(h.ingredientId, h.grams, h.name)),
  }));

  return {
    name: dish.name,
    ingredients: aiIngredients,
    totalKcal: Math.round(dish.macros.calories),
    prepMinutes: dish.prepMinutes,
    preparation: dish.preparation,
    tip: dish.tip,
  };
}

/** Convert AiMeal (plan semanal) into calendar Meal with recipe fields. */
export function plannedMealToMeal(meal: AiMeal): Meal {
  const entries = meal.ingredients
    .map((ing) => {
      const matched = fuzzyMatchIngredient(ing.name);
      return matched ? { ingredientId: matched.id, grams: ing.grams } : null;
    })
    .filter((e): e is { ingredientId: string; grams: number } => e != null);

  return {
    id: generateId(),
    name: meal.name,
    calories: meal.totalKcal,
    prepMinutes: meal.prepMinutes,
    humanPortion: meal.humanPortion,
    aiIngredients: meal.ingredients,
    entries: entries.length > 0 ? entries : undefined,
    preparation: meal.preparation,
    tip: meal.tip,
  };
}

/** Convert a hydrated AI dish into a calendar Meal. */
export function hydratedDishToMeal(dish: HydratedAiDish): Meal {
  return plannedMealToMeal(hydratedDishToAiMeal(dish));
}
