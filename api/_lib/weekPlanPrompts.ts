import { normalizeNationality, getCuisineContext, getJerga } from './gemini.js';
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
  lose: 'El usuario busca bajar de peso. Usá platos saciantes, buena proteína, porciones ajustadas al presupuesto calórico indicado.',
  maintain: 'El usuario mantiene peso. Armá platos equilibrados y satisfactorios dentro del presupuesto calórico.',
  gain: 'El usuario busca ganar masa muscular. Platos con buena densidad calórica y proteína, respetando el presupuesto.',
};

function buildCalorieBlock(params: {
  goal?: string;
  mealPattern: MealPattern;
  activeSlots: string[];
  dailyBudgetKcal: number;
  maintenanceBudgetKcal?: number;
}): string[] {
  const lines: string[] = [];

  lines.push('## Presupuesto calórico');
  lines.push(`- Días NORMALES: cada día debe sumar ~${params.dailyBudgetKcal} kcal en total (suma de todos sus slots).`);

  if (params.maintenanceBudgetKcal != null && params.maintenanceBudgetKcal !== params.dailyBudgetKcal) {
    lines.push(`- Días MANTENIMIENTO (dayMode "maintenance"): cada día debe sumar ~${params.maintenanceBudgetKcal} kcal (sin déficit).`);
  }

  lines.push('- Días LIBRES (dayMode "full_free"): sin menú, slots: [].');
  lines.push('');

  lines.push('### Reparto por comida (días normales)');
  for (const slot of params.activeSlots) {
    const mt = slot as MealType;
    const slotKcal = getMealSlotBudgetForPattern(params.dailyBudgetKcal, mt, params.mealPattern);
    lines.push(`- ${slot}: ~${slotKcal} kcal`);
  }

  lines.push('');
  lines.push('⚠️ CRÍTICO — CALORÍAS:');
  lines.push('- Cada plato DEBE sumar entre 90% y 110% del objetivo calórico de su slot. No se aceptan platos fuera de ese rango.');
  lines.push('- Usá los valores kcal/100g de cada ingrediente (indicados en la Canasta Semanal) para calcular el total del plato.');
  lines.push('- Si un plato queda por debajo del 90%, aumentá gramos de ingredientes densos (cereales, carnes, grasas).');
  lines.push('- Si un plato supera el 110%, reducí gramos de los ingredientes más calóricos.');
  lines.push('- El presupuesto diario es la suma de sus slots. Cada slot se cumple por separado; no uses un slot para compensar otro.');
  lines.push('- Si un slot es "isFlexMeal": true, ese plato puede tener hasta 120% del objetivo base del slot.');

  if (params.goal) {
    const guidance = GOAL_GUIDANCE[params.goal];
    if (guidance) {
      lines.push('');
      lines.push(`### Objetivo del usuario`);
      lines.push(guidance);
    }
  }

  return lines;
}

export function buildWeekPlanOneShotPrompt(params: {
  profileName?: string;
  nationality?: string;
  restrictions?: string[];
  goal?: string;
  weekPlanning: WeekPlanningInput;
  weeklyPoolPrompt: string;
  forbiddenDishNames: string[];
  weekDates: string[];
  dailyBudgetKcal?: number;
  maintenanceBudgetKcal?: number;
}): string {
  const wp = params.weekPlanning;
  const templateBudget = getWeekTemplateBudget(wp);

  const { code, displayName } = normalizeNationality(params.nationality);
  const cuisine = getCuisineContext(code, displayName ?? params.nationality);
  const jerga = getJerga(code);

  const rhythmRules: Record<MealRhythmMode, string> = {
    carryover_dinner_to_lunch:
      'Cena D enlaza al almuerzo D+1 con link "prev.cena".',
    streak: `Bloques de ${wp.streakDays ?? 3} días iguales con link "same:ID".`,
    max_variety: 'Variedad dentro del presupuesto de templates; repetí solo con link.',
    balanced: 'Mezclá repetición corta (link "same:ID") con días distintos.',
  };

  const forbidden = params.forbiddenDishNames.length
    ? `No repitas: ${params.forbiddenDishNames.slice(0, 15).join(' · ')}.`
    : '';

  const calorieBlock = params.dailyBudgetKcal != null && params.dailyBudgetKcal > 0
    ? buildCalorieBlock({
        goal: params.goal,
        mealPattern: wp.mealPattern,
        activeSlots: wp.activeSlots,
        dailyBudgetKcal: params.dailyBudgetKcal,
        maintenanceBudgetKcal: params.maintenanceBudgetKcal,
      })
    : [params.goal ? `Objetivo: ${params.goal}.` : ''];

  return [
    'Planificador semanal. Comidas caseras simples, nombres cortos, 4-6 ingredientes por plato.',
    params.profileName ? `Usuario: ${params.profileName}.` : '',
    cuisine,
    `Tono regional para nombres de platos y tips: ${jerga}`,
    params.restrictions?.length ? `Restricciones: ${params.restrictions.join(', ')}.` : '',
    ...calorieBlock,
    '',
    `Slots: ${wp.activeSlots.join(', ')}.`,
    wp.weekdayRulesPrompt ?? 'Todos los días normales.',
    rhythmRules[wp.mealRhythmMode],
    forbidden,
    params.weeklyPoolPrompt,
    `Máx ${templateBudget} templateId únicos. Solamente 1-2 recetas distintas para desayuno y para snack en toda la semana (repetilas con link "same:tX").`,
    'Cada fecha tiene TODOS los slots listados arriba (salvo días full_free con slots []).',
    'days: 7 fechas con slots (mealType, templateId, link opcional, isFlexMeal).',
    'link: omitir, "prev.cena", o "same:tX". Días full_free: slots [].',
    'dishes: una receta por templateId sin link (nombre, ingredientes, preparacion, tiempo_prep, tip).',
    `Fechas: ${params.weekDates.join(', ')}.`,
  ]
    .filter(Boolean)
    .join('\n');
}
