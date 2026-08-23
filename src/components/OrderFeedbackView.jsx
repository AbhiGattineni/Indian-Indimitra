// Displays a customer's order-level "other issues" feedback, if any.
// Admin/FDM-only — only rendered from admin/FDM contexts, and independently
// gated by firestore.rules (orderFeedback/{orderId}).
import { useEffect, useState } from 'react';
import { Box, Rating, Typography } from '@mui/material';
import { getOrderFeedback } from '../firebase/db';

export default function OrderFeedbackView({ orderId }) {
  const [feedback, setFeedback] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    setLoaded(false);
    getOrderFeedback(orderId)
      .then((f) => setFeedback(f))
      .catch(() => setFeedback(null))
      .finally(() => setLoaded(true));
  }, [orderId]);

  if (!loaded || !feedback) return null;

  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        Order feedback (other issues)
      </Typography>
      {feedback.rating && <Rating value={feedback.rating} readOnly size="small" />}
      {feedback.text && <Typography variant="body2">{feedback.text}</Typography>}
    </Box>
  );
}
