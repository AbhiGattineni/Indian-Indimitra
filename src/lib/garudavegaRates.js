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
];

// Total charges (INR, GST included) by weight (kg) and tier.
export const GARUDAVEGA_RATE_CARD = [
  { weightKg: 1, priority: 3486, saver: 3093, economy: 2651 },
  { weightKg: 3, priority: 5151, saver: 5163, economy: 4580 },
  { weightKg: 5, priority: 7101, saver: 7459, economy: 6046 },
  { weightKg: 7, priority: 9126, saver: 9818, economy: 7748 },
  { weightKg: 9, priority: 10479, saver: 11617, economy: 9030 },
  { weightKg: 10, priority: 10801, saver: 12224, economy: 9749 },
  { weightKg: 12, priority: 12961, saver: 14617, economy: 11273 },
  { weightKg: 15, priority: 16124, saver: 18206, economy: 13563 },
];

export const DEFAULT_USD_INR_RATE = 95;

export function formatUSD(inrAmount, usdInrRate) {
  const rate = Number(usdInrRate) > 0 ? Number(usdInrRate) : DEFAULT_USD_INR_RATE;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(inrAmount || 0) / rate);
}

// Extra cost (and per-kg rate) of stepping up to this row from the previous
// published weight, per tier — the "is 10kg basically the same as 9kg?" view.
export function withDeltas(card = GARUDAVEGA_RATE_CARD) {
  return card.map((row, i) => {
    if (i === 0) return { ...row, deltaKg: null };
    const prev = card[i - 1];
    const deltaKg = row.weightKg - prev.weightKg;
    const delta = {};
    SERVICE_TIERS.forEach(({ key }) => {
      delta[key] = { extra: row[key] - prev[key], perKg: (row[key] - prev[key]) / deltaKg };
    });
    return { ...row, deltaKg, delta };
  });
}
