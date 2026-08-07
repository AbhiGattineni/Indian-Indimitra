// Real Garudavega Express (India -> USA) published rates, captured from
// their rate calculator on the date below. This is a reference/comparison
// table only — it does NOT drive the checkout shipping charge (see
// shipping.js for that). Shown to customers so they can see the actual
// per-kg and total cost curve and choose a sensible package weight (e.g.
// topping up to the next published weight when it barely costs more).
export const RATE_CARD_AS_OF = '2026-08-06';
export const RATE_CARD_ROUTE = 'India → USA, Garudavega Express';

export const SERVICE_TIERS = [
  { key: 'priority', label: 'Express Priority', tat: '3–5 business days' },
  { key: 'saver', label: 'Express Saver', tat: '3–7 business days' },
  { key: 'economy', label: 'Express Economy', tat: '6–8 business days' },
  { key: 'regular', label: 'Regular', tat: '6–10 business days' },
];

// Total charges (INR, GST included) by weight (kg) for priority/saver/economy.
const RATE_CARD_ROWS = [
  { weightKg: 1, priority: 3486, saver: 3093, economy: 2651 },
  { weightKg: 2, priority: 4313, saver: 4092, economy: 3422 },
  { weightKg: 3, priority: 5151, saver: 5163, economy: 4580 },
  { weightKg: 4, priority: 6135, saver: 6318, economy: 5312 },
  { weightKg: 5, priority: 7101, saver: 7459, economy: 6046 },
  { weightKg: 6, priority: 7822, saver: 8452, economy: 7063 },
  { weightKg: 7, priority: 9126, saver: 9818, economy: 7748 },
  { weightKg: 8, priority: 9315, saver: 10355, economy: 8386 },
  { weightKg: 9, priority: 10479, saver: 11617, economy: 9030 },
  { weightKg: 10, priority: 10801, saver: 12224, economy: 9749 },
  { weightKg: 11, priority: 11881, saver: 13420, economy: 10510 },
  { weightKg: 12, priority: 12961, saver: 14617, economy: 11273 },
  { weightKg: 13, priority: 14041, saver: 15813, economy: 12037 },
  { weightKg: 14, priority: 15121, saver: 17010, economy: 12801 },
  { weightKg: 15, priority: 16124, saver: 18206, economy: 13563 },
];

// "Regular" tier: published flat totals for 1-10kg, then a straight
// per-kg rate for 11-20kg and a lower per-kg rate for 21kg+.
const REGULAR_DISCRETE_TOTALS = {
  1: 2500, 2: 3100, 3: 3900, 4: 4800, 5: 5650,
  6: 6250, 7: 6850, 8: 7400, 9: 8000, 10: 8500,
};
export function regularRate(weightKg) {
  if (REGULAR_DISCRETE_TOTALS[weightKg] != null) return REGULAR_DISCRETE_TOTALS[weightKg];
  const perKg = weightKg <= 20 ? 850 : 800;
  return Math.round(weightKg * perKg);
}

// Total charges (INR) by weight (kg) and tier.
export const GARUDAVEGA_RATE_CARD = RATE_CARD_ROWS.map((row) => ({
  ...row,
  regular: regularRate(row.weightKg),
}));

export const DEFAULT_USD_INR_RATE = 95;

export function formatUSD(inrAmount, usdInrRate) {
  const rate = Number(usdInrRate) > 0 ? Number(usdInrRate) : DEFAULT_USD_INR_RATE;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(inrAmount || 0) / rate);
}
