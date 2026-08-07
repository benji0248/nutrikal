import { normalizeNationality } from './gemini.js';
import { getMealSlotBudgetForPattern, type MealType } from './metabolic.js';

export type MealRhythmMode =
  | 'carryover_dinner_to_lunch'
  | 'streak'
  | 'max_variety'
  | 'balanced';

export type MealPattern = 'four' | 'three_no_snack' | 'no_breakfast' | 'two_main';

export interface WeekdayFlexRuleInput {
  weekday: number;
  mode: 'normal' | 'maintenance' | 'full_free';
  nickname?: string;
}

export type CookingTimePref = 'rapido' | 'normal' | 'elaborado';
export type BudgetPref = 'economico' | 'normal' | 'premium';

export interface WeekPlanningInput {
  mealPattern: MealPattern;
  mealRhythmMode: MealRhythmMode;
  streakDays?: number;
  weekdayFlexRules?: WeekdayFlexRuleInput[];
  weekdayRulesPrompt?: string;
  flexMealsPerWeek: number;
  flexMealScope: string;
  preferredFlexWeekdays?: number[];
  activeSlots: string[];
  cookingTime?: CookingTimePref;
  budget?: BudgetPref;
}

export function getWeekTemplateBudget(weekPlanning: Pick<WeekPlanningInput, 'mealPattern'>): number {
  const budgets: Record<MealPattern, number> = {
    four: 8,
    three_no_snack: 7,
    no_breakfast: 7,
    two_main: 5,
  };
  return budgets[weekPlanning.mealPattern];
}

const GOAL_GUIDANCE: Record<string, string> = {
  lose: 'Objetivo: bajar de peso — saciantes, buena proteína.',
  maintain: 'Objetivo: mantener peso — equilibrado.',
  gain: 'Objetivo: ganar masa — buena densidad calórica y proteína.',
};

/** Preferencias de resultado, no microinstrucciones de cocina. */
const COOKING_PREF: Record<CookingTimePref, string> = {
  rapido: 'comidas rápidas de entre semana',
  normal: 'comidas caseras simples',
  elaborado: 'puede tomarse un poco más si sigue siendo casera',
};

const BUDGET_PREF: Record<BudgetPref, string> = {
  economico: 'prioridad a lo barato del súper',
  normal: 'ingredientes cotidianos del súper',
  premium: 'algún upgrade menor, sin salir de lo doméstico',
};

/** Ritmo estructural (links / carryover). El criterio culinario define cuándo repetir. */
const RHYTHM_RULES: Record<MealRhythmMode, (streakDays?: number) => string> = {
  carryover_dinner_to_lunch: () => 'Ritmo estructural: cena D → almuerzo D+1 con link "prev.cena".',
  streak: (n) => `Ritmo estructural: bloques de ${n ?? 3} días iguales con link "same:ID".`,
  max_variety: () => 'Ritmo estructural: más variedad en principales; repetí con link cuando sea natural.',
  balanced: () => 'Ritmo estructural: mezcla días distintos con repetición corta (link "same:tX") cuando encaje.',
};

function buildIdentityBlock(): string[] {
  return [
    '# NutriKal',
    'Menú semanal de comidas caseras simples, como las de cualquier día de la semana.',
    'Usá tu criterio culinario. El prompt marca el resultado y las reglas estructurales; no reemplaza tu juicio de cocina.',
    'Si una preferencia de estilo choca con un plato más natural, priorizá la naturalidad (sin romper JSON, slots, links ni dayMode).',
  ];
}

function buildContextBlock(params: {
  displayName?: string;
  restrictions?: string[];
  cookingTime: CookingTimePref;
  budget: BudgetPref;
}): string[] {
  const lines = ['# Contexto'];
  if (params.displayName) {
    lines.push(`Cocina cotidiana de ${params.displayName}.`);
  } else {
    lines.push('Cocina cotidiana de casa.');
  }
  if (params.restrictions?.length) {
    lines.push(`Restricciones (obligatorias): ${params.restrictions.join(', ')}.`);
  }
  lines.push(
    `Preferencias: ${COOKING_PREF[params.cookingTime]}; ${BUDGET_PREF[params.budget]}.`,
  );
  return lines;
}

function buildCalorieBlock(params: {
  mealPattern: MealPattern;
  activeSlots: string[];
  dailyBudgetKcal: number;
  maintenanceBudgetKcal?: number;
}): string[] {
  const lines = [
    '# Calorías',
    `Normal: ~${params.dailyBudgetKcal} kcal/día.`,
  ];
  if (params.maintenanceBudgetKcal != null && params.maintenanceBudgetKcal !== params.dailyBudgetKcal) {
    lines.push(`Mantenimiento: ~${params.maintenanceBudgetKcal} kcal/día.`);
  }
  lines.push('full_free: slots [].');
  lines.push(
    `Slots: ${params.activeSlots
      .map((slot) => {
        const kcal = getMealSlotBudgetForPattern(
          params.dailyBudgetKcal,
          slot as MealType,
          params.mealPattern,
        );
        return `${slot} ~${kcal}`;
      })
      .join(' · ')}.`,
  );
  lines.push(
    'Usá kcal/100g del inventario. Preferí porciones humanas naturales antes que cerrar el presupuesto al gramo; un desvío chico está bien si el plato queda más creíble. El sistema ajusta después.',
  );
  lines.push('Flex (isFlexMeal): un poco más generoso.');
  return lines;
}

function buildPlanAndOutputBlock(params: {
  weekPlanning: WeekPlanningInput;
  templateBudget: number;
  weekDates: string[];
}): string[] {
  const wp = params.weekPlanning;
  return [
    '# Plan y salida',
    `Slots: ${wp.activeSlots.join(', ')}. Máx ${params.templateBudget} templateId únicos.`,
    wp.weekdayRulesPrompt ?? 'Todos los días normales.',
    RHYTHM_RULES[wp.mealRhythmMode](wp.streakDays),
    'Repetición: desayuno y snack suelen rotar entre pocas opciones; almuerzo y cena con más variedad. Reutilizar una cena como almuerzo siguiente es natural. Repetí o variá según criterio, no por obligación mecánica.',
    `Fechas: ${params.weekDates.join(', ')}.`,
    'JSON:',
    '- days: 7 fechas con dayMode, slots (mealType, templateId, link?, isFlexMeal?). full_free → slots [].',
    '- link: omitir | "prev.cena" | "same:tX".',
    '- dishes: una por templateId sin link → templateId, nombre, ingredientes [{nombre, rol, gramos}], tiempo_prep. Sin preparacion ni tip.',
  ].filter(Boolean);
}

export function buildWeekPlanOneShotPrompt(params: {
  profileName?: string;
  nationality?: string;
  restrictions?: string[];
  goal?: string;
  weekPlanning: WeekPlanningInput;
  weeklyPoolPrompt: string;
  weekDates: string[];
  dailyBudgetKcal?: number;
  maintenanceBudgetKcal?: number;
}): string {
  const wp = params.weekPlanning;
  const templateBudget = getWeekTemplateBudget(wp);
  const { displayName } = normalizeNationality(params.nationality);
  const cookingTime = wp.cookingTime ?? 'normal';
  const budgetPref = wp.budget ?? 'normal';

  const goalLine =
    params.goal && GOAL_GUIDANCE[params.goal] ? GOAL_GUIDANCE[params.goal] : '';

  const calorieBlock =
    params.dailyBudgetKcal != null && params.dailyBudgetKcal > 0
      ? buildCalorieBlock({
          mealPattern: wp.mealPattern,
          activeSlots: wp.activeSlots,
          dailyBudgetKcal: params.dailyBudgetKcal,
          maintenanceBudgetKcal: params.maintenanceBudgetKcal,
        })
      : [];

  // Orden: decisiones del menú primero; inventario al final (referencia pasiva).
  return [
    buildIdentityBlock().join('\n'),
    goalLine,
    calorieBlock.join('\n'),
    buildPlanAndOutputBlock({
      weekPlanning: wp,
      templateBudget,
      weekDates: params.weekDates,
    }).join('\n'),
    buildContextBlock({
      displayName: displayName ?? params.nationality,
      restrictions: params.restrictions,
      cookingTime,
      budget: budgetPref,
    }).join('\n'),
    [
      '# Inventario (despensa disponible)',
      'Referencia pasiva: no es una lista a repartir ni a aprovechar.',
      'Pensá primero el plato. Después verificá si puede prepararse con el inventario. Nunca diseñes un plato para aprovechar ingredientes disponibles.',
      params.weeklyPoolPrompt,
    ].join('\n'),
  ]
    .filter(Boolean)
    .join('\n\n');
}
