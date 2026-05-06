import { create } from 'zustand';
import * as api from '../services/apiService';
import type { Theme } from '../types';

interface SettingsState {
  showCalories: boolean;
  theme: Theme;
  setShowCalories: (value: boolean) => void;
  hydrateSettings: (settings: { theme: Theme; showCalories: boolean }) => void;
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  showCalories: false,
  theme: 'dark',

  setShowCalories: (value: boolean) => {
    set({ showCalories: value });
    api.saveSettings({ showCalories: value }).catch(console.error);
  },

  hydrateSettings: (settings) => {
    set({
      showCalories: settings.showCalories,
      theme: settings.theme as Theme,
    });
    document.documentElement.setAttribute('data-theme', settings.theme);
    localStorage.setItem('nutrikal-theme', JSON.stringify(settings.theme));
  },
}));
