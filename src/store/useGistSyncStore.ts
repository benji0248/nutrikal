import { create } from 'zustand';
import type { GistPayload, SyncStatus } from '../types';
import { loadGist, saveGist } from '../services/gistService';
import { useAuthStore } from './useAuthStore';
import { useCalendarStore } from './useCalendarStore';
import { useCalculatorStore } from './useCalculatorStore';
import { useIngredientsStore } from './useIngredientsStore';

const TOKEN_KEY = 'nutrikal-token';
const DEBOUNCE_MS = 1500;
const RETRY_MS = 30_000;

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

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

export const useGistSyncStore = create<GistSyncState>()((set, get) => ({
  syncStatus: 'idle',
  lastSyncedAt: null,
  pendingSync: false,
  syncError: null,

  initialLoad: async () => {
    const auth = useAuthStore.getState();
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !auth.user?.gistId) return;

    set({ syncStatus: 'syncing', syncError: null });
    try {
      const payload = await loadGist(token, auth.user.gistId);
      get().hydrateAllStores(payload);
      set({
        syncStatus: 'success',
        lastSyncedAt: new Date().toISOString(),
        syncError: null,
      });
      setTimeout(() => {
        if (get().syncStatus === 'success') set({ syncStatus: 'idle' });
      }, 2000);
    } catch (err) {
      set({
        syncStatus: 'error',
        syncError: `Error al cargar datos: ${(err as Error).message}`,
      });
      // Fall back to existing localStorage data — don't wipe
    }
  },

  push: async () => {
    const auth = useAuthStore.getState();
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !auth.user?.gistId) return;

    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }

    set({ syncStatus: 'syncing', pendingSync: false, syncError: null });
    try {
      const payload = get().buildPayload();
      await saveGist(token, auth.user.gistId, payload);
      set({
        syncStatus: 'success',
        lastSyncedAt: new Date().toISOString(),
        syncError: null,
      });
      setTimeout(() => {
        if (get().syncStatus === 'success') set({ syncStatus: 'idle' });
      }, 2000);
    } catch (err) {
      set({
        syncStatus: 'error',
        pendingSync: true,
        syncError: (err as Error).message,
      });
      // Schedule retry
      retryTimer = setTimeout(() => {
        if (get().pendingSync) get().push();
      }, RETRY_MS);
    }
  },

  schedulePush: () => {
    // Only sync if authenticated
    const auth = useAuthStore.getState();
    if (auth.authState !== 'authenticated') return;

    set({ pendingSync: true });

    if (!navigator.onLine) {
      set({ syncStatus: 'offline' });
      return;
    }

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      get().push();
    }, DEBOUNCE_MS);
  },

  buildPayload: (): GistPayload => {
    const calendar = useCalendarStore.getState();
    const calculator = useCalculatorStore.getState();
    const ingredients = useIngredientsStore.getState();
    const themeRaw = localStorage.getItem('nutrikal-theme');
    const theme = themeRaw === '"light"' || themeRaw === 'light' ? 'light' : 'dark';

    // Read new stores from localStorage directly to avoid circular imports
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

    // Apply theme
    if (payload.settings?.theme) {
      localStorage.setItem('nutrikal-theme', JSON.stringify(payload.settings.theme));
      document.documentElement.setAttribute('data-theme', payload.settings.theme);
    }
  },
}));

// Online/offline handlers
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    const state = useGistSyncStore.getState();
    if (state.pendingSync) {
      state.push();
    } else {
      useGistSyncStore.setState({ syncStatus: 'idle' });
    }
  });

  window.addEventListener('offline', () => {
    useGistSyncStore.setState({ syncStatus: 'offline' });
  });
}
