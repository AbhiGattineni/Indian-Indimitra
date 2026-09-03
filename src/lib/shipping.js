// International shipping. Domestic (India) keeps the store's free/flat rule;
// everything else is billed on the package weight so the platform never
// absorbs shipping.
//
// Rates are per-destination-country weight "bands" so admins can enter real
// courier pricing (e.g. Garudavega's published India -> <country> tiers)
// instead of one formula applied to every country. Bands are fetched from
// Firestore (`getShippingRates()`) and edited at /admin/shipping-rates; the
// constants below are only the fallback used before any admin data exists.
//
// Rounding (courier convention, not price data — not admin-editable):
//   1–20 kg  -> round UP to the nearest 0.5 kg
//   21–25 kg -> round UP to the nearest 1.0 kg

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

const MIN_KG = 0.5; // couriers bill a 0.5 kg minimum

// Real packed weight (product + box + packing material) by product-weight
// tier, from the seller's own packing records — irregular by design (box
// sizes step up at different points, and a bigger box is proportionally
// more weight-efficient), not a formula. Beyond 20 kg there's no recorded
// data yet, so the last tier's overhead is carried forward as a
// conservative estimate.
const PACKED_WEIGHT_BY_TIER = {
  1: 2, 2: 3, 3: 4, 4: 6, 5: 7, 6: 8, 7: 10, 8: 11, 9: 12, 10: 14,
  11: 15, 12: 16, 13: 17, 14: 18, 15: 19, 16: 21, 17: 22, 18: 23, 19: 24, 20: 25,
};
const MAX_PACKING_TIER = 20;

// Extra weight (kg) the box/packing materials add for a product weighing
// `kg` — looked up by the whole-kg tier it falls into (a 3.2 kg order needs
// the same box as a 4 kg one).
export function packagingOverheadKg(kg) {
  const w = Math.max(0, Number(kg) || 0);
  if (w === 0) return 0;
  const tier = Math.min(MAX_PACKING_TIER, Math.max(1, Math.ceil(w)));
  return PACKED_WEIGHT_BY_TIER[tier] - tier;
}

// Actual shippable weight once packed — this is what shipping cost should
// be calculated on, since the box/material weight travels (and is billed)
// right along with the product.
export function packedWeightKg(kg) {
  const w = Math.max(0, Number(kg) || 0);
  return w + packagingOverheadKg(w);
}

// Fallback bands: first 1 kg flat, then per-kg add-ons by weight band, then a
// per-kg-on-the-whole-shipment "bulk" band. Same shape admins edit per country.
function defaultBands() {
  return [
    { uptoKg: 1, mode: 'flat', amount: 3000 },
    { uptoKg: 5, mode: 'perKg', amount: 750 },
    { uptoKg: 20, mode: 'perKg', amount: 500 },
    { uptoKg: null, mode: 'perKgTotal', amount: 625 },
  ];
}

export const DEFAULT_DISCLAIMER = 'International shipping is an estimate based on published courier pricing (e.g. Garudavega) and has not been confirmed against their current rate card. Actual charges may change with courier updates or the USD/INR exchange rate, and are confirmed at the time of shipment.';

// Built-in fallback used until an admin has entered real per-country rates
// in Firestore (see getShippingRates in firebase/db.js). Deliberately applies
// the same generic bands to every country — that's the "not accurate" state
// this whole config screen exists to replace.
export function defaultShippingRates() {
  const countries = {};
  SHIPPING_COUNTRIES.forEach(({ code }) => {
    if (code !== DOMESTIC_COUNTRY) countries[code] = defaultBands();
  });
  return {
    buffer: 200,
    minKg: MIN_KG,
    disclaimer: DEFAULT_DISCLAIMER,
    ratesAsOf: null,
    usdInrRate: 95,
    countries,
  };
}

export function isDomestic(country) {
  return !country || country === DOMESTIC_COUNTRY;
}

export function countryName(code) {
  return SHIPPING_COUNTRIES.find((c) => c.code === code)?.name || code;
}

// Chargeable weight after courier rounding.
export function billableWeight(kg) {
  const w = Math.max(MIN_KG, Number(kg) || 0);
  if (w <= 20) return Math.ceil(w / 0.5) * 0.5; // nearest 0.5 kg up
  return Math.ceil(w); // 21–25 kg: nearest 1 kg up
}

// Cost of a set of weight bands (ascending by uptoKg, null = unbounded) at a
// given billable weight. 'flat' bands add a fixed amount once their floor is
// reached; 'perKg' bands add amount * kg-covered-within-the-band; a
// 'perKgTotal' band (typically the last, "bulk" band) replaces everything
// below it with amount * the whole billable weight.
export function bandedCost(bands, billableKg) {
  if (!Array.isArray(bands) || bands.length === 0) return 0;
  const sorted = [...bands].sort((a, b) => {
    const av = a.uptoKg == null ? Infinity : Number(a.uptoKg);
    const bv = b.uptoKg == null ? Infinity : Number(b.uptoKg);
    return av - bv;
  });
  let cost = 0;
  let prevCap = 0;
  for (const band of sorted) {
    const cap = band.uptoKg == null ? Infinity : Number(band.uptoKg);
    const amount = Number(band.amount) || 0;
    if (band.mode === 'perKgTotal') {
      if (billableKg > prevCap) return Math.round(amount * billableKg);
      continue;
    }
    if (billableKg <= prevCap) break;
    if (band.mode === 'flat') {
      cost += amount;
    } else {
      cost += (Math.min(billableKg, cap) - prevCap) * amount;
    }
    prevCap = cap;
  }
  return Math.round(cost);
}

// Total shipping cost for a package of the given actual weight (kg), using
// `rates` from Firestore (falls back to the generic built-in bands for a
// country with no admin-entered data, and to the full built-in table if
// `rates` itself hasn't loaded yet).
export function internationalShipping(country, actualKg, rates) {
  const w = billableWeight(actualKg);
  const table = rates || defaultShippingRates();
  const bands = table.countries?.[country] || table.countries?.OTHER || defaultBands();
  const buffer = Number(table.buffer) || 0;
  return bandedCost(bands, w) + buffer;
}
