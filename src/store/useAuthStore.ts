import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthState, GistUser } from '../types';
import {
  validateToken,
  findOrCreateGist,
  GistAuthError,
} from '../services/gistService';

const TOKEN_KEY = 'nutrikal-token';

interface AuthStoreState {
  user: GistUser | null;
  authState: AuthState;
  error: string | null;

  login: (token: string) => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      user: null,
      authState: 'unauthenticated',
      error: null,

      login: async (token: string) => {
        set({ authState: 'authenticating', error: null });
        try {
          const validatedUser = await validateToken(token);
          const gistId = await findOrCreateGist(token);
          localStorage.setItem(TOKEN_KEY, token);
          const user: GistUser = { ...validatedUser, gistId };
          set({ user, authState: 'authenticated' });

          // Trigger initial load from gist (lazy import to avoid circular)
          const { useGistSyncStore } = await import('./useGistSyncStore');
          await useGistSyncStore.getState().initialLoad();
        } catch (err) {
          localStorage.removeItem(TOKEN_KEY);
          let message = 'Error inesperado. Intentá de nuevo';
          if (err instanceof GistAuthError) {
            message = err.message;
          } else if (
            err instanceof TypeError ||
            (err as { message?: string }).message?.includes('fetch')
          ) {
            message = 'Sin conexión. Verificá tu internet';
          }
          set({ authState: 'error', error: message, user: null });
        }
      },

      logout: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('nutrikal-auth');
        localStorage.removeItem('nutrikal-calendar');
        localStorage.removeItem('nutrikal-calculator');
        localStorage.removeItem('nutrikal-ingredients');
        localStorage.removeItem('nutrikal-profile');
        localStorage.removeItem('nutrikal-shopping');
        set({ user: null, authState: 'unauthenticated', error: null });
        // Reset data stores
        import('./useCalendarStore').then(({ useCalendarStore }) =>
          useCalendarStore.setState({ dayPlans: {}, weekTemplates: [], notifications: [] }),
        );
        import('./useCalculatorStore').then(({ useCalculatorStore }) =>
          useCalculatorStore.setState({ savedRecipes: [], entries: [] }),
        );
        import('./useIngredientsStore').then(({ useIngredientsStore }) =>
          useIngredientsStore.setState({ customIngredients: [] }),
        );
        import('./useProfileStore').then(({ useProfileStore }) =>
          useProfileStore.setState({ profile: null, activityLog: [] }),
        );
        import('./useShoppingStore').then(({ useShoppingStore }) =>
          useShoppingStore.setState({ lists: [] }),
        );
      },

      restoreSession: async () => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
          set({ authState: 'unauthenticated' });
          return;
        }
        try {
          await get().login(token);
        } catch {
          localStorage.removeItem(TOKEN_KEY);
          set({ authState: 'unauthenticated', error: null, user: null });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'nutrikal-auth',
      partialize: (state) => ({
        user: state.user
          ? { login: state.user.login, name: state.user.name, avatarUrl: state.user.avatarUrl, gistId: state.user.gistId }
          : null,
      }),
    },
  ),
);
