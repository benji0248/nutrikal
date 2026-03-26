import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ShoppingList, ShoppingItem } from '../types';
import { generateId } from '../utils/dateHelpers';

interface ShoppingState {
  lists: ShoppingList[];

  addList: (list: ShoppingList) => void;
  removeList: (id: string) => void;
  toggleItem: (listId: string, itemId: string) => void;
  clearChecked: (listId: string) => void;
  clearAll: () => void;
  addItemsToActiveList: (items: ShoppingItem[]) => void;
}

export const useShoppingStore = create<ShoppingState>()(
  persist(
    (set) => ({
      lists: [],

      addList: (list) => {
        set((s) => ({ lists: [list, ...s.lists] }));
        import('./useGistSyncStore').then(({ useGistSyncStore }) =>
          useGistSyncStore.getState().schedulePush(),
        );
      },

      removeList: (id) => {
        set((s) => ({ lists: s.lists.filter((l) => l.id !== id) }));
        import('./useGistSyncStore').then(({ useGistSyncStore }) =>
          useGistSyncStore.getState().schedulePush(),
        );
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
        import('./useGistSyncStore').then(({ useGistSyncStore }) =>
          useGistSyncStore.getState().schedulePush(),
        );
      },

      clearChecked: (listId) => {
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === listId
              ? { ...l, items: l.items.filter((i) => !i.checked) }
              : l,
          ),
        }));
        import('./useGistSyncStore').then(({ useGistSyncStore }) =>
          useGistSyncStore.getState().schedulePush(),
        );
      },

      clearAll: () => set({ lists: [] }),

      addItemsToActiveList: (items: ShoppingItem[]) => {
        set((s) => {
          if (s.lists.length === 0) {
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
            return { lists: [newList] };
          }

          const activeList = s.lists[0];
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

          return {
            lists: s.lists.map((l, idx) =>
              idx === 0 ? { ...l, items: mergedItems } : l,
            ),
          };
        });
        import('./useGistSyncStore').then(({ useGistSyncStore }) =>
          useGistSyncStore.getState().schedulePush(),
        );
      },
    }),
    {
      name: 'nutrikal-shopping',
    },
  ),
);

function parseQuantityGrams(quantity: string): number {
  const kgMatch = quantity.match(/([\d.]+)\s*kg/);
  if (kgMatch) return parseFloat(kgMatch[1]) * 1000;
  const gMatch = quantity.match(/([\d.]+)\s*g/);
  if (gMatch) return parseFloat(gMatch[1]);
  return 0;
}
