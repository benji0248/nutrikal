import { create } from 'zustand';
import * as api from '../services/apiService';
import type { Theme } from '../types';

interface SettingsState {
  showCalories: boolean;
  theme: Theme;
  isLoading: boolean;
  setShowCalories: (value: boolean) => void;
  setTheme: (theme: Theme) => void;
  hydrateSettings: (settings: { theme: Theme; showCalories: boolean }) => void;
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  showCalories: false,
  theme: 'dark',
  isLoading: false,

  setShowCalories: (value: boolean) => {
    set({ showCalories: value });
    api.saveSettings({ showCalories: value }).catch(console.error);
  },

  setTheme: (theme: Theme) => {
    set({ theme });
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nutrikal-theme', JSON.stringify(theme));
    api.saveSettings({ theme }).catch(console.error);
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
