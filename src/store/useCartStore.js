// Cart state. A cart is scoped to a single store at a time (marketplace orders
// are per-seller). For a weight/volume product, the same product at a
// different tier (e.g. 250 g vs 1 kg) is a separate line; a piece product
// only ever has one line (no tier), keyed by lineId.
import { create } from 'zustand';
import { customerPrice } from '../lib/calculations';

const lineIdFor = (productId, unitType, amount) =>
  unitType === 'piece' ? `${productId}_piece` : `${productId}_${amount}`;

export const useCartStore = create((set, get) => ({
  storeId: null,
  storeName: '',
  // price = customer-facing price per selling unit (seller's price + platform
  // margin, both set on the product); sellerPrice = the seller's own price,
  // kept alongside for the commission/seller-net split at checkout.
  // items: { lineId, productId, name, price, sellerPrice, unitType, qty,
  //   grams (weight) | milliliters (volume), weightPerUnitKg (piece/volume,
  //   for shipping), imageUrl, instructions }
  items: [],

  // `amount` is grams for a weight product, millilitres for volume, and
  // ignored for piece (qty alone is the amount).
  addItem: (storeId, storeName, product, amount = 1000, qty = 1, instructions = '') => {
    const state = get();
    const unitType = product.unitType || 'weight';
    // New store => reset cart to keep one seller per order.
    let items = state.storeId === storeId ? [...state.items] : [];
    const lineId = lineIdFor(product.id, unitType, amount);
    const idx = items.findIndex((i) => i.lineId === lineId);
    if (idx >= 0) {
      items[idx] = {
        ...items[idx],
        qty: items[idx].qty + qty,
        // A newly-entered note replaces the old one; otherwise keep it.
        instructions: instructions || items[idx].instructions,
      };
    } else {
      const line = {
        lineId,
        productId: product.id,
        name: product.name,
        price: customerPrice(product),
        sellerPrice: product.price,
        unitType,
        qty,
        imageUrl: product.imageUrl || '',
        instructions,
      };
      if (unitType === 'volume') line.milliliters = amount;
      else if (unitType !== 'piece') line.grams = amount;
      if (unitType !== 'weight') line.weightPerUnitKg = Number(product.weightPerUnitKg || 0);
      items.push(line);
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
