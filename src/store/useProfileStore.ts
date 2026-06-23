import { create } from 'zustand';
import type { UserProfile, MetabolicResult } from '../types';
import { computeMetabolism } from '../services/metabolicService';
import * as api from '../services/apiService';

interface ProfileState {
  profile: UserProfile | null;
  saveError: string | null;

  setProfile: (profile: UserProfile) => void;
  persistProfile: (profile: UserProfile) => Promise<boolean>;
  updateProfile: (partial: Partial<UserProfile>) => void;
  getMetabolicResult: () => MetabolicResult | null;
  needsRecalibration: () => boolean;
  markRecalibrated: () => void;
  hydrateProfile: (profile: UserProfile | null) => void;
  clearSaveError: () => void;
}

async function saveInBackground(
  profile: UserProfile,
  set: (partial: Partial<ProfileState>) => void,
) {
  try {
    await api.saveProfile(profile);
    set({ saveError: null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al guardar perfil';
    set({ saveError: msg });
    console.error('Profile save error:', e);
  }
}

export const useProfileStore = create<ProfileState>()((set, get) => ({
  profile: null,
  saveError: null,

  setProfile: (profile: UserProfile) => {
    set({ profile });
    void saveInBackground(profile, set);
  },

  persistProfile: async (profile: UserProfile) => {
    set({ profile, saveError: null });
    try {
      await api.saveProfile(profile);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar perfil';
      set({ saveError: msg });
      console.error('Profile save error:', e);
      return false;
    }
  },

  updateProfile: (partial: Partial<UserProfile>) => {
    const current = get().profile;
    if (!current) return;
    const updated = { ...current, ...partial, updatedAt: new Date().toISOString() };
    set({ profile: updated });
    void saveInBackground(updated, set);
  },

  getMetabolicResult: (): MetabolicResult | null => {
    const { profile } = get();
    if (!profile) return null;
    return computeMetabolism(profile);
  },

  needsRecalibration: (): boolean => {
    const { profile } = get();
    if (!profile) return false;
    const last = new Date(profile.lastRecalibration);
    const now = new Date();
    const diffDays = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 30;
  },

  markRecalibrated: () => {
    const current = get().profile;
    if (!current) return;
    const updated = {
      ...current,
      lastRecalibration: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set({ profile: updated });
    void saveInBackground(updated, set);
  },

  hydrateProfile: (profile) => {
    set({ profile });
  },

  clearSaveError: () => {
    set({ saveError: null });
  },
}));
