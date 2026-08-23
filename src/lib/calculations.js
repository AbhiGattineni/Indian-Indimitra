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

// item.price is the customer-facing per-kg price (seller's price + the
// platform margin below) — see MARGIN_PER_KG.
export function lineTotal(item) {
  return Number(item.price || 0) * itemWeightKg(item);
}

export function cartSubtotal(items = []) {
  return items.reduce((sum, it) => sum + lineTotal(it), 0);
}

// Flat platform margin added on top of every seller's per-kg price — scales
// with weight (₹50 at 250g, ₹100 at 500g, ₹200 at 1kg), applied uniformly
// across all products/stores. This is separate from (and on top of) the
// commission below: the seller still sets/receives their own price, the
// platform keeps the margin as its own line item, and commission is charged
// against the seller's price, never against the platform's own margin.
export const MARGIN_PER_KG = 200;

export function customerPricePerKg(sellerPricePerKg) {
  return Number(sellerPricePerKg || 0) + MARGIN_PER_KG;
}

// item.sellerPrice is the seller's own per-kg price (pre-margin) — falls
// back to item.price for legacy cart/order lines saved before this field
// existed (their margin/commission split just comes out as zero, rather
// than crashing).
export function sellerLineTotal(item) {
  return Number(item.sellerPrice ?? item.price ?? 0) * itemWeightKg(item);
}

export function sellerSubtotal(items = []) {
  return items.reduce((sum, it) => sum + sellerLineTotal(it), 0);
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

export function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}
