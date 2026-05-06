import { create } from 'zustand';
import type { UserProfile, MetabolicResult } from '../types';
import { computeMetabolism } from '../services/metabolicService';
import * as api from '../services/apiService';

interface ProfileState {
  profile: UserProfile | null;

  setProfile: (profile: UserProfile) => void;
  updateProfile: (partial: Partial<UserProfile>) => void;
  getMetabolicResult: () => MetabolicResult | null;
  needsRecalibration: () => boolean;
  markRecalibrated: () => void;
  hydrateProfile: (profile: UserProfile | null) => void;
}

export const useProfileStore = create<ProfileState>()((set, get) => ({
  profile: null,

  setProfile: (profile: UserProfile) => {
    set({ profile });
    api.saveProfile(profile).catch(console.error);
  },

  updateProfile: (partial: Partial<UserProfile>) => {
    const current = get().profile;
    if (!current) return;
    const updated = { ...current, ...partial, updatedAt: new Date().toISOString() };
    set({ profile: updated });
    api.saveProfile(updated).catch(console.error);
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
    api.saveProfile(updated).catch(console.error);
  },

  hydrateProfile: (profile) => {
    set({ profile });
  },
}));
