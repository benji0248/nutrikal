import { create } from 'zustand';
import { ApiAuthError, commitCalendarOperation, loadCalendarPlanning } from '../services/apiService';
import type { CalendarOperation, CalendarOperationResult, CalendarPlanningSnapshot } from '../services/calendarPlanTypes';
import { useCalendarStore } from './useCalendarStore';
import { useShoppingStore } from './useShoppingStore';
import { useAuthStore } from './useAuthStore';
import type { WeekPlan } from '../types';
import { useChatStore } from './useChatStore';

function hydrate(snapshot: CalendarPlanningSnapshot) {
  const notes = Object.values(useCalendarStore.getState().dayPlans).map((day) => ({ date: day.date, notes: day.notes }));
  useCalendarStore.getState().hydrateMeals(snapshot.meals.map((meal) => ({ ...meal,
    calories: meal.calories ?? null, notes: meal.notes ?? null, linkedRecipeId: meal.linkedRecipeId ?? null,
    completed: meal.completed ?? false, entries: meal.entries ?? [], aiIngredients: meal.aiIngredients ?? [],
  })), notes);
  useShoppingStore.getState().hydrateLists([...snapshot.shoppingLists].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  const syncPlan = (plan: WeekPlan) => {
    if (!plan.id) return plan;
    return snapshot.plans.find((saved) => saved.id === plan.id)?.source ?? { ...plan, applied: false };
  };
  useChatStore.getState().updateMessages((messages) => messages.map((message) => message.weekPlan ? { ...message, weekPlan: syncPlan(message.weekPlan) } : message));
  const last = useChatStore.getState().lastWeekPlan;
  if (last) useChatStore.getState().setLastWeekPlan(syncPlan(last));
}
interface PlanState {
  snapshot: CalendarPlanningSnapshot | null;
  busy: boolean;
  error: string | null;
  lastOperation: { id: string; label: string } | null;
  pendingPlan: { plan: WeekPlan; onApplied: (plan: WeekPlan, result: CalendarOperationResult) => void } | null;
  requestApply: (plan: WeekPlan, onApplied: (plan: WeekPlan, result: CalendarOperationResult) => void) => void;
  closeApply: () => void;
  refresh: () => Promise<CalendarPlanningSnapshot>;
  perform: (operation: CalendarOperation, label: string) => Promise<CalendarOperationResult>;
  undo: () => Promise<void>;
  reset: () => void;
}
export const useCalendarPlanStore = create<PlanState>()((set, get) => ({
  snapshot: null, busy: false, error: null, lastOperation: null, pendingPlan: null,
  requestApply: (plan, onApplied) => { if (!get().busy) set({ pendingPlan: { plan, onApplied }, error: null }); },
  closeApply: () => { if (!get().busy) set({ pendingPlan: null }); },
  reset: () => set({ snapshot: null, busy: false, error: null, lastOperation: null, pendingPlan: null }),
  refresh: async () => {
    const userId = useAuthStore.getState().user?.id;
    try {
      const snapshot = await loadCalendarPlanning();
      if (userId !== useAuthStore.getState().user?.id) throw new Error('La sesión cambió.');
      hydrate(snapshot);
      set({ snapshot, error: null });
      return snapshot;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'No se pudo cargar la planificación.' });
      throw error;
    }
  },
  perform: async (operation, label) => {
    if (get().busy) throw new Error('Esperá a que termine el cambio anterior.');
    const userId = useAuthStore.getState().user?.id;
    set({ busy: true, error: null });
    try {
      const snapshot = get().snapshot ?? await get().refresh();
      const result = await commitCalendarOperation(operation, snapshot.version, crypto.randomUUID());
      if (userId !== useAuthStore.getState().user?.id) throw new Error('La sesión cambió.');
      hydrate(result);
      set({ snapshot: result, lastOperation: operation.kind === 'undo' ? null : { id: result.operationId, label } });
      return result;
    } catch (error) {
      if (error instanceof ApiAuthError && error.status === 409) {
        try { await get().refresh(); } catch { /* The original conflict remains visible. */ }
      }
      set({ error: error instanceof Error ? error.message : 'No se pudo guardar. No se aplicó parcialmente.' });
      throw error;
    } finally { set({ busy: false }); }
  },
  undo: async () => {
    const last = get().lastOperation;
    if (!last) return;
    await get().refresh();
    await get().perform({ kind: 'undo', operationId: last.id }, 'Cambio deshecho');
  },
}));
