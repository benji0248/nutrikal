import { normalizeNationality, getJerga } from './gemini.js';
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
  lose: 'Bajar de peso: comidas saciantes, buena proteína, porciones al presupuesto.',
  maintain: 'Mantener peso: comidas equilibradas dentro del presupuesto.',
  gain: 'Ganar masa: buena densidad calórica y proteína, respetando el presupuesto.',
};

const EVERYDAY_EATING_PATTERNS: Record<string, string> = {
  ar: 'proteína a la plancha/horno + arroz/papa/puré; pastas simples; huevo; ensalada; guiso de olla.',
  uy: 'carne/pollo con acompañamiento; pastas; huevos; guisos; ensalada.',
  mx: 'proteína + arroz/frijoles; huevo; sopas; verdura; desayunos rápidos.',
  co: 'arroz; pollo/carne; legumbres; sopas; verdura.',
  cl: 'arroz + proteína; legumbres; olla; huevo; ensalada.',
  pe: 'arroz + proteína; legumbres; saltado/olla; sopa; pescado a la plancha.',
  es: 'huevo/tortilla; pasta/legumbres; pollo/pescado al horno; ensalada.',
  ve: 'arroz + proteína; pasta; sopas; arepa/pan ocasional.',
  us: 'proteína + acompañamiento; pasta; ensalada; huevo; sopas.',
  de: 'proteína con papa/pasta; sopas; ensalada; huevo; una sartén/horno.',
};

const PRACTICAL_COOKING: Record<CookingTimePref, string> = {
  rapido: '≤15 min, una sartén o hervir',
  normal: '15–25 min, sartén/hervido/horno básico',
  elaborado: 'Hasta ~40 min si sigue siendo doméstica',
};

const PRACTICAL_BUDGET: Record<BudgetPref, string> = {
  economico: 'Ingredientes baratos del súper',
  normal: 'Ingredientes cotidianos del súper',
  premium: 'Algún ingrediente un poco mejor, sin salir de lo doméstico',
};

const RHYTHM_RULES: Record<MealRhythmMode, (streakDays?: number) => string> = {
  carryover_dinner_to_lunch: () => 'Ritmo: cena D → almuerzo D+1 con link "prev.cena".',
  streak: (n) => `Ritmo: bloques de ${n ?? 3} días iguales con link "same:ID".`,
  max_variety: () => 'Ritmo: alterná principales; repetí solo con link.',
  balanced: () => 'Ritmo: mezcla repetición corta (link "same:tX") con días distintos.',
};

function buildIdentityBlock(): string[] {
  return [
    '# NutriKal',
    'Menú semanal cotidiano de casa: poca fricción, nombres cortos, ingredientes solo los necesarios.',
    'Familiaridad > creatividad. Almuerzo y cena pueden repetirse algunos días; desayuno y snack conviene alternar.',
  ];
}

function buildContextBlock(params: {
  code: string;
  displayName?: string;
  profileName?: string;
  restrictions?: string[];
  jerga: string;
  cookingTime: CookingTimePref;
  budget: BudgetPref;
}): string[] {
  const lines = [
    '# Contexto',
    params.displayName
      ? `Usuario de ${params.displayName}. Comidas de casa entre semana, no típicos de guía.`
      : 'Comidas de casa entre semana, no carta de restaurante.',
  ];
  const patterns = EVERYDAY_EATING_PATTERNS[params.code];
  if (patterns) lines.push(`Patrones: ${patterns}`);
  if (params.profileName) lines.push(`Usuario: ${params.profileName}.`);
  if (params.restrictions?.length) lines.push(`Restricciones: ${params.restrictions.join(', ')}.`);
  lines.push(`Tono: ${params.jerga}`);
  lines.push(`Tiempo: ${PRACTICAL_COOKING[params.cookingTime]}. Presupuesto: ${PRACTICAL_BUDGET[params.budget]}.`);
  lines.push('Sin técnicas avanzadas (nada de panizado casero ni cocciones finas).');
  return lines;
}

function buildCalorieBlock(params: {
  goal?: string;
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
    'Usá kcal/100g de la canasta. Gramos domésticos razonables; el sistema ajusta después. Flex (isFlexMeal): un poco más generoso.',
  );
  if (params.goal && GOAL_GUIDANCE[params.goal]) {
    lines.push(GOAL_GUIDANCE[params.goal]);
  }
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
    'Desayuno y snack: mínimo 2 opciones distintas de cada uno. Alterná en la semana (bloques de 2–3 días con link "same:tX" ok; no la misma comida todos los días).',
    'Almuerzo y cena: variá los principales; repetí con "prev.cena" o "same:tX" solo cuando encaje.',
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
  const { code, displayName } = normalizeNationality(params.nationality);
  const jerga = getJerga(code);
  const cookingTime = wp.cookingTime ?? 'normal';
  const budgetPref = wp.budget ?? 'normal';

  const calorieBlock =
    params.dailyBudgetKcal != null && params.dailyBudgetKcal > 0
      ? buildCalorieBlock({
          goal: params.goal,
          mealPattern: wp.mealPattern,
          activeSlots: wp.activeSlots,
          dailyBudgetKcal: params.dailyBudgetKcal,
          maintenanceBudgetKcal: params.maintenanceBudgetKcal,
        })
      : params.goal && GOAL_GUIDANCE[params.goal]
        ? [GOAL_GUIDANCE[params.goal]]
        : [];

  return [
    buildIdentityBlock().join('\n'),
    buildContextBlock({
      code,
      displayName: displayName ?? params.nationality,
      profileName: params.profileName,
      restrictions: params.restrictions,
      jerga,
      cookingTime,
      budget: budgetPref,
    }).join('\n'),
    calorieBlock.join('\n'),
    buildPlanAndOutputBlock({
      weekPlanning: wp,
      templateBudget,
      weekDates: params.weekDates,
    }).join('\n'),
    ['# Canasta', params.weeklyPoolPrompt].join('\n'),
  ]
    .filter(Boolean)
    .join('\n\n');
}
