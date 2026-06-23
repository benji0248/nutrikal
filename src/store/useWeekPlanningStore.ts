import { create } from 'zustand';
import type { WeekPlanningProfile } from '../types';
import { DEFAULT_WEEK_PLANNING } from '../types';
import { normalizeWeekPlanningProfile } from '../utils/flexDayHelpers';
import * as api from '../services/apiService';

interface WeekPlanningState {
  weekPlanning: WeekPlanningProfile | null;
  saveError: string | null;

  hydrateWeekPlanning: (data: WeekPlanningProfile | null) => void;
  persistWeekPlanning: (profile: WeekPlanningProfile) => Promise<boolean>;
  hasWeekPlanningProfile: () => boolean;
  clearSaveError: () => void;
}

export const useWeekPlanningStore = create<WeekPlanningState>()((set, get) => ({
  weekPlanning: null,
  saveError: null,

  hydrateWeekPlanning: (data) => {
    set({
      weekPlanning: data ? normalizeWeekPlanningProfile(data) : null,
      saveError: null,
    });
  },

  persistWeekPlanning: async (profile) => {
    const normalized = normalizeWeekPlanningProfile(profile);
    set({ weekPlanning: normalized, saveError: null });
    try {
      await api.saveWeekPlanning(normalized);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar rutina';
      set({ saveError: msg });
      console.error('Week planning save error:', e);
      return false;
    }
  },

  hasWeekPlanningProfile: () => {
    const wp = get().weekPlanning;
    return !!wp?.completedAt;
  },

  clearSaveError: () => set({ saveError: null }),
}));

export function createDefaultWeekPlanningProfile(): WeekPlanningProfile {
  return {
    ...DEFAULT_WEEK_PLANNING,
    completedAt: new Date().toISOString(),
  };
}
