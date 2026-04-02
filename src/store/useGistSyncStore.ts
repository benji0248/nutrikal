import { create } from 'zustand';
import type { AppPayload, SyncStatus } from '../types';
import { loadUserData, saveUserData } from '../services/apiService';
import { migratePayload } from '../utils/migratePayload';
import { useCalendarStore } from './useCalendarStore';
import { useCalculatorStore } from './useCalculatorStore';
import { useIngredientsStore } from './useIngredientsStore';

const JWT_KEY = 'nutrikal-jwt';
const DEBOUNCE_MS = 1500;
const SUCCESS_RESET_MS = 2000;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let successTimer: ReturnType<typeof setTimeout> | null = null;

function getToken(): string | null {
  return localStorage.getItem(JWT_KEY);
}

interface SyncState {
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  pendingSync: boolean;
  syncError: string | null;

  initialLoad: () => Promise<void>;
  push: () => Promise<void>;
  schedulePush: () => void;
  buildPayload: () => AppPayload;
  hydrateAllStores: (payload: AppPayload) => void;
}

export const useGistSyncStore = create<SyncState>()((set, get) => ({
  syncStatus: 'idle',
  lastSyncedAt: null,
  pendingSync: false,
  syncError: null,

  initialLoad: async () => {
    const token = getToken();
    if (!token) return;

    try {
      const { data: serverData, updatedAt } = await loadUserData(token);
      const localPayload = get().buildPayload();

      if (serverData && updatedAt) {
        const serverPayload = migratePayload(serverData);
        const serverTime = new Date(updatedAt).getTime();
        const localTime = new Date(localPayload.lastModified).getTime();

        if (serverTime >= localTime) {
          // Server is newer or equal — hydrate local stores
          get().hydrateAllStores(serverPayload);
          set({ lastSyncedAt: updatedAt });
        } else {
          // Local is newer — push to server
          await get().push();
        }
      } else {
        // No server data — push local data up (migration for existing users)
        const hasLocalData = Object.keys(localPayload.dayPlans).length > 0
          || localPayload.savedRecipes.length > 0
          || localPayload.customIngredients.length > 0
          || localPayload.profile != null;

        if (hasLocalData) {
          await get().push();
        }
      }
    } catch {
      // Silently fail on initial load — user can still work offline
      set({ syncStatus: 'offline', pendingSync: true });
    }
  },

  push: async () => {
    const token = getToken();
    if (!token) return;

    set({ syncStatus: 'syncing', syncError: null });

    try {
      const payload = get().buildPayload();
      await saveUserData(token, payload);

      const now = new Date().toISOString();
      set({ syncStatus: 'success', lastSyncedAt: now, pendingSync: false, syncError: null });

      // Reset to idle after brief success display
      if (successTimer) clearTimeout(successTimer);
      successTimer = setTimeout(() => {
        if (get().syncStatus === 'success') {
          set({ syncStatus: 'idle' });
        }
      }, SUCCESS_RESET_MS);
    } catch (err) {
      const isOffline = err instanceof TypeError
        || (err as { message?: string }).message?.includes('fetch');

      if (isOffline) {
        set({ syncStatus: 'offline', pendingSync: true, syncError: 'Sin conexión' });
      } else {
        set({ syncStatus: 'error', pendingSync: true, syncError: (err as Error).message });
      }
    }
  },

  schedulePush: () => {
    set({ pendingSync: true });

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      get().push();
    }, DEBOUNCE_MS);
  },

  buildPayload: (): AppPayload => {
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

    let customDishes: AppPayload['customDishes'] = [];
    try {
      const recipesRaw = localStorage.getItem('nutrikal-recipes');
      if (recipesRaw) {
        const parsed = JSON.parse(recipesRaw);
        customDishes = parsed?.state?.customDishes ?? [];
      }
    } catch { /* ignore */ }

    let favoriteDishes: string[] = [];
    try {
      const historialRaw = localStorage.getItem('nutrikal-historial');
      if (historialRaw) {
        const parsed = JSON.parse(historialRaw);
        favoriteDishes = parsed?.state?.favorites ?? [];
      }
    } catch { /* ignore */ }

    let profile: AppPayload['profile'];
    let shoppingLists: AppPayload['shoppingLists'] = [];
    try {
      const profileRaw = localStorage.getItem('nutrikal-profile');
      if (profileRaw) {
        const parsed = JSON.parse(profileRaw);
        profile = parsed?.state?.profile ?? undefined;
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
      savedRecipes: calculator.savedRecipes,
      customIngredients: ingredients.customIngredients,
      notifications: calendar.notifications,
      settings: {
        theme: theme as 'dark' | 'light',
        showCalories,
      },
      profile,
      shoppingLists,
      customDishes,
      favoriteDishes,
    };
  },

  hydrateAllStores: (payload: AppPayload) => {
    useCalendarStore.setState({
      dayPlans: payload.dayPlans,
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
    import('./useRecipesStore').then(({ useRecipesStore }) => {
      useRecipesStore.setState({
        customDishes: payload.customDishes ?? [],
      });
    });
    import('./useHistorialStore').then(({ useHistorialStore }) => {
      useHistorialStore.setState({
        favorites: payload.favoriteDishes ?? [],
      });
    });

    // Apply theme
    if (payload.settings?.theme) {
      localStorage.setItem('nutrikal-theme', JSON.stringify(payload.settings.theme));
      document.documentElement.setAttribute('data-theme', payload.settings.theme);
    }
  },
}));
