// International shipping, finalized on Garudavega's India -> USA/Canada tiered
// structure. Domestic (India) keeps the store's free/flat rule; everything else
// is billed on the package weight so the platform never absorbs shipping.
//
// Rounding (Garudavega):
//   1–20 kg  -> round UP to the nearest 0.5 kg
//   21–25 kg -> round UP to the nearest 1.0 kg
// Cost bands (INR, taken toward the higher end of the published ranges so we
// don't undercharge), plus a flat ₹200 buffer per shipment for flexibility:
//   first 1 kg      : ₹3,000 (fixed handling + documentation)
//   +kg in 1–5 kg   : ₹750 / kg
//   +kg in 5–20 kg  : ₹500 / kg   (rate drops as it scales)
//   21 kg+ (bulk)   : ₹625 / kg on the WHOLE shipment (saver tier)

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

const FIRST_KG = 3000;
const ADD_LIGHT = 750; // per kg, 1–5 kg
const ADD_MED = 500; // per kg, 5–20 kg
const BULK_PER_KG = 625; // 21 kg+, whole shipment
const BUFFER = 200; // flat flexibility buffer
const MIN_KG = 0.5; // couriers bill a 0.5 kg minimum

export function isDomestic(country) {
  return !country || country === DOMESTIC_COUNTRY;
}

export function countryName(code) {
  return SHIPPING_COUNTRIES.find((c) => c.code === code)?.name || code;
}

// Chargeable weight after Garudavega rounding.
export function billableWeight(kg) {
  const w = Math.max(MIN_KG, Number(kg) || 0);
  if (w <= 20) return Math.ceil(w / 0.5) * 0.5; // nearest 0.5 kg up
  return Math.ceil(w); // 21–25 kg: nearest 1 kg up
}

// Total shipping cost for a package of the given actual weight (kg).
export function internationalShipping(country, actualKg) {
  const w = billableWeight(actualKg);
  let cost;
  if (w <= 20) {
    cost = FIRST_KG;
    if (w > 1) {
      cost += ADD_LIGHT * (Math.min(w, 5) - 1) + ADD_MED * Math.max(0, Math.min(w, 20) - 5);
    }
  } else {
    cost = w * BULK_PER_KG;
  }
  return Math.round(cost + BUFFER);
}
