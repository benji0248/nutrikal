import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthState, AppUser, AuthView } from '../types';
import {
  login as apiLogin,
  register as apiRegister,
  validateSession,
  ApiAuthError,
} from '../services/apiService';

const JWT_KEY = 'nutrikal-jwt';

interface AuthStoreState {
  user: AppUser | null;
  authState: AuthState;
  authView: AuthView;
  error: string | null;
  errorField: string | undefined;

  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<void>;
  setAuthView: (view: AuthView) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set) => ({
      user: null,
      authState: 'unauthenticated',
      authView: 'login',
      error: null,
      errorField: undefined,

      login: async (identifier: string, password: string) => {
        set({ authState: 'authenticating', error: null, errorField: undefined });
        try {
          const { token, user } = await apiLogin(identifier, password);
          localStorage.setItem(JWT_KEY, token);
          set({ user, authState: 'authenticated' });
        } catch (err) {
          handleAuthError(err, set);
        }
      },

      register: async (username: string, email: string, password: string, displayName?: string) => {
        set({ authState: 'authenticating', error: null, errorField: undefined });
        try {
          const { token, user } = await apiRegister(username, email, password, displayName);
          localStorage.setItem(JWT_KEY, token);
          set({ user, authState: 'authenticated' });
        } catch (err) {
          handleAuthError(err, set);
        }
      },

      logout: () => {
        // Clear JWT
        localStorage.removeItem(JWT_KEY);
        // Clear all nutrikal keys
        const keys = Object.keys(localStorage).filter((k) => k.startsWith('nutrikal-'));
        keys.forEach((k) => localStorage.removeItem(k));

        set({ user: null, authState: 'unauthenticated', error: null, errorField: undefined });

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
        const jwt = localStorage.getItem(JWT_KEY);
        if (!jwt) {
          set({ authState: 'unauthenticated' });
          return;
        }
        set({ authState: 'authenticating' });
        try {
          const user = await validateSession(jwt);
          set({ user, authState: 'authenticated' });
        } catch {
          localStorage.removeItem(JWT_KEY);
          set({ authState: 'unauthenticated', error: null, user: null });
        }
      },

      setAuthView: (view: AuthView) => set({ authView: view, error: null, errorField: undefined }),

      clearError: () => set({ error: null, errorField: undefined }),
    }),
    {
      name: 'nutrikal-auth',
      partialize: (state) => ({
        user: state.user,
      }),
    },
  ),
);

type SetFn = (partial: Partial<AuthStoreState>) => void;

function handleAuthError(err: unknown, set: SetFn) {
  let message = 'Error inesperado. Intentá de nuevo.';
  let field: string | undefined;

  if (err instanceof ApiAuthError) {
    message = err.message;
    field = err.field;
  } else if (
    err instanceof TypeError ||
    (err as { message?: string }).message?.includes('fetch')
  ) {
    message = 'Sin conexión. Verificá tu internet.';
  }

  set({ authState: 'error', error: message, errorField: field, user: null });
}
