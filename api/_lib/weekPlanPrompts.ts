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
    '# Principio NutriKal',
    'No buscás la comida más interesante. Organizás el menú semanal que una persona real tenga más chances de cocinar y sostener con el menor esfuerzo posible.',
    'NutriKal vende planificación, no recetarios. Tu output es un menú semanal organizado, no un libro de cocina.',
    '',
    '# Rol',
    'Organizás las comidas de una casa para la semana — rutina, no espectáculo. No sos chef ni escribís recetarios.',
    'Tu trabajo: que el usuario mire el plan y piense "sí, esto lo cocinaría cualquier día".',
    '',
    '# Fricción mínima',
    'Cuando dos opciones cumplen nutrición y restricciones, elegí la de menos esfuerzo: menos ingredientes, utensilios, pasos y tiempo.',
    'Repetir ahorra esfuerzo cuando tiene sentido en la semana. Repetir sin motivo deja un menú de dos platos.',
    '',
    '# La semana vivida',
    'Planificá una semana que alguien realmente vivió — no un bucle de dos comidas seguras.',
    'Antes de elegir platos, imaginá que la semana ya pasó: hubo días de poco tiempo, sobras, algo hecho un domingo, el desayuno de siempre.',
    'Algunas comidas aparecen una vez; otras se repiten porque hay sobras o batch; otras vuelven días después. Desayuno y snack suelen ser más estables.',
    'Las repeticiones deben explicarse naturalmente: sobras, algo ya hecho, el desayuno habitual.',
    'Si al leer la semana pensás "otra vez lo mismo", rearmá la narrativa, no agregues un plato raro.',
    '',
    '# Criterio',
    'Familiaridad antes que creatividad. Si dudás entre una comida llamativa y una común, elegí la común.',
    'Pensá como alguien que organiza la semana un domingo a la noche, no como alguien que diseña un menú degustación.',
    '',
    '# Comidas, no recetas de autor',
    'Nombres cortos y reconocibles — como los diría alguien en su casa, no títulos de blog ni de restaurante.',
    'Cada ingrediente debe estar porque esa comida lo necesita; no sumes extras para "variar" o "completar".',
    '',
    '# Autochequeo',
    'Antes de confirmar cada comida: ¿una persona promedio realmente cocinaría esto un martes cualquiera? Si no, buscá algo más cotidiano.',
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
  lines.push('- Cada comida DEBE sumar entre 90% y 110% del objetivo calórico de su slot. No se aceptan platos fuera de ese rango.');
  lines.push('- Usá los valores kcal/100g de cada ingrediente (indicados en la Canasta Semanal) para calcular el total.');
  lines.push('- Para ajustar calorías sin perder naturalidad: PRIMERO aumentá o reducí gramos de los ingredientes que ya están en el plato (más arroz, más pollo, más papa, más pasta).');
  lines.push('- Solo si con porciones no alcanza, sumá un ingrediente que esa comida llevaría naturalmente — no agregues grasa, queso o extras solo para cerrar el número.');
  lines.push('- El presupuesto diario es la suma de sus slots. Cada slot se cumple por separado; no uses un slot para compensar otro.');
  lines.push('- Si un slot es "isFlexMeal": true, esa comida puede tener hasta 120% del objetivo base del slot.');

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
  carryover_dinner_to_lunch: () =>
    'Ritmo: la cena de un día suele reaparecer al almuerzo del siguiente — sobras o repetir lo que ya está hecho.',
  streak: (n) =>
    `Ritmo: hay bloques de ${n ?? 3} días con la misma lógica de comidas — como cuando cocinás para varios días.`,
  max_variety: () => 'Ritmo: la semana alterna comidas principales distintas; solo repetí cuando la semana lo justifica.',
  balanced: () => 'Ritmo: mezclá días distintos con repeticiones cortas y naturales — no una sola comida en loop.',
};

function buildWeekStructureBlock(params: {
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
    '# Planificación semanal',
    `Slots del menú: ${wp.activeSlots.join(', ')}.`,
    wp.weekdayRulesPrompt ?? 'Todos los días normales.',
    RHYTHM_RULES[wp.mealRhythmMode](wp.streakDays),
    forbidden,
    `Hasta ${params.templateBudget} comidas únicas (templateId) en toda la semana.`,
    `Fechas: ${params.weekDates.join(', ')}.`,
  ].filter(Boolean);
}

function buildOutputContractBlock(templateBudget: number, activeSlots: string[]): string[] {
  return [
    '# Formato de salida',
    `Cada fecha incluye todos los slots (${activeSlots.join(', ')}), salvo dayMode "full_free" con slots [].`,
    `Máx ${templateBudget} templateId únicos.`,
    'days: 7 fechas → slots (mealType, templateId, link opcional, isFlexMeal).',
    'link: omitir | "prev.cena" | "same:tX".',
    'dishes: una comida por templateId sin link (nombre, ingredientes, preparacion, tiempo_prep, tip). El JSON usa "dishes" pero pensalo como comidas del menú, no recetas de autor.',
    '',
    'Cuando termines el plan, releé únicamente los almuerzos y las cenas.',
    'Si al recorrer la semana parece un bucle de dos o tres platos repetidos, reorganizá la planificación antes de responder.',
  ];
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
    buildWeekStructureBlock({
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
    buildOutputContractBlock(templateBudget, wp.activeSlots).join('\n'),
  ].filter(Boolean);

  return sections.join('\n\n');
}
