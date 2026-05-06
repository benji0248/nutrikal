import { create } from 'zustand';
import type { IngredientSignalEntry } from '../types';
import { generateId } from '../utils/dateHelpers';
import * as api from '../services/apiService';

const MAX_ENTRIES = 800;

interface IngredientSignalState {
  entries: IngredientSignalEntry[];
  /** Reemplaza desde batch-load del servidor */
  hydrateSignals: (entries: IngredientSignalEntry[]) => void;
  /** Una o más filas; un solo POST al server */
  appendMany: (rows: Array<Omit<IngredientSignalEntry, 'id'>>) => void;
}

export const useIngredientSignalStore = create<IngredientSignalState>()((set, get) => ({
  entries: [],

  hydrateSignals: (incoming) => {
    set({ entries: Array.isArray(incoming) ? incoming : [] });
  },

  appendMany: (rows) => {
    if (rows.length === 0) return;
    const newEntries: IngredientSignalEntry[] = rows.map((r) => ({
      ...r,
      id: generateId(),
    }));
    const merged = [...get().entries, ...newEntries].slice(-MAX_ENTRIES);
    set({ entries: merged });
    api.batchCreateSignals(newEntries).catch(console.error);
  },
}));
