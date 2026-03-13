import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ShoppingList } from '../types';

interface ShoppingState {
  lists: ShoppingList[];

  addList: (list: ShoppingList) => void;
  removeList: (id: string) => void;
  toggleItem: (listId: string, itemId: string) => void;
  clearChecked: (listId: string) => void;
  clearAll: () => void;
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
    }),
    {
      name: 'nutrikal-shopping',
    },
  ),
);
