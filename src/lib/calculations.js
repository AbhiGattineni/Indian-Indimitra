// Client-side order math. For UX only — Security Rules must independently
// validate any values a malicious client could tamper with.

// Prices are per kg. Each cart line carries a weight selection in grams
// (250 / 500 / 1000); older lines without `grams` default to 1 kg.
export function itemGrams(item) {
  return Number(item?.grams) || 1000;
}

// Total weight (kg) contributed by a line = (grams/1000) * quantity.
export function itemWeightKg(item) {
  return (itemGrams(item) / 1000) * Number(item?.qty || 0);
}

export function lineTotal(item) {
  return Number(item.price || 0) * itemWeightKg(item);
}

export function cartSubtotal(items = []) {
  return items.reduce((sum, it) => sum + lineTotal(it), 0);
}

// Total package weight (kg) across the cart — drives international shipping.
export function cartWeightKg(items = []) {
  return items.reduce((sum, it) => sum + itemWeightKg(it), 0);
}

export function formatWeight(grams) {
  const g = Number(grams) || 1000;
  return g >= 1000 ? `${g / 1000} kg` : `${g} g`;
}

// Shipping: flat fee unless the subtotal clears the store's free-shipping threshold.
export function shippingFee(subtotal, store) {
  if (!store) return 0;
  const flat = Number(store.shippingFlatFee || 0);
  const threshold = Number(store.freeShippingThreshold || 0);
  if (threshold > 0 && subtotal >= threshold) return 0;
  return flat;
}

export function taxAmount(subtotal, config) {
  const rate = Number(config?.taxRate || 0);
  return +(subtotal * rate).toFixed(2);
}

export function commissionAmount(subtotal, config) {
  const rate = Number(config?.commissionRate || 0);
  return +(subtotal * rate).toFixed(2);
}

// Full breakdown used at checkout and stored on the order.
export function orderTotals(items, store, config) {
  const subtotal = +cartSubtotal(items).toFixed(2);
  const shipping = +shippingFee(subtotal, store).toFixed(2);
  const tax = taxAmount(subtotal, config);
  const commission = commissionAmount(subtotal, config);
  const total = +(subtotal + shipping + tax).toFixed(2);
  const sellerNet = +(subtotal - commission).toFixed(2);
  return { subtotal, shipping, tax, commission, total, sellerNet };
}

export function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}
