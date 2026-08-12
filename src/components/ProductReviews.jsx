// Aggregate rating + review list for one product. Renders nothing if the
// product has no reviews yet.
import { useEffect, useState } from 'react';
import { Box, Typography, Rating, Divider } from '@mui/material';
import { listReviewsByProduct } from '../firebase/db';
import { aggregateRatings } from '../lib/reviews';

function formatDate(value) {
  const d = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(d?.getTime()) ? '' : d.toLocaleDateString();
}

export default function ProductReviews({ productId }) {
  const [reviews, setReviews] = useState(null);

  useEffect(() => {
    if (!productId) return;
    setReviews(null);
    listReviewsByProduct(productId).then(setReviews).catch(() => setReviews([]));
  }, [productId]);

  if (!reviews || reviews.length === 0) return null;

  const sorted = [...reviews].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const { avg, count } = aggregateRatings(reviews);

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Rating value={avg} precision={0.1} readOnly size="small" />
        <Typography variant="body2" color="text.secondary">
          {avg.toFixed(1)} ({count} review{count === 1 ? '' : 's'})
        </Typography>
      </Box>
      {sorted.map((r, i) => (
        <Box key={r.id}>
          {i > 0 && <Divider sx={{ my: 1 }} />}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Rating value={r.rating} readOnly size="small" />
            <Typography variant="caption" fontWeight={600}>{r.customerName}</Typography>
            <Typography variant="caption" color="text.secondary">{formatDate(r.createdAt)}</Typography>
          </Box>
          {r.text && (
            <Typography variant="body2" sx={{ mt: 0.25 }}>{r.text}</Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}
