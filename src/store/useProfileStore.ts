import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, MetabolicResult } from '../types';
import { computeMetabolism } from '../services/metabolicService';

interface ProfileState {
  profile: UserProfile | null;

  setProfile: (profile: UserProfile) => void;
  updateProfile: (partial: Partial<UserProfile>) => void;
  clearProfile: () => void;
  getMetabolicResult: () => MetabolicResult | null;
  needsRecalibration: () => boolean;
  markRecalibrated: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,

      setProfile: (profile: UserProfile) => {
        set({ profile });
        import('./useGistSyncStore').then(({ useGistSyncStore }) =>
          useGistSyncStore.getState().schedulePush(),
        );
      },

      updateProfile: (partial: Partial<UserProfile>) => {
        const current = get().profile;
        if (!current) return;
        const updated = { ...current, ...partial, updatedAt: new Date().toISOString() };
        set({ profile: updated });
        import('./useGistSyncStore').then(({ useGistSyncStore }) =>
          useGistSyncStore.getState().schedulePush(),
        );
      },

      clearProfile: () => set({ profile: null }),

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
        set({
          profile: {
            ...current,
            lastRecalibration: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
        import('./useGistSyncStore').then(({ useGistSyncStore }) =>
          useGistSyncStore.getState().schedulePush(),
        );
      },
    }),
    {
      name: 'nutrikal-profile',
      partialize: (state) => ({
        profile: state.profile,
      }),
    },
  ),
);
