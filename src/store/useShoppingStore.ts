import { create } from 'zustand';
import type { ShoppingList, ShoppingItem } from '../types';
import { generateId } from '../utils/dateHelpers';
import * as api from '../services/apiService';

interface ShoppingState {
  lists: ShoppingList[];
  isLoading: boolean;

  addList: (list: ShoppingList) => void;
  removeList: (id: string) => void;
  toggleItem: (listId: string, itemId: string) => void;
  clearChecked: (listId: string) => void;
  clearAll: () => void;
  addItemsToActiveList: (items: ShoppingItem[]) => void;
  hydrateLists: (lists: ShoppingList[]) => void;
}

export const useShoppingStore = create<ShoppingState>()((set, get) => ({
  lists: [],
  isLoading: false,

  addList: (list) => {
    set((s) => ({ lists: [list, ...s.lists] }));
    api.createShoppingList(list).catch(console.error);
  },

  removeList: (id) => {
    set((s) => ({ lists: s.lists.filter((l) => l.id !== id) }));
    api.deleteShoppingList(id).catch(console.error);
  },

  toggleItem: (listId, itemId) => {
    set((s) => ({
      lists: s.lists.map((l) =>
        l.id === listId
          ? {
              ...l,
              items: l.items.map((i) =>
                i.id === itemId ? { ...i, checked: !i.checked } : i,
              ),
            }
          : l,
      ),
    }));
    api.toggleShoppingItem(listId, itemId).catch(console.error);
  },

  clearChecked: (listId) => {
    set((s) => ({
      lists: s.lists.map((l) =>
        l.id === listId
          ? { ...l, items: l.items.filter((i) => !i.checked) }
          : l,
      ),
    }));
    api.clearCheckedItems(listId).catch(console.error);
  },

  clearAll: () => set({ lists: [] }),

  addItemsToActiveList: (items: ShoppingItem[]) => {
    const state = get();

    if (state.lists.length === 0) {
      const newList: ShoppingList = {
        id: generateId(),
        name: 'Lista de compras',
        createdAt: new Date().toISOString(),
        dateRange: {
          from: new Date().toISOString().slice(0, 10),
          to: new Date().toISOString().slice(0, 10),
        },
        items,
      };
      set({ lists: [newList] });
      api.createShoppingList(newList).catch(console.error);
      return;
    }

    const activeList = state.lists[0];
    const mergedItems = [...activeList.items];

    for (const newItem of items) {
      const existingIdx = mergedItems.findIndex(
        (i) => i.ingredientId === newItem.ingredientId,
      );
      if (existingIdx >= 0) {
        const existing = mergedItems[existingIdx];
        const existingGrams = parseQuantityGrams(existing.quantity);
        const newGrams = parseQuantityGrams(newItem.quantity);
        const total = existingGrams + newGrams;
        mergedItems[existingIdx] = {
          ...existing,
          quantity: total >= 1000
            ? `${(total / 1000).toFixed(1)} kg`
            : `${Math.round(total)} g`,
        };
      } else {
        mergedItems.push(newItem);
      }
    }

    const updatedLists = state.lists.map((l, idx) =>
      idx === 0 ? { ...l, items: mergedItems } : l,
    );
    set({ lists: updatedLists });
    api.updateShoppingListItems(activeList.id, mergedItems).catch(console.error);
  },

  hydrateLists: (lists) => {
    set({ lists });
  },
}));

function parseQuantityGrams(quantity: string): number {
  const kgMatch = quantity.match(/([\d.]+)\s*kg/);
  if (kgMatch) return parseFloat(kgMatch[1]) * 1000;
  const gMatch = quantity.match(/([\d.]+)\s*g/);
  if (gMatch) return parseFloat(gMatch[1]);
  return 0;
}
