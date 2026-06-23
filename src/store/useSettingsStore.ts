import { create } from 'zustand';
import * as api from '../services/apiService';
import type { Theme } from '../types';

const USE_GRAMS_KEY = 'nutrikal-use-grams';

function readUseGramsFromStorage(): boolean | null {
  const stored = localStorage.getItem(USE_GRAMS_KEY);
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  return null;
}

interface SettingsState {
  showCalories: boolean;
  useGrams: boolean;
  theme: Theme;
  setShowCalories: (value: boolean) => void;
  setUseGrams: (value: boolean) => void;
  hydrateSettings: (settings: { theme: Theme; showCalories: boolean; useGrams?: boolean }) => void;
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  showCalories: false,
  useGrams: readUseGramsFromStorage() ?? false,
  theme: 'dark',

  setShowCalories: (value: boolean) => {
    set({ showCalories: value });
    api.saveSettings({ showCalories: value }).catch(console.error);
  },

  setUseGrams: (value: boolean) => {
    localStorage.setItem(USE_GRAMS_KEY, String(value));
    set({ useGrams: value });
    api.saveSettings({ useGrams: value }).catch((err) => {
      console.error('useGrams save failed (¿corriste sql/002_add_use_grams.sql?):', err);
    });
  },

  hydrateSettings: (settings) => {
    const storedUseGrams = readUseGramsFromStorage();
    const useGrams = storedUseGrams ?? settings.useGrams ?? false;

    if (storedUseGrams === null && settings.useGrams !== undefined) {
      localStorage.setItem(USE_GRAMS_KEY, String(settings.useGrams));
    }

    set({
      showCalories: settings.showCalories,
      useGrams,
      theme: settings.theme as Theme,
    });
    document.documentElement.setAttribute('data-theme', settings.theme);
    localStorage.setItem('nutrikal-theme', JSON.stringify(settings.theme));
  },
}));
