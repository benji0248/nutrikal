import type { PlanMemory, WeekPlan } from '../types';
import { MEAL_TYPE_ORDER } from '../types';

const MAX_AVOID_NAMES = 96;

const MAX_POOL_HISTORY = 5;

export const DEFAULT_PLAN_MEMORY: PlanMemory = {
  avoidDishNames: [],
  poolGeneration: 0,
  lastWeekId: null,
  recentPoolHistory: [],
};

export function normalizePlanMemory(raw: Partial<PlanMemory> | null | undefined): PlanMemory {
  if (!raw) return { ...DEFAULT_PLAN_MEMORY };
  const history = Array.isArray(raw.recentPoolHistory)
    ? raw.recentPoolHistory
        .filter((p): p is string[] => Array.isArray(p))
        .map((p) => p.filter((id) => typeof id === 'string' && id.trim().length > 0))
        .slice(-MAX_POOL_HISTORY)
    : [];
  return {
    avoidDishNames: mergeAvoidDishNames(raw.avoidDishNames ?? []),
    poolGeneration:
      typeof raw.poolGeneration === 'number' && raw.poolGeneration >= 0
        ? Math.floor(raw.poolGeneration)
        : 0,
    lastWeekId: typeof raw.lastWeekId === 'string' ? raw.lastWeekId : null,
    recentPoolHistory: history,
  };
}

/** Nombres de platos en un plan (preview o aplicado). */
export function collectDishNamesFromWeekPlan(plan: WeekPlan | null | undefined): string[] {
  if (!plan) return [];
  const names: string[] = [];
  for (const day of plan.days) {
    for (const mt of MEAL_TYPE_ORDER) {
      const name = day.meals[mt]?.name?.trim();
      if (name) names.push(name);
    }
  }
  return names;
}

export function mergeAvoidDishNames(...groups: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const group of groups) {
    for (const raw of group) {
      const n = raw.trim();
      if (!n || seen.has(n)) continue;
      seen.add(n);
      out.push(n);
    }
  }
  return out.slice(-MAX_AVOID_NAMES);
}
