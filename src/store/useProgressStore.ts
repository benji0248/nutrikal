import { create } from 'zustand';
import type {
  BodyCheckIn,
  PeriodExperience,
  ProgressCheckInSource,
  ProgressReading,
} from '../types';
import * as api from '../services/apiService';
import { buildProgressReading } from '../services/progressCopy';
import { getCheckInPromptLevel } from '../services/progressEngine';
import { useProfileStore } from './useProfileStore';

const SEEN_INSIGHT_KEY = 'nutrikal-progress-insight-seen';

interface AddCheckInInput {
  weightKg: number;
  periodExperience?: PeriodExperience;
  source: ProgressCheckInSource;
}

interface ProgressStateStore {
  checkIns: BodyCheckIn[];
  isSaving: boolean;
  saveError: string | null;
  hydrateCheckIns: (checkIns: BodyCheckIn[]) => void;
  addCheckIn: (input: AddCheckInInput) => Promise<boolean>;
  getReading: () => ProgressReading | null;
  getPromptLevel: () => 'none' | 'soft' | 'hard';
  shouldSurfaceReading: () => boolean;
  markReadingSeen: (insightId: string) => void;
  clearSaveError: () => void;
}

export const useProgressStore = create<ProgressStateStore>()((set, get) => ({
  checkIns: [],
  isSaving: false,
  saveError: null,

  hydrateCheckIns: (checkIns) => {
    set({
      checkIns: [...checkIns].sort(
        (a, b) =>
          new Date(a.recordedAt).getTime() -
          new Date(b.recordedAt).getTime(),
      ),
      saveError: null,
    });
  },

  addCheckIn: async (input) => {
    if (!Number.isFinite(input.weightKg) || input.weightKg <= 0) {
      set({ saveError: 'Ingresá un peso válido.' });
      return false;
    }

    set({ isSaving: true, saveError: null });
    try {
      const result = await api.createProgressCheckIn(input);
      set((state) => ({
        checkIns: [...state.checkIns, result.checkIn].sort(
          (a, b) =>
            new Date(a.recordedAt).getTime() -
            new Date(b.recordedAt).getTime(),
        ),
        isSaving: false,
      }));
      useProfileStore.getState().hydrateProfile(result.profile);
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No pudimos guardar el check-in.';
      set({ isSaving: false, saveError: message });
      return false;
    }
  },

  getReading: () => {
    const profile = useProfileStore.getState().profile;
    if (!profile) return null;
    return buildProgressReading(get().checkIns, profile.goal);
  },

  getPromptLevel: () => getCheckInPromptLevel(get().checkIns),

  shouldSurfaceReading: () => {
    const reading = get().getReading();
    if (!reading) return false;
    return localStorage.getItem(SEEN_INSIGHT_KEY) !== reading.insightId;
  },

  markReadingSeen: (insightId) => {
    localStorage.setItem(SEEN_INSIGHT_KEY, insightId);
  },

  clearSaveError: () => set({ saveError: null }),
}));
