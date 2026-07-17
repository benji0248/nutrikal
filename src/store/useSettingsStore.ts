import { create } from 'zustand';
import * as api from '../services/apiService';
import type { Theme } from '../types';

const USE_GRAMS_KEY = 'nutrikal-use-grams';

function writeUseGramsToStorage(value: boolean): void {
  localStorage.setItem(USE_GRAMS_KEY, String(value));
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
  useGrams: false,
  theme: 'dark',

  setShowCalories: (value: boolean) => {
    set({ showCalories: value });
    api.saveSettings({ showCalories: value }).catch(console.error);
  },

  setUseGrams: (value: boolean) => {
    writeUseGramsToStorage(value);
    set({ useGrams: value });
    api.saveSettings({ useGrams: value }).catch((err) => {
      console.error('useGrams save failed (¿corriste sql/002_add_use_grams.sql?):', err);
    });
  },

  hydrateSettings: (settings) => {
    // API / batch-load es la fuente de verdad; localStorage solo cachea.
    const useGrams = settings.useGrams ?? false;
    writeUseGramsToStorage(useGrams);

    set({
      showCalories: settings.showCalories ?? false,
      useGrams,
      theme: settings.theme as Theme,
    });
    document.documentElement.setAttribute('data-theme', settings.theme);
    localStorage.setItem('nutrikal-theme', JSON.stringify(settings.theme));
  },
}));
