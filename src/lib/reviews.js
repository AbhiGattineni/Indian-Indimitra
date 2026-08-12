// Client-side helpers for turning a flat list of review docs into the
// aggregates the UI needs (overall avg/count for one product, or a
// per-product map when a whole store's reviews were fetched at once).
export function aggregateRatings(reviews = []) {
  if (reviews.length === 0) return null;
  const total = reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0);
  return { avg: total / reviews.length, count: reviews.length };
}

export function ratingsByProduct(reviews = []) {
  const buckets = {};
  reviews.forEach((r) => {
    const b = buckets[r.productId] || (buckets[r.productId] = { total: 0, count: 0 });
    b.total += Number(r.rating || 0);
    b.count += 1;
  });
  return Object.fromEntries(
    Object.entries(buckets).map(([productId, { total, count }]) => [productId, { avg: total / count, count }])
  );
}

// Deterministic id enforces "one review per product per customer" and lets
// upsert/delete address a review without a query.
export function reviewId(productId, uid) {
  return `${productId}_${uid}`;
}
