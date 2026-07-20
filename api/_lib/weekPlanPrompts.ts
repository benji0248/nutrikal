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
  lose: 'El usuario busca bajar de peso. Usá platos saciantes, buena proteína, porciones ajustadas al presupuesto calórico indicado.',
  maintain: 'El usuario mantiene peso. Armá platos equilibrados y satisfactorios dentro del presupuesto calórico.',
  gain: 'El usuario busca ganar masa muscular. Platos con buena densidad calórica y proteína, respetando el presupuesto.',
};

/** Espacio mental de comida cotidiana por país — orientación, no lista obligatoria. */
const EVERYDAY_EATING_HINTS: Record<string, string> = {
  ar: 'En una casa argentina normal: pollo con arroz, churrasco con puré, carne con ensalada, tortilla de papa, tarta de verduras, fideos con salsa, pollo al horno con papas, guisos simples, milanesa con ensalada.',
  uy: 'En una casa uruguaya normal: churrasco, pollo con papas, guiso, arroz con huevo, fideos, milanesa con ensalada, tarta, asado simple entre semana.',
  mx: 'En una casa mexicana normal: arroz con frijoles, pollo a la plancha, huevo con frijoles, sopa de pasta, pechuga con verduras, tacos sencillos, caldo de pollo.',
  co: 'En una casa colombiana normal: arroz con huevo, pollo sudado, sopa de verduras, lentejas, carne en bistec con arroz, ensalada simple.',
  cl: 'En una casa chilente normal: arroz con pollo, porotos, cazuela, huevo frito con arroz, pasta con salsa, ensalada chilena.',
  pe: 'En una casa peruana normal: arroz con pollo, lentejas, sudado, saltado simple, sopa casera, pescado a la plancha.',
  es: 'En una casa española normal: tortilla, pasta con tomate, pollo al horno, lentejas, ensalada mixta, pescado a la plancha, sopa de fideos.',
  ve: 'En una casa venezolana normal: arroz con pollo, pasta con queso, carne mechada con arroz, sopa, arepas sencillas, pollo guisado.',
  us: 'En una casa estadounidense normal: pollo al horno, pasta, sándwich caliente, arroz con carne, ensalada, sopa, huevos.',
  de: 'En una casa alemana normal: kartoffeln con carne, nudeln con salsa, schnitzel simple, suppe, ensalada, huevo con pan.',
};

const PRACTICAL_COOKING: Record<CookingTimePref, string> = {
  rapido: '≤15 min, una sartén o hervir. Nada de apanar, masas ni cocciones finas.',
  normal: '15–25 min, técnicas de cocina de casa (sartén, hervido, horno básico).',
  elaborado: 'Hasta ~40 min si el plato sigue siendo doméstico y conocido.',
};

const PRACTICAL_BUDGET: Record<BudgetPref, string> = {
  economico: 'Ingredientes baratos y rendidores del súper.',
  normal: 'Ingredientes cotidianos del súper.',
  premium: 'Podés usar algún ingrediente un poco mejor, sin salir de lo doméstico.',
};

function buildCulinaryIdentityBlock(): string[] {
  return [
    '# Rol',
    'Organizás las comidas de una casa para la semana.',
    'No sos chef, no escribís un recetario, no cocinás para un restaurante, no intentás impresionar.',
    'Organizás comidas para personas reales que trabajan, estudian y tienen poco tiempo.',
    'Tu trabajo no es sorprender: es que el usuario mire el plan y piense "sí, esto lo cocinaría cualquier día".',
    '',
    '# Criterio',
    'Familiaridad antes que creatividad. Naturalidad antes que originalidad.',
    'Si dudás entre un plato llamativo y uno común, elegí el común.',
    'Pensá como alguien que cocina un martes después del trabajo.',
    '',
    '# Nombres y recetas',
    'Nombres cortos y reconocibles — como los diría alguien en su casa ("pollo con arroz", no títulos de blog ni de restaurante).',
    'Cada ingrediente debe estar porque el plato lo necesita; no sumes extras para "variar" o "completar".',
    'Si un plato lleva cuatro ingredientes, cuatro. La simplicidad es una virtud.',
    'Repetir arroz, pollo, ensalada, huevo o papa en la semana es normal.',
    'La variedad de la semana viene de alternar platos principales conocidos, no de inventar combinaciones.',
  ];
}

function buildEverydayCultureBlock(code: string, displayName?: string): string[] {
  if (code === 'neutral' || !displayName) {
    return [
      '# Comida cotidiana',
      'Pensá en qué almuerza y cena una persona normal en su día a día — no en platos festivos ni de carta.',
      'Usá hábitos reales de alimentación doméstica, no gastronomía tradicional.',
    ];
  }

  const hint = EVERYDAY_EATING_HINTS[code];
  const lines = [
    '# Comida cotidiana',
    `Usuario de ${displayName}. Pensá en qué almuerza y cena una persona normal ahí entre semana — no en festejos ni en "lo más típico del país".`,
    'Distinguí comida cotidiana (lo que se come seguido en casa) de comida típica (lo que aparece en guías o restaurantes).',
  ];
  if (hint) {
    lines.push(`Referencia de espacio mental (no es lista obligatoria): ${hint}`);
  }
  return lines;
}

function buildPracticalBlock(cookingTime: CookingTimePref, budget: BudgetPref): string[] {
  return [
    '# Cocina real',
    `Tiempo: ${PRACTICAL_COOKING[cookingTime]}`,
    `Presupuesto: ${PRACTICAL_BUDGET[budget]}`,
    'Cocinero sin técnica avanzada. Si un plato exige panizado casero, punto de carne o varios pasos finos, cambiá por uno más doméstico.',
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
      lines.push('### Objetivo del usuario');
      lines.push(guidance);
    }
  }

  return lines;
}

const RHYTHM_RULES: Record<MealRhythmMode, (streakDays?: number) => string> = {
  carryover_dinner_to_lunch: () => 'Ritmo: cena D enlaza al almuerzo D+1 con link "prev.cena".',
  streak: (n) => `Ritmo: bloques de ${n ?? 3} días iguales con link "same:ID".`,
  max_variety: () => 'Ritmo: alterná platos principales distintos; repetí solo con link.',
  balanced: () => 'Ritmo: mezclá repetición corta (link "same:tX") con días distintos.',
};

function buildWeekStructureBlock(params: {
  weekPlanning: WeekPlanningInput;
  forbiddenDishNames: string[];
  templateBudget: number;
  weekDates: string[];
}): string[] {
  const wp = params.weekPlanning;
  const forbidden = params.forbiddenDishNames.length
    ? `Evitá estos platos recientes: ${params.forbiddenDishNames.slice(0, 15).join(' · ')}.`
    : '';

  return [
    '# Semana',
    `Slots: ${wp.activeSlots.join(', ')}.`,
    wp.weekdayRulesPrompt ?? 'Todos los días normales.',
    RHYTHM_RULES[wp.mealRhythmMode](wp.streakDays),
    forbidden,
    'Desayuno y snack: 1–2 recetas repetidas en la semana (link "same:tX").',
    `Almuerzo y cena: alterná platos principales cotidianos; máx ${params.templateBudget} templateId únicos.`,
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
    'dishes: una receta por templateId sin link (nombre, ingredientes, preparacion, tiempo_prep, tip).',
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
      'Ingredientes disponibles esta semana. Usalos como referencia de lo que hay en la casa — no como excusa para combinar raro.',
      params.weeklyPoolPrompt,
    ].join('\n'),
    buildOutputContractBlock(templateBudget, wp.activeSlots).join('\n'),
  ].filter(Boolean);

  return sections.join('\n\n');
}
