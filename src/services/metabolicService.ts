import type {
  UserProfile,
  MetabolicResult,
  EnergyLevel,
  ActivityLevel,
  Goal,
} from '../types';

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

/**
 * Mifflin-St Jeor BMR formula.
 * Male:   10 * weight(kg) + 6.25 * height(cm) - 5 * age(y) + 5
 * Female: 10 * weight(kg) + 6.25 * height(cm) - 5 * age(y) - 161
 */
function computeBMR(profile: UserProfile): number {
  const age = getAge(profile.birthDate);
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * age;
  return profile.sex === 'male' ? base + 5 : base - 161;
}

function getAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function computeMetabolism(profile: UserProfile): MetabolicResult {
  const bmr = computeBMR(profile);
  const tdee = bmr * ACTIVITY_MULTIPLIERS[profile.activityLevel];
  const budget = Math.max(1200, tdee + GOAL_OFFSETS[profile.goal]);

  // Macro split: 30% protein, 40% carbs, 30% fat
  const proteinCals = budget * 0.3;
  const carbsCals = budget * 0.4;
  const fatCals = budget * 0.3;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    budget: Math.round(budget),
    macroSplit: {
      protein: Math.round(proteinCals / 4), // 4 cal/g
      carbs: Math.round(carbsCals / 4),     // 4 cal/g
      fat: Math.round(fatCals / 9),         // 9 cal/g
    },
  };
}

/**
 * Returns the energy level color based on consumed vs budget ratio.
 * green: 0–70%, amber: 70–90%, warm_orange: 90%+
 * NEVER red, NEVER numbers shown to user.
 */
export function getEnergyLevel(consumedCalories: number, budget: number): EnergyLevel {
  if (budget <= 0) return 'green';
  const ratio = consumedCalories / budget;
  if (ratio < 0.7) return 'green';
  if (ratio < 0.9) return 'amber';
  return 'warm_orange';
}

/**
 * Returns the ratio 0–1+ of consumed vs budget (internal use only).
 */
export function getEnergyRatio(consumedCalories: number, budget: number): number {
  if (budget <= 0) return 0;
  return Math.min(consumedCalories / budget, 1);
}
