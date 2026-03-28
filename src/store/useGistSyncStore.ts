import { create } from 'zustand';
import type { GistPayload, SyncStatus } from '../types';
import { useCalendarStore } from './useCalendarStore';
import { useCalculatorStore } from './useCalculatorStore';
import { useIngredientsStore } from './useIngredientsStore';

interface GistSyncState {
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  pendingSync: boolean;
  syncError: string | null;

  initialLoad: () => Promise<void>;
  push: () => Promise<void>;
  schedulePush: () => void;
  buildPayload: () => GistPayload;
  hydrateAllStores: (payload: GistPayload) => void;
}

export const useGistSyncStore = create<GistSyncState>()(() => ({
  syncStatus: 'idle',
  lastSyncedAt: null,
  pendingSync: false,
  syncError: null,

  // Gist sync disabled — data lives in localStorage only
  initialLoad: async () => {
    // no-op: Gist sync disabled
  },

  push: async () => {
    // no-op: Gist sync disabled
  },

  schedulePush: () => {
    // no-op: Gist sync disabled
  },

  buildPayload: (): GistPayload => {
    const calendar = useCalendarStore.getState();
    const calculator = useCalculatorStore.getState();
    const ingredients = useIngredientsStore.getState();
    const themeRaw = localStorage.getItem('nutrikal-theme');
    const theme = themeRaw === '"light"' || themeRaw === 'light' ? 'light' : 'dark';

    // Read new stores from localStorage directly to avoid circular imports
    let showCalories = false;
    try {
      const settingsRaw = localStorage.getItem('nutrikal-settings');
      if (settingsRaw) {
        const parsed = JSON.parse(settingsRaw);
        showCalories = parsed?.state?.showCalories ?? false;
      }
    } catch { /* ignore */ }

    let profile: GistPayload['profile'];
    let shoppingLists: GistPayload['shoppingLists'] = [];
    let activityLog: GistPayload['activityLog'] = [];
    try {
      const profileRaw = localStorage.getItem('nutrikal-profile');
      if (profileRaw) {
        const parsed = JSON.parse(profileRaw);
        profile = parsed?.state?.profile ?? undefined;
        activityLog = parsed?.state?.activityLog ?? [];
      }
    } catch { /* ignore */ }
    try {
      const shoppingRaw = localStorage.getItem('nutrikal-shopping');
      if (shoppingRaw) {
        const parsed = JSON.parse(shoppingRaw);
        shoppingLists = parsed?.state?.lists ?? [];
      }
    } catch { /* ignore */ }

    return {
      version: 1,
      lastModified: new Date().toISOString(),
      dayPlans: calendar.dayPlans,
      weekTemplates: calendar.weekTemplates,
      savedRecipes: calculator.savedRecipes,
      customIngredients: ingredients.customIngredients,
      notifications: calendar.notifications,
      settings: {
        waterGoalDefault: 8,
        theme: theme as 'dark' | 'light',
        showCalories,
      },
      profile,
      shoppingLists,
      activityLog,
    };
  },

  hydrateAllStores: (payload: GistPayload) => {
    useCalendarStore.setState({
      dayPlans: payload.dayPlans,
      weekTemplates: payload.weekTemplates,
      notifications: payload.notifications,
    });
    useCalculatorStore.setState({
      savedRecipes: payload.savedRecipes,
    });
    useIngredientsStore.setState({
      customIngredients: payload.customIngredients,
    });

    // Hydrate new stores
    import('./useProfileStore').then(({ useProfileStore }) => {
      useProfileStore.setState({
        profile: payload.profile ?? null,
        activityLog: payload.activityLog ?? [],
      });
    });
    import('./useShoppingStore').then(({ useShoppingStore }) => {
      useShoppingStore.setState({
        lists: payload.shoppingLists ?? [],
      });
    });
    import('./useSettingsStore').then(({ useSettingsStore }) => {
      useSettingsStore.setState({
        showCalories: payload.settings?.showCalories ?? false,
      });
    });

    // Apply theme
    if (payload.settings?.theme) {
      localStorage.setItem('nutrikal-theme', JSON.stringify(payload.settings.theme));
      document.documentElement.setAttribute('data-theme', payload.settings.theme);
    }
  },
}));

