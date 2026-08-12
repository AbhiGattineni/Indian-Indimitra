// Per-piece weight (grams) for items naturally sold as discrete pieces, so
// the weight selector can show an approximate piece count alongside grams.
// Matched by product name (case-insensitive substring) — extend this map as
// more piece-style items get a confirmed per-piece weight.
const PIECE_WEIGHTS_BY_NAME = [
  { match: /bobbattlu/i, gramsPerPiece: 100 },
];

export function pieceWeightFor(productName) {
  const hit = PIECE_WEIGHTS_BY_NAME.find((p) => p.match.test(productName || ''));
  return hit?.gramsPerPiece || null;
}

// Approximate piece count for a given total weight, or null if this product
// isn't a known piece-style item.
export function piecesForGrams(productName, grams) {
  const perPiece = pieceWeightFor(productName);
  if (!perPiece) return null;
  return Math.max(1, Math.round(Number(grams) / perPiece));
}
