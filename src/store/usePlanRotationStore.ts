import { create } from 'zustand';
import type { PlanMemory, WeekPlan } from '../types';
import {
  DEFAULT_PLAN_MEMORY,
  mergeRejectedDishNames,
  normalizePlanMemory,
} from '../services/planRotationMemory';
import { appendPoolHistory, flattenPoolIds } from '../services/ingredientTasteModel';
import * as api from '../services/apiService';

interface PlanRotationState extends PlanMemory {
  hydrate: (data: PlanMemory | null | undefined) => void;
  bumpPoolGeneration: (weekId: string) => number;
  rememberPlan: (plan: WeekPlan) => void;
  rememberWeeklyPool: (pool: {
    structural: string[];
    contextual: string[];
    creative: string[];
  }) => void;
  rememberRejected: (dishName: string) => void;
  getAvoidDishNames: () => string[];
  getRejectedDishNames: () => string[];
  getRecentPoolHistory: () => string[][];
  clear: (options?: { sync?: boolean }) => void;
}

function toPayload(state: PlanMemory): PlanMemory {
  return {
    avoidDishNames: state.avoidDishNames,
    rejectedDishNames: state.rejectedDishNames ?? [],
    poolGeneration: state.poolGeneration,
    lastWeekId: state.lastWeekId,
    recentPoolHistory: state.recentPoolHistory,
  };
}

function syncToServer(snapshot: PlanMemory): void {
  // Skip when logged out — avoids 401 → logout → clear → PUT loop.
  if (!localStorage.getItem('nutrikal-jwt')) return;
  void api.savePlanMemory(snapshot).catch((e) => {
    console.error('Plan memory save error:', e);
  });
}

export const usePlanRotationStore = create<PlanRotationState>()((set, get) => ({
  ...DEFAULT_PLAN_MEMORY,

  hydrate: (data) => {
    set(normalizePlanMemory(data ?? undefined));
  },

  bumpPoolGeneration: (weekId) => {
    const state = get();
    let poolGeneration = state.poolGeneration;
    let lastWeekId = state.lastWeekId;
    if (lastWeekId !== weekId) {
      poolGeneration = 0;
      lastWeekId = weekId;
    }
    poolGeneration += 1;
    const next = { ...state, poolGeneration, lastWeekId };
    set(next);
    syncToServer(toPayload(next));
    return poolGeneration;
  },

  rememberPlan: (_plan) => {
    // Fase 0: evitar que un plan generado termine como restricción negativa.
    // TODO: reemplazar por generatedPlanHistory en una fase posterior.
  },

  rememberWeeklyPool: (pool) => {
    const ids = flattenPoolIds(pool);
    const recentPoolHistory = appendPoolHistory(get().recentPoolHistory, ids);
    const next = { ...get(), recentPoolHistory };
    set(next);
    syncToServer(toPayload(next));
  },

  rememberRejected: (dishName) => {
    const n = dishName.trim();
    if (!n) return;
    const rejectedDishNames = mergeRejectedDishNames(get().rejectedDishNames ?? [], [n]);
    const next = { ...get(), rejectedDishNames };
    set(next);
    syncToServer(toPayload(next));
  },

  getAvoidDishNames: () => get().avoidDishNames,

  getRejectedDishNames: () => get().rejectedDishNames ?? [],

  getRecentPoolHistory: () => get().recentPoolHistory,

  clear: (options) => {
    set({ ...DEFAULT_PLAN_MEMORY });
    if (options?.sync !== false) {
      syncToServer(DEFAULT_PLAN_MEMORY);
    }
  },
}));
