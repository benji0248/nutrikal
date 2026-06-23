/** Server-side metabolic math (mirrors src/services/metabolicService.ts). */

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose' | 'maintain' | 'gain';
export type Sex = 'male' | 'female';
export type MealType = 'desayuno' | 'almuerzo' | 'cena' | 'snack';
export type MealPattern = 'four' | 'three_no_snack' | 'no_breakfast' | 'two_main';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_OFFSETS: Record<Goal, number> = {
  lose: -500,
  maintain: 0,
  gain: 350,
};

const SLOT_PERCENTAGES: Record<MealType, number> = {
  desayuno: 0.25,
  almuerzo: 0.35,
  cena: 0.30,
  snack: 0.10,
};

const PATTERN_SLOT_PCTS: Record<MealPattern, Partial<Record<MealType, number>>> = {
  four: { desayuno: 0.25, almuerzo: 0.35, cena: 0.30, snack: 0.10 },
  three_no_snack: { desayuno: 0.28, almuerzo: 0.40, cena: 0.32 },
  no_breakfast: { almuerzo: 0.45, cena: 0.40, snack: 0.15 },
  two_main: { almuerzo: 0.50, cena: 0.50 },
};

export function getActiveMealSlots(pattern: MealPattern): MealType[] {
  const pcts = PATTERN_SLOT_PCTS[pattern];
  return (Object.keys(pcts) as MealType[]).filter((mt) => (pcts[mt] ?? 0) > 0);
}

export function getMealSlotBudgetForPattern(
  dailyBudget: number,
  mealType: MealType,
  pattern: MealPattern,
): number {
  const pct = PATTERN_SLOT_PCTS[pattern][mealType];
  if (pct == null || pct <= 0) return 0;
  return Math.floor(dailyBudget * pct);
}

export interface MetabolicProfile {
  birthDate: string;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}

function getAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function computeBMR(profile: MetabolicProfile): number {
  const age = getAge(profile.birthDate);
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * age;
  return profile.sex === 'male' ? base + 5 : base - 161;
}

export function computeDailyBudget(profile: MetabolicProfile): number {
  const bmr = computeBMR(profile);
  const tdee = bmr * ACTIVITY_MULTIPLIERS[profile.activityLevel];
  return Math.max(1200, Math.round(tdee + GOAL_OFFSETS[profile.goal]));
}

/** Calorías de mantenimiento (sin déficit ni superávit de objetivo). */
export function computeMaintenanceBudget(profile: MetabolicProfile): number {
  return computeDailyBudget({ ...profile, goal: 'maintain' });
}

export function getMealSlotBudget(
  dailyBudget: number,
  mealType: MealType,
  pattern: MealPattern = 'four',
): number {
  if (pattern !== 'four') {
    return getMealSlotBudgetForPattern(dailyBudget, mealType, pattern);
  }
  return Math.floor(dailyBudget * SLOT_PERCENTAGES[mealType]);
}

export function isMealType(value: string): value is MealType {
  return value === 'desayuno' || value === 'almuerzo' || value === 'cena' || value === 'snack';
}

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  desayuno: 'desayuno',
  almuerzo: 'almuerzo',
  cena: 'cena',
  snack: 'merienda',
};

export function mealTypeLabel(mealType: MealType): string {
  return MEAL_TYPE_LABELS[mealType];
}
