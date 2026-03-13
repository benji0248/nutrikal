import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, MetabolicResult, ActivityEntry } from '../types';
import { computeMetabolism } from '../services/metabolicService';
import { generateId } from '../utils/dateHelpers';

interface ProfileState {
  profile: UserProfile | null;
  activityLog: ActivityEntry[];

  setProfile: (profile: UserProfile) => void;
  updateProfile: (partial: Partial<UserProfile>) => void;
  clearProfile: () => void;
  getMetabolicResult: () => MetabolicResult | null;
  needsRecalibration: () => boolean;
  markRecalibrated: () => void;
  addActivity: (entry: Omit<ActivityEntry, 'id'>) => void;
  removeActivity: (id: string) => void;
  getActivitiesForDate: (date: string) => ActivityEntry[];
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      activityLog: [],

      setProfile: (profile: UserProfile) => {
        set({ profile });
        // Trigger sync
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

      clearProfile: () => set({ profile: null, activityLog: [] }),

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

      addActivity: (entry) => {
        const newEntry: ActivityEntry = { ...entry, id: generateId() };
        set((s) => ({ activityLog: [...s.activityLog, newEntry] }));
        import('./useGistSyncStore').then(({ useGistSyncStore }) =>
          useGistSyncStore.getState().schedulePush(),
        );
      },

      removeActivity: (id) => {
        set((s) => ({ activityLog: s.activityLog.filter((a) => a.id !== id) }));
        import('./useGistSyncStore').then(({ useGistSyncStore }) =>
          useGistSyncStore.getState().schedulePush(),
        );
      },

      getActivitiesForDate: (date: string): ActivityEntry[] => {
        return get().activityLog.filter((a) => a.date === date);
      },
    }),
    {
      name: 'nutrikal-profile',
      partialize: (state) => ({
        profile: state.profile,
        activityLog: state.activityLog,
      }),
    },
  ),
);
