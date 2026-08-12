// Cart state. A cart is scoped to a single store at a time (marketplace orders
// are per-seller). Switching stores replaces the cart. The same product at a
// different weight (250 g / 500 g / 1 kg) is a separate line, keyed by lineId.
import { create } from 'zustand';

const lineIdFor = (productId, grams) => `${productId}_${grams}`;

export const useCartStore = create((set, get) => ({
  storeId: null,
  storeName: '',
  items: [], // { lineId, productId, name, price, grams, qty, imageUrl, instructions }

  addItem: (storeId, storeName, product, grams = 1000, qty = 1, instructions = '') => {
    const state = get();
    // New store => reset cart to keep one seller per order.
    let items = state.storeId === storeId ? [...state.items] : [];
    const lineId = lineIdFor(product.id, grams);
    const idx = items.findIndex((i) => i.lineId === lineId);
    if (idx >= 0) {
      items[idx] = {
        ...items[idx],
        qty: items[idx].qty + qty,
        // A newly-entered note replaces the old one; otherwise keep it.
        instructions: instructions || items[idx].instructions,
      };
    } else {
      items.push({
        lineId,
        productId: product.id,
        name: product.name,
        price: product.price,
        grams,
        qty,
        imageUrl: product.imageUrl || '',
        instructions,
      });
    }
    set({ storeId, storeName, items });
  },

  setQty: (lineId, qty) =>
    set((s) => ({
      items: s.items
        .map((i) => (i.lineId === lineId ? { ...i, qty } : i))
        .filter((i) => i.qty > 0),
    })),

  removeItem: (lineId) =>
    set((s) => ({ items: s.items.filter((i) => i.lineId !== lineId) })),

  clear: () => set({ storeId: null, storeName: '', items: [] }),

  // Replace local state wholesale — used to load a signed-in user's cart
  // saved from another browser/device (see useCartSync).
  hydrate: (cart) =>
    set({
      storeId: cart?.storeId || null,
      storeName: cart?.storeName || '',
      items: cart?.items || [],
    }),
}));
