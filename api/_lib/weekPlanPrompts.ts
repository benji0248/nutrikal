import { normalizeNationality, getCuisineContext, getJerga } from './gemini.js';

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

export function buildWeekPlanOneShotPrompt(params: {
  profileName?: string;
  nationality?: string;
  restrictions?: string[];
  goal?: string;
  weekPlanning: WeekPlanningInput;
  weeklyPoolPrompt: string;
  forbiddenDishNames: string[];
  weekDates: string[];
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

  return [
    'Planificador semanal. Comidas caseras simples, nombres cortos, 4-6 ingredientes por plato.',
    params.profileName ? `Usuario: ${params.profileName}.` : '',
    cuisine,
    `Tono regional para nombres de platos y tips: ${jerga}`,
    params.restrictions?.length ? `Restricciones: ${params.restrictions.join(', ')}.` : '',
    params.goal ? `Objetivo: ${params.goal}.` : '',
    `Slots: ${wp.activeSlots.join(', ')}.`,
    wp.weekdayRulesPrompt ?? 'Todos los días normales.',
    rhythmRules[wp.mealRhythmMode],
    forbidden,
    params.weeklyPoolPrompt,
    `Máx ${templateBudget} templateId únicos. Desayuno/snack: 1-2 opciones/semana.`,
    'days: 7 fechas con slots (mealType, templateId, link opcional, isFlexMeal).',
    'link: omitir, "prev.cena", o "same:tX". Días full_free: slots [].',
    'dishes: una receta por templateId sin link (nombre, ingredientes, preparacion, tiempo_prep, tip).',
    `Fechas: ${params.weekDates.join(', ')}.`,
  ]
    .filter(Boolean)
    .join('\n');
}
