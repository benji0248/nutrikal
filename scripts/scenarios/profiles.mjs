/**
 * Perfiles de prueba para generar y evaluar planes semanales.
 * Cada escenario describe un usuario realista (nacionalidad, objetivo, cocina, etc.).
 */

/** @typedef {'rapido'|'normal'|'elaborado'} CookingTime */
/** @typedef {'economico'|'normal'|'premium'} Budget */
/** @typedef {'lose'|'maintain'|'gain'} Goal */
/** @typedef {'four'|'three_no_snack'|'no_breakfast'|'two_main'} MealPattern */
/** @typedef {'carryover_dinner_to_lunch'|'streak'|'max_variety'|'balanced'} MealRhythm */

/**
 * @typedef {object} ScenarioProfile
 * @property {string} id
 * @property {string} label
 * @property {string} persona  Descripción en 1-2 frases (para el reporte humano)
 * @property {object} user
 * @property {string} user.name
 * @property {string} user.birthDate
 * @property {'male'|'female'} user.sex
 * @property {number} user.heightCm
 * @property {number} user.weightKg
 * @property {'sedentary'|'light'|'moderate'|'active'|'very_active'} user.activityLevel
 * @property {Goal} user.goal
 * @property {string[]} user.restrictions
 * @property {string} user.nationality
 * @property {object} weekPlanning
 * @property {MealPattern} weekPlanning.mealPattern
 * @property {MealRhythm} weekPlanning.mealRhythmMode
 * @property {number} [weekPlanning.streakDays]
 * @property {Array<{weekday:number,mode:string,nickname?:string}>} weekPlanning.weekdayFlexRules
 * @property {CookingTime} weekPlanning.cookingTime
 * @property {Budget} weekPlanning.budget
 * @property {string} [weekPlanning.weekdayRulesPrompt]
 * @property {string[]} [weekPlanning.activeSlots]
 * @property {object} [expectations]  Umbrales blandos para el score de "usuario promedio"
 * @property {number} [expectations.maxMainDishAppearances]
 * @property {number} [expectations.maxPrepMinutes]
 * @property {number} [expectations.minUniqueMains]
 */

/** @type {ScenarioProfile[]} */
export const SCENARIOS = [
  {
    id: 'ar-promedio-sin-cocina',
    label: 'Argentino promedio · sin cocina',
    persona:
      'Persona de oficina en Argentina, cocina poco, compra en súper de barrio. Quiere que le digan qué comer sin complicarse.',
    user: {
      name: 'Usuario Promedio AR',
      birthDate: '1992-03-20',
      sex: 'male',
      heightCm: 175,
      weightKg: 80,
      activityLevel: 'light',
      goal: 'maintain',
      restrictions: [],
      nationality: 'Argentina',
    },
    weekPlanning: {
      mealPattern: 'four',
      mealRhythmMode: 'balanced',
      streakDays: 3,
      weekdayFlexRules: [
        { weekday: 6, mode: 'maintenance', nickname: 'Edgy' },
        { weekday: 0, mode: 'full_free' },
      ],
      cookingTime: 'rapido',
      budget: 'economico',
      weekdayRulesPrompt:
        'Lunes a viernes normales. Sábado mantenimiento (Edgy). Domingo libre (sin menú).',
      activeSlots: ['desayuno', 'almuerzo', 'cena', 'snack'],
    },
    expectations: {
      maxMainDishAppearances: 3,
      maxPrepMinutes: 20,
      minUniqueMains: 3,
    },
  },
  {
    id: 'ar-ocupado-mealprep',
    label: 'Argentino ocupado · meal prep',
    persona:
      'Trabaja muchas horas. Prefiere cocinar de más un día y repetir, aunque se aburra un poco.',
    user: {
      name: 'Ocupado AR',
      birthDate: '1988-11-02',
      sex: 'female',
      heightCm: 165,
      weightKg: 68,
      activityLevel: 'moderate',
      goal: 'lose',
      restrictions: [],
      nationality: 'Argentina',
    },
    weekPlanning: {
      mealPattern: 'four',
      mealRhythmMode: 'streak',
      streakDays: 3,
      weekdayFlexRules: [
        { weekday: 6, mode: 'maintenance', nickname: 'Edgy' },
        { weekday: 0, mode: 'full_free' },
      ],
      cookingTime: 'normal',
      budget: 'normal',
      weekdayRulesPrompt:
        'Lunes a viernes normales. Sábado mantenimiento. Domingo libre.',
      activeSlots: ['desayuno', 'almuerzo', 'cena', 'snack'],
    },
    expectations: {
      maxMainDishAppearances: 4,
      maxPrepMinutes: 30,
      minUniqueMains: 2,
    },
  },
  {
    id: 'mx-promedio',
    label: 'Mexicano promedio',
    persona: 'Usuario en México, comidas familiares simples, sin técnicas fancy.',
    user: {
      name: 'Usuario MX',
      birthDate: '1995-07-14',
      sex: 'male',
      heightCm: 172,
      weightKg: 78,
      activityLevel: 'moderate',
      goal: 'maintain',
      restrictions: [],
      nationality: 'México',
    },
    weekPlanning: {
      mealPattern: 'four',
      mealRhythmMode: 'balanced',
      streakDays: 3,
      weekdayFlexRules: [{ weekday: 0, mode: 'full_free' }],
      cookingTime: 'rapido',
      budget: 'economico',
      weekdayRulesPrompt: 'Lunes a sábado normales. Domingo libre.',
      activeSlots: ['desayuno', 'almuerzo', 'cena', 'snack'],
    },
    expectations: {
      maxMainDishAppearances: 3,
      maxPrepMinutes: 25,
      minUniqueMains: 3,
    },
  },
  {
    id: 'es-vegetariano',
    label: 'Español vegetariano',
    persona: 'Vive en España, vegetariano, cocina casera básica.',
    user: {
      name: 'Usuario ES Veg',
      birthDate: '1990-01-08',
      sex: 'female',
      heightCm: 168,
      weightKg: 62,
      activityLevel: 'light',
      goal: 'maintain',
      restrictions: ['vegetariano'],
      nationality: 'España',
    },
    weekPlanning: {
      mealPattern: 'three_no_snack',
      mealRhythmMode: 'max_variety',
      weekdayFlexRules: [],
      cookingTime: 'normal',
      budget: 'normal',
      weekdayRulesPrompt: 'Todos los días normales.',
      activeSlots: ['desayuno', 'almuerzo', 'cena'],
    },
    expectations: {
      maxMainDishAppearances: 2,
      maxPrepMinutes: 30,
      minUniqueMains: 4,
    },
  },
  {
    id: 'de-ganar-masa',
    label: 'Alemán · ganar masa',
    persona: 'Usuario en Alemania que busca ganar peso/músculo con platos densos pero factibles.',
    user: {
      name: 'Usuario DE',
      birthDate: '1993-09-30',
      sex: 'male',
      heightCm: 182,
      weightKg: 72,
      activityLevel: 'active',
      goal: 'gain',
      restrictions: [],
      nationality: 'Alemania',
    },
    weekPlanning: {
      mealPattern: 'four',
      mealRhythmMode: 'balanced',
      weekdayFlexRules: [],
      cookingTime: 'normal',
      budget: 'normal',
      weekdayRulesPrompt: 'Todos los días normales.',
      activeSlots: ['desayuno', 'almuerzo', 'cena', 'snack'],
    },
    expectations: {
      maxMainDishAppearances: 3,
      maxPrepMinutes: 35,
      minUniqueMains: 3,
    },
  },
  {
    id: 'uy-estudiante',
    label: 'Uruguayo estudiante · presupuesto bajo',
    persona: 'Estudiante en Uruguay, poco tiempo y plata, cocina mínima.',
    user: {
      name: 'Estudiante UY',
      birthDate: '2003-05-12',
      sex: 'male',
      heightCm: 178,
      weightKg: 70,
      activityLevel: 'sedentary',
      goal: 'maintain',
      restrictions: [],
      nationality: 'Uruguay',
    },
    weekPlanning: {
      mealPattern: 'three_no_snack',
      mealRhythmMode: 'streak',
      streakDays: 2,
      weekdayFlexRules: [{ weekday: 0, mode: 'full_free' }],
      cookingTime: 'rapido',
      budget: 'economico',
      weekdayRulesPrompt: 'Lunes a sábado normales. Domingo libre.',
      activeSlots: ['desayuno', 'almuerzo', 'cena'],
    },
    expectations: {
      maxMainDishAppearances: 4,
      maxPrepMinutes: 15,
      minUniqueMains: 2,
    },
  },
];

export function getScenario(id) {
  return SCENARIOS.find((s) => s.id === id) ?? null;
}

export function listScenarioIds() {
  return SCENARIOS.map((s) => s.id);
}
