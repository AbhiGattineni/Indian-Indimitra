// Client-side order math. For UX only — Security Rules must independently
// validate any values a malicious client could tamper with.

// Every product/cart-line carries a unitType: 'weight' (default — the
// existing 250g/500g/1kg tiers), 'piece' (plain count, no tier), or
// 'volume' (250ml/500ml/1L tiers). Whatever it is, `price`/`sellerPrice`
// are always "per selling unit" (per kg, per piece, or per liter).

// How many selling-units ONE qty represents: kg for weight, litres for
// volume, or 1 for a piece (a piece IS the selling unit).
export function itemUnitAmount(item) {
  const unitType = item?.unitType || 'weight';
  if (unitType === 'piece') return 1;
  const amount = unitType === 'volume' ? Number(item?.milliliters) : Number(item?.grams);
  return (amount || 1000) / 1000;
}

// Total selling-units across the line (unit amount × qty) — what price is
// multiplied by to get the line total.
export function itemSaleAmount(item) {
  return itemUnitAmount(item) * Number(item?.qty || 0);
}

// Legacy field-name kept for existing callers that specifically want a
// weight-tier's grams (only meaningful for unitType 'weight').
export function itemGrams(item) {
  return Number(item?.grams) || 1000;
}

export function lineTotal(item) {
  return Number(item?.price || 0) * itemSaleAmount(item);
}

export function sellerLineTotal(item) {
  return Number(item?.sellerPrice ?? item?.price ?? 0) * itemSaleAmount(item);
}

export function cartSubtotal(items = []) {
  return items.reduce((sum, it) => sum + lineTotal(it), 0);
}

export function sellerSubtotal(items = []) {
  return items.reduce((sum, it) => sum + sellerLineTotal(it), 0);
}

// Historic flat platform margin for weight-priced products created before
// per-product margin existed — kept only as the fallback for that legacy
// data, never used for new products (which always carry an explicit
// `margin`, defaulting to 0 in the product form).
const LEGACY_WEIGHT_MARGIN_PER_KG = 200;

// The margin actually in effect for a product that predates the explicit
// per-product `margin` field (weight-priced ones defaulted to a flat
// ₹200/kg; anything else effectively had none). Also used to pre-fill the
// margin field when editing such a product, so saving without touching it
// doesn't silently change its price.
export function effectiveMargin(product) {
  if (product?.margin != null) return Number(product.margin);
  return (product?.unitType || 'weight') === 'weight' ? LEGACY_WEIGHT_MARGIN_PER_KG : 0;
}

// Combined customer-facing price for one selling-unit of a product: the
// seller's own price plus the platform's margin, both entered explicitly
// per product (separate from the platform fee/commission, which is a
// percentage applied at checkout, not per item).
export function customerPrice(product) {
  return Number(product?.price || 0) + effectiveMargin(product);
}

// Physical shipping weight (kg) for one cart line. Weight-priced items ARE
// their own shipping weight; piece/volume items convert via
// weightPerUnitKg (kg per piece, or kg per litre), captured on the product
// and snapshotted onto the cart line at add-time.
export function itemWeightKg(item) {
  const unitType = item?.unitType || 'weight';
  if (unitType === 'weight') return itemSaleAmount(item);
  return itemSaleAmount(item) * Number(item?.weightPerUnitKg || 0);
}

// Total package weight (kg) across the cart — drives international shipping.
export function cartWeightKg(items = []) {
  return items.reduce((sum, it) => sum + itemWeightKg(it), 0);
}

export function formatWeight(grams) {
  const g = Number(grams) || 1000;
  return g >= 1000 ? `${g / 1000} kg` : `${g} g`;
}

export function formatVolume(milliliters) {
  const ml = Number(milliliters) || 1000;
  return ml >= 1000 ? `${ml / 1000} L` : `${ml} ml`;
}

// Display label for a cart/order line's selling amount — the weight/volume
// tier for those unit types, or "Each" for a piece (qty alone says how many).
export function formatSaleAmount(item) {
  const unitType = item?.unitType || 'weight';
  if (unitType === 'volume') return formatVolume(item?.milliliters);
  if (unitType === 'piece') return 'Each';
  return formatWeight(item?.grams);
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
