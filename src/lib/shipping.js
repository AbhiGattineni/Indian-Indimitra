// International shipping. Domestic (India) keeps the store's free/flat rule;
// everything else is billed on the package weight so the platform never
// absorbs shipping.
//
// Rates are one per-destination-country weight-by-service-tier chart (the
// same shape as the customer-facing rate chart, e.g. Garudavega's published
// India -> <country> weight/tier table) — admin-editable at
// /admin/shipping-rates, fetched from Firestore (`getShippingRates()`), and
// shown to the customer via ShippingRateDialog. One table drives both, so
// what's charged always matches what's shown. `chargedTier` picks which of
// the table's service-tier columns is the one actually billed.
//
// Rounding (courier convention, not price data — not admin-editable):
//   round UP to the next whole kg (the chart is keyed by whole-kg rows).
import { GARUDAVEGA_RATE_CARD, RATE_CARD_AS_OF, DEFAULT_USD_INR_RATE, SERVICE_TIERS } from './garudavegaRates';

export { SERVICE_TIERS };

export const DOMESTIC_COUNTRY = 'IN';

export const SHIPPING_COUNTRIES = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SG', name: 'Singapore' },
  { code: 'DE', name: 'Germany' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'OTHER', name: 'Other country' },
];

// Which SERVICE_TIERS column is the one actually charged to the customer --
// the rest are shown on the rate chart for comparison only.
export const DEFAULT_CHARGED_TIER = 'saver';

// Real packed weight (product + box + packing material) by product-weight
// tier -- from the seller's own packing records, irregular by design (box
// sizes step up at different points, and a bigger box is proportionally
// more weight-efficient), not a formula. Per-store and admin/FDM-editable
// at the store's "Packaging" tab/dialog (see PackagingChartEditor), stored
// on the store doc as `packagingChart`. This is only the seed default used
// for a store that hasn't configured its own chart yet.
const DEFAULT_PACKAGING_ROWS = [
  { originalKg: 1, afterKg: 2 }, { originalKg: 2, afterKg: 3 }, { originalKg: 3, afterKg: 4 },
  { originalKg: 4, afterKg: 6 }, { originalKg: 5, afterKg: 7 }, { originalKg: 6, afterKg: 8 },
  { originalKg: 7, afterKg: 10 }, { originalKg: 8, afterKg: 11 }, { originalKg: 9, afterKg: 12 },
  { originalKg: 10, afterKg: 14 }, { originalKg: 11, afterKg: 15 }, { originalKg: 12, afterKg: 16 },
  { originalKg: 13, afterKg: 17 }, { originalKg: 14, afterKg: 18 }, { originalKg: 15, afterKg: 19 },
  { originalKg: 16, afterKg: 21 }, { originalKg: 17, afterKg: 22 }, { originalKg: 18, afterKg: 23 },
  { originalKg: 19, afterKg: 24 }, { originalKg: 20, afterKg: 25 },
];

export function defaultPackagingChart() {
  return { rows: DEFAULT_PACKAGING_ROWS.map((r) => ({ ...r })), extraKgBeyondLastRow: 0 };
}

// Guards against a store's packagingChart being missing or malformed --
// treats it as "use the built-in default" rather than crashing or
// silently computing zero overhead.
export function normalizePackagingChart(raw) {
  if (!raw || !Array.isArray(raw.rows)) return defaultPackagingChart();
  return { rows: raw.rows, extraKgBeyondLastRow: Number(raw.extraKgBeyondLastRow) || 0 };
}

// Extra weight (kg) the box/packing materials add for a product weighing
// `kg`, from `chart` (a store's packagingChart, or the built-in default if
// omitted) -- an exact-weight row if there is one, otherwise the next
// heavier configured row (a 3.2 kg order needs the same box as a 4 kg one),
// otherwise (heavier than every row) the last row's overhead plus
// `extraKgBeyondLastRow` for each kg past it.
export function packagingOverheadKg(kg, chart) {
  const w = Math.max(0, Number(kg) || 0);
  if (w === 0) return 0;
  const originalKg = Math.max(1, Math.ceil(w));
  const table = normalizePackagingChart(chart);
  const rows = (table.rows || [])
    .filter((r) => r && r.afterKg !== '' && r.afterKg != null && Number.isFinite(Number(r.originalKg)))
    .map((r) => ({ originalKg: Number(r.originalKg), afterKg: Number(r.afterKg) }))
    .sort((a, b) => a.originalKg - b.originalKg);
  if (rows.length === 0) return 0;
  const exact = rows.find((r) => r.originalKg === originalKg);
  if (exact) return exact.afterKg - exact.originalKg;
  const above = rows.find((r) => r.originalKg > originalKg);
  if (above) return above.afterKg - above.originalKg;
  const last = rows[rows.length - 1];
  const lastOverhead = last.afterKg - last.originalKg;
  return lastOverhead + table.extraKgBeyondLastRow * (originalKg - last.originalKg);
}

// Actual shippable weight once packed — this is what shipping cost should
// be calculated on, since the box/material weight travels (and is billed)
// right along with the product. `chart` is the store's packagingChart.
export function packedWeightKg(kg, chart) {
  const w = Math.max(0, Number(kg) || 0);
  return w + packagingOverheadKg(w, chart);
}

export const DEFAULT_DISCLAIMER = 'International shipping is an estimate based on published courier pricing (e.g. Garudavega) and has not been confirmed against their current rate card. Actual charges may change with courier updates or the USD/INR exchange rate, and are confirmed at the time of shipment.';

// Empty per-country chart: no weight rows yet, and no per-kg fallback either
// (so a country with nothing entered quotes ₹0 + buffer rather than silently
// guessing -- admin needs to add real rates before it can quote for real).
function emptyCountryChart() {
  const perKgBeyond = {};
  SERVICE_TIERS.forEach((t) => { perKgBeyond[t.key] = 0; });
  return { rows: [], perKgBeyond };
}

// US starts pre-filled with the real published Garudavega chart (see
// garudavegaRates.js) -- the only route we have actual courier data for.
// perKgBeyond seeds from the last (15 kg) row's implied per-kg rate, so a
// heavier order still quotes something sane until an admin refines it.
function seedUsChart() {
  const rows = GARUDAVEGA_RATE_CARD.map((r) => ({ ...r }));
  const last = rows[rows.length - 1];
  const perKgBeyond = {};
  SERVICE_TIERS.forEach((t) => {
    perKgBeyond[t.key] = last?.[t.key] ? Math.round(last[t.key] / last.weightKg) : 0;
  });
  return { rows, perKgBeyond };
}

// Built-in fallback used until an admin has entered real per-country rates
// in Firestore (see getShippingRates in firebase/db.js). Only the US route
// (the one route with real published data) starts pre-filled; every other
// country starts blank for an admin to fill in as real rates become available.
export function defaultShippingRates() {
  const countries = {};
  SHIPPING_COUNTRIES.forEach(({ code }) => {
    if (code === DOMESTIC_COUNTRY) return;
    countries[code] = code === 'US' ? seedUsChart() : emptyCountryChart();
  });
  return {
    chargedTier: DEFAULT_CHARGED_TIER,
    // 0 by default so checkout matches the displayed chart exactly (the
    // chart's totals are already GST-inclusive, courier-published prices) --
    // an admin can set this above 0 deliberately, but doing so means
    // checkout will charge more than the number shown on the rate chart.
    buffer: 0,
    disclaimer: DEFAULT_DISCLAIMER,
    ratesAsOf: RATE_CARD_AS_OF,
    usdInrRate: DEFAULT_USD_INR_RATE,
    countries,
  };
}

// Guards against a country entry saved in the old band-array shape (or
// anything else malformed) — treats it as "no chart data" rather than
// feeding shapeless data into the lookup below.
function isChartShape(entry) {
  return !!entry && !Array.isArray(entry) && Array.isArray(entry.rows);
}

// Merges Firestore data over the built-in defaults, per country -- so a
// country an admin hasn't touched yet (or that still has old-format data)
// falls back to the code default instead of breaking or quoting ₹0.
export function normalizeShippingRates(raw) {
  const base = defaultShippingRates();
  if (!raw) return base;
  const countries = {};
  SHIPPING_COUNTRIES.forEach(({ code }) => {
    if (code === DOMESTIC_COUNTRY) return;
    const entry = raw.countries?.[code];
    countries[code] = isChartShape(entry) ? entry : base.countries[code];
  });
  return {
    ...base,
    ...raw,
    chargedTier: raw.chargedTier || base.chargedTier,
    countries,
  };
}

export function isDomestic(country) {
  return !country || country === DOMESTIC_COUNTRY;
}

export function countryName(code) {
  return SHIPPING_COUNTRIES.find((c) => c.code === code)?.name || code;
}

// Chargeable weight after courier rounding -- the chart is keyed by whole-kg
// rows, so round up to the next whole kg (1 kg minimum).
export function billableWeight(kg) {
  return Math.max(1, Math.ceil(Number(kg) || 0));
}

// Looks up `tier`'s amount for `kg` in a country's rows: an exact-weight row
// if there is one, otherwise the next heavier row that has a value (rounds
// up rather than ever underquoting a gap), otherwise (kg is beyond every
// row) the heaviest available row, flagged so the caller can extrapolate.
function lookupChartRow(rows, tier, kg) {
  const withTier = (rows || [])
    .filter((r) => r && r[tier] !== '' && r[tier] != null && Number.isFinite(Number(r.weightKg)))
    .map((r) => ({ weightKg: Number(r.weightKg), amount: Number(r[tier]) }))
    .sort((a, b) => a.weightKg - b.weightKg);
  if (withTier.length === 0) return null;
  const exact = withTier.find((r) => r.weightKg === kg);
  if (exact) return { amount: exact.amount, atKg: kg, extrapolated: false };
  const nextAbove = withTier.find((r) => r.weightKg > kg);
  if (nextAbove) return { amount: nextAbove.amount, atKg: nextAbove.weightKg, extrapolated: false };
  const last = withTier[withTier.length - 1];
  return { amount: last.amount, atKg: last.weightKg, extrapolated: true };
}

// Total shipping cost for a package of the given actual weight (kg), read
// straight off the same per-country weight/tier chart shown to the customer
// (see ShippingRateDialog) -- so what's charged always matches what's shown.
// `rates` comes from Firestore (getShippingRates); falls back to the
// built-in chart if it hasn't loaded yet.
export function internationalShipping(country, actualKg, rates) {
  const kg = billableWeight(actualKg);
  const table = rates || defaultShippingRates();
  const tier = table.chargedTier || DEFAULT_CHARGED_TIER;
  const countryData = table.countries?.[country] || table.countries?.OTHER || emptyCountryChart();
  const perKgBeyond = Number(countryData.perKgBeyond?.[tier]) || 0;
  const found = lookupChartRow(countryData.rows, tier, kg);
  const amount = !found
    ? perKgBeyond * kg
    : found.extrapolated
      ? found.amount + perKgBeyond * (kg - found.atKg)
      : found.amount;
  const buffer = Number(table.buffer) || 0;
  return Math.round(amount) + buffer;
}
