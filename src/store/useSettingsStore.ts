import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useGistSyncStore } from './useGistSyncStore';

interface SettingsState {
  showCalories: boolean;
  setShowCalories: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      showCalories: false,

      setShowCalories: (value: boolean) => {
        set({ showCalories: value });
        useGistSyncStore.getState().schedulePush();
      },
    }),
    {
      name: 'nutrikal-settings',
    },
  ),
);
