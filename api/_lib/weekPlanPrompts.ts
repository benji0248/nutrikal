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
  lose: 'El usuario busca bajar de peso: comidas saciantes, buena proteína, porciones ajustadas al presupuesto calórico.',
  maintain: 'El usuario mantiene peso: comidas equilibradas y satisfactorias dentro del presupuesto calórico.',
  gain: 'El usuario busca ganar masa muscular: comidas con buena densidad calórica y proteína, respetando el presupuesto.',
};

/**
 * Patrones de hábito cotidiano por país — enseñan forma de pensar, no platos a copiar.
 * Sin nombres de platos concretos para evitar anclaje.
 */
const EVERYDAY_EATING_PATTERNS: Record<string, string> = {
  ar: 'proteína simple a la plancha u horno + arroz/papa/puré; pastas con salsa básica; huevo en desayuno; ensalada o verdura de acompañamiento; guisos de una olla entre semana.',
  uy: 'similar al cono sur: carne o pollo con acompañamiento clásico, pastas, huevos, guisos sencillos, ensalada de mesa.',
  mx: 'proteína sencilla + arroz o frijoles; huevo en varias comidas; sopas caseras; verdura de acompañamiento; desayunos rápidos.',
  co: 'arroz como base frecuente; pollo o carne simple; legumbres; sopas; ensalada o verdura cocida.',
  cl: 'arroz con proteína; legumbres; cazuela u olla; huevo; ensalada simple.',
  pe: 'arroz con proteína; legumbres; saltado u olla simple; sopa casera; pescado a la plancha.',
  es: 'tortilla o huevo; pasta o legumbres; pollo o pescado al horno; ensalada; sopa de fideos.',
  ve: 'arroz con proteína; pasta sencilla; sopas; arepa o pan como acompañamiento ocasional.',
  us: 'proteína al horno o sartén + acompañamiento clásico; pasta; ensalada; sándwich o huevo; sopas.',
  de: 'proteína con papa o pasta; sopas; ensalada; huevo; platos de una sartén u horno.',
};

const PRACTICAL_COOKING: Record<CookingTimePref, string> = {
  rapido: '≤15 min, una sartén o hervir. Nada de apanar, masas ni cocciones finas.',
  normal: '15–25 min, técnicas de cocina de casa (sartén, hervido, horno básico).',
  elaborado: 'Hasta ~40 min si la comida sigue siendo doméstica y conocida.',
};

const PRACTICAL_BUDGET: Record<BudgetPref, string> = {
  economico: 'Ingredientes baratos y rendidores del súper.',
  normal: 'Ingredientes cotidianos del súper.',
  premium: 'Podés usar algún ingrediente un poco mejor, sin salir de lo doméstico.',
};

function buildCulinaryIdentityBlock(): string[] {
  return [
    '# NutriKal — planificador semanal',
    'Organizás comidas cotidianas que una persona real cocinaría y sostendría toda la semana, con el menor esfuerzo posible.',
    'No sos chef ni recetario: rutina de casa, no espectáculo. El usuario debe pensar "sí, esto lo haría un martes cualquiera".',
    '',
    'Priorizá siempre la opción de menos fricción (menos ingredientes, pasos, técnicas y compras especiales).',
    'Repetir comidas e ingredientes en la semana es deseable — reduce decisiones.',
    'Familiaridad antes que creatividad: nombres cortos de casa, ingredientes solo los necesarios, sin combinaciones raras.',
  ];
}

function buildEverydayCultureBlock(code: string, displayName?: string): string[] {
  if (code === 'neutral' || !displayName) {
    return [
      '# Hábitos cotidianos',
      'Pensá en qué almuerza y cena una persona normal entre semana — no en festejos ni en carta de restaurante.',
      'Patrones mentales (no son platos a copiar): proteína simple + acompañamiento habitual; pastas o arroz; huevo; ensalada o verdura; una olla o sartén.',
    ];
  }

  const patterns = EVERYDAY_EATING_PATTERNS[code];
  const lines = [
    '# Hábitos cotidianos',
    `Usuario de ${displayName}. Pensá en qué come una persona normal ahí entre semana — no en "lo más típico del país" ni en gastronomía festiva.`,
    'Comida cotidiana = lo que se repite en casa. Comida típica = lo que aparece en guías o restaurantes. Planificá lo primero.',
  ];
  if (patterns) {
    lines.push(
      'Patrones de referencia mental (NO son platos obligatorios ni una lista para copiar — solo enseñan la lógica de ese contexto):',
      patterns,
    );
  }
  return lines;
}

function buildPracticalBlock(cookingTime: CookingTimePref, budget: BudgetPref): string[] {
  return [
    '# Cocina real',
    `Tiempo: ${PRACTICAL_COOKING[cookingTime]}`,
    `Presupuesto: ${PRACTICAL_BUDGET[budget]}`,
    'Cocinero sin técnica avanzada. Si una comida exige panizado casero, punto fino de carne o varios pasos, cambiá por otra más doméstica.',
  ];
}

function buildCalorieBlock(params: {
  goal?: string;
  mealPattern: MealPattern;
  activeSlots: string[];
  dailyBudgetKcal: number;
  maintenanceBudgetKcal?: number;
}): string[] {
  const lines: string[] = [];

  lines.push('## Presupuesto calórico');
  lines.push(`- Días NORMALES: referencia ~${params.dailyBudgetKcal} kcal/día (suma orientativa de slots).`);

  if (params.maintenanceBudgetKcal != null && params.maintenanceBudgetKcal !== params.dailyBudgetKcal) {
    lines.push(`- Días MANTENIMIENTO (dayMode "maintenance"): referencia ~${params.maintenanceBudgetKcal} kcal/día (sin déficit).`);
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
  lines.push('### Porciones');
  lines.push('- Usá los kcal/slot como guía. Proponé gramos domésticos razonables por ingrediente; el sistema ajusta las porciones después.');
  lines.push('- Priorizá porciones naturales (más base o proteína principal para subir calorías; no sumes grasa/queso solo para cerrar números).');
  lines.push('- Flex: si isFlexMeal es true, la porción puede ser un poco más generosa que el slot base.');

  if (params.goal) {
    const guidance = GOAL_GUIDANCE[params.goal];
    if (guidance) {
      lines.push('');
      lines.push('### Objetivo del usuario');
      lines.push(guidance);
    }
  }

  return lines;
}

const RHYTHM_RULES: Record<MealRhythmMode, (streakDays?: number) => string> = {
  carryover_dinner_to_lunch: () => 'Ritmo: cena D enlaza al almuerzo D+1 con link "prev.cena".',
  streak: (n) => `Ritmo: bloques de ${n ?? 3} días iguales con link "same:ID".`,
  max_variety: () => 'Ritmo: alterná comidas principales distintas; repetí solo con link.',
  balanced: () => 'Ritmo: mezclá repetición corta (link "same:tX") con días distintos.',
};

function buildWeekPlanAndOutputBlock(params: {
  weekPlanning: WeekPlanningInput;
  forbiddenDishNames: string[];
  templateBudget: number;
  weekDates: string[];
}): string[] {
  const wp = params.weekPlanning;
  const forbidden = params.forbiddenDishNames.length
    ? `Evitá estas comidas recientes: ${params.forbiddenDishNames.slice(0, 15).join(' · ')}.`
    : '';

  return [
    '# Planificación y salida',
    `Slots: ${wp.activeSlots.join(', ')}. Máx ${params.templateBudget} templateId únicos.`,
    wp.weekdayRulesPrompt ?? 'Todos los días normales.',
    RHYTHM_RULES[wp.mealRhythmMode](wp.streakDays),
    forbidden,
    'Desayuno y snack: 1–2 comidas repetidas en la semana (link "same:tX") — menos decisiones para el usuario.',
    `Fechas: ${params.weekDates.join(', ')}.`,
    '',
    'JSON de salida:',
    '- days: 7 fechas con dayMode, slots (mealType, templateId, link?, isFlexMeal?). Días full_free → slots [].',
    '- link: omitir | "prev.cena" | "same:tX".',
    '- dishes: una entrada por templateId sin link → templateId, nombre, ingredientes [{nombre, rol, gramos}], tiempo_prep. Sin preparacion ni tip.',
  ].filter(Boolean);
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
      : params.goal
        ? [`Objetivo: ${params.goal}.`]
        : [];

  const sections = [
    buildCulinaryIdentityBlock().join('\n'),
    [
      buildEverydayCultureBlock(code, displayName ?? params.nationality).join('\n'),
      params.profileName ? `Usuario: ${params.profileName}.` : '',
      params.restrictions?.length ? `Restricciones: ${params.restrictions.join(', ')}.` : '',
      `Tono regional (solo nombres y tips): ${jerga}`,
    ]
      .filter(Boolean)
      .join('\n'),
    buildPracticalBlock(cookingTime, budgetPref).join('\n'),
    calorieBlock.join('\n'),
    buildWeekPlanAndOutputBlock({
      weekPlanning: wp,
      forbiddenDishNames: params.forbiddenDishNames,
      templateBudget,
      weekDates: params.weekDates,
    }).join('\n'),
    [
      '# Canasta semanal',
      'Ingredientes disponibles en la casa esta semana. Referencia para planificar — no excusa para combinar raro.',
      params.weeklyPoolPrompt,
    ].join('\n'),
  ].filter(Boolean);

  return sections.join('\n\n');
}
