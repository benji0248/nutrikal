import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IngredientSignalEntry } from '../types';
import { generateId } from '../utils/dateHelpers';

const MAX_ENTRIES = 800;

interface IngredientSignalState {
  entries: IngredientSignalEntry[];
  /** Reemplaza desde payload del servidor */
  setFromPayload: (entries: IngredientSignalEntry[] | undefined) => void;
  /** Una o más filas; un solo schedulePush */
  appendMany: (rows: Array<Omit<IngredientSignalEntry, 'id'>>) => void;
}

export const useIngredientSignalStore = create<IngredientSignalState>()(
  persist(
    (set, get) => ({
      entries: [],

      setFromPayload: (incoming) => {
        set({ entries: Array.isArray(incoming) ? incoming : [] });
      },

      appendMany: (rows) => {
        if (rows.length === 0) return;
        const next: IngredientSignalEntry[] = rows.map((r) => ({
          ...r,
          id: generateId(),
        }));
        set({
          entries: [...get().entries, ...next].slice(-MAX_ENTRIES),
        });
      },
    }),
    { name: 'nutrikal-ingredient-signals' },
  ),
);
