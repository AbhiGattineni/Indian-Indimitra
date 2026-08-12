// Which business the customer is currently shopping. Multi-store: the navbar
// switcher and Browse both read from here. Selection persists across reloads.
import { create } from 'zustand';
import { listStores } from '../firebase/db';
import { STORE_STATUS } from '../lib/constants';
import { useCartStore } from './useCartStore';

const LS_KEY = 'selectedStoreId';

export const useStoreSelection = create((set, get) => ({
  selectedStore: null,
  stores: [],
  loading: false,
  loaded: false,

  // Load approved stores once and resolve the active one (persisted or first).
  ensureStores: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true });
    try {
      const stores = await listStores(STORE_STATUS.APPROVED);
      const savedId = localStorage.getItem(LS_KEY);
      const current = stores.find((s) => s.id === savedId) || stores[0] || null;
      if (current) localStorage.setItem(LS_KEY, current.id);
      set({ stores, selectedStore: current, loaded: true, loading: false });
    } catch (e) {
      console.error('Failed to load stores', e);
      set({ loading: false });
    }
  },

  // Switch business. Cart is per-store, so switching clears it.
  setStore: (store) => {
    if (!store || store.id === get().selectedStore?.id) return;
    localStorage.setItem(LS_KEY, store.id);
    useCartStore.getState().clear();
    set({ selectedStore: store });
  },

  refreshStores: async () => {
    const stores = await listStores(STORE_STATUS.APPROVED);
    set({ stores });
  },
}));
