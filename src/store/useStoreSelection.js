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

  // Shared store-switcher modal state, so any page (not just the navbar) can
  // open it -- e.g. Browse.jsx forces it open (mandatory) when no store is
  // selected yet, instead of silently defaulting to one.
  switcherOpen: false,
  switcherMandatory: false,
  openSwitcher: (mandatory = false) => set({ switcherOpen: true, switcherMandatory: mandatory }),
  closeSwitcher: () => set({ switcherOpen: false, switcherMandatory: false }),

  // Load approved stores once and resolve the active one from what's
  // persisted -- no silent fallback to "the first store" anymore, so a
  // customer with nothing chosen yet gets prompted (StoreSwitcherModal)
  // rather than landing in an arbitrary store. `stores` includes
  // internal/testing stores (StoreSwitcherModal filters those by role).
  ensureStores: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true });
    try {
      const stores = await listStores(STORE_STATUS.APPROVED);
      const savedId = localStorage.getItem(LS_KEY);
      const current = stores.find((s) => s.id === savedId) || null;
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
