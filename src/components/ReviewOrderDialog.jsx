// Review flow for a delivered order: one scrollable form with a star rating
// + optional comment for every item (with its product image), followed by
// an overall order rating + optional comment -- all visible and editable at
// once, submitted together. Star rating is mandatory on every row.
import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, TextField, Rating, Alert, Divider,
} from '@mui/material';
import {
  getReview, upsertReview, getOrderFeedback, upsertOrderFeedback,
} from '../firebase/db';
import { reviewId } from '../lib/reviews';
import { placeholderImage } from '../lib/placeholder';
import { useAuthStore } from '../store/useAuthStore';

export default function ReviewOrderDialog({ order, onClose, onSaved }) {
  const { user, profile } = useAuthStore();
  const items = order?.items || [];
  const [answers, setAnswers] = useState({}); // { [productId|'overall']: { rating, text } }
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showMissing, setShowMissing] = useState(false);

  useEffect(() => {
    if (!order || !user) return;
    setReady(false);
    setError('');
    setShowMissing(false);
    Promise.all([
      Promise.all(items.map((it) => getReview(reviewId(it.productId, user.uid)))),
      getOrderFeedback(order.id),
    ]).then(([itemReviews, feedback]) => {
      const initial = {};
      items.forEach((it, i) => {
        initial[it.productId] = { rating: itemReviews[i]?.rating || 0, text: itemReviews[i]?.text || '' };
      });
      initial.overall = { rating: feedback?.rating || 0, text: feedback?.text || '' };
      setAnswers(initial);
      setReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, user?.uid]);

  if (!order) return null;

  const setAnswer = (key, patch) => setAnswers((a) => ({ ...a, [key]: { ...a[key], ...patch } }));

  const missingKeys = items.map((it) => it.productId).concat('overall')
    .filter((key) => !answers[key]?.rating);

  const submit = async () => {
    if (missingKeys.length > 0) {
      setShowMissing(true);
      setError('Please add a star rating for everything below.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const customerName = profile?.displayName || user.email || 'Customer';
      await Promise.all([
        ...items.map((it) => {
          const a = answers[it.productId];
          return upsertReview(reviewId(it.productId, user.uid), {
            productId: it.productId,
            storeId: order.storeId,
            customerUid: user.uid,
            customerName,
            rating: a.rating,
            text: (a.text || '').trim(),
          });
        }),
        upsertOrderFeedback(order.id, {
          orderId: order.id,
          customerUid: user.uid,
          customerName,
          rating: answers.overall.rating,
          text: (answers.overall.text || '').trim(),
        }),
      ]);
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!order} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Review order #{order.id.slice(0, 6)}
        <Typography variant="caption" color="text.secondary" display="block">
          A star rating is required for each item and the order overall — comments are optional.
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ maxHeight: '70vh' }}>
        {ready && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {items.map((it) => {
              const a = answers[it.productId] || { rating: 0, text: '' };
              const missing = showMissing && !a.rating;
              return (
                <Box key={it.lineId || it.productId}>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 1 }}>
                    <Box
                      component="img"
                      src={it.imageUrl || placeholderImage(it.name)}
                      alt={it.name}
                      sx={{ width: 48, height: 48, borderRadius: 1.5, objectFit: 'cover', flexShrink: 0 }}
                    />
                    <Typography fontWeight={600}>{it.name}</Typography>
                  </Box>
                  <Rating
                    size="large"
                    value={a.rating}
                    onChange={(_, v) => setAnswer(it.productId, { rating: v })}
                  />
                  {missing && (
                    <Typography variant="caption" color="error" display="block">
                      Please select a star rating.
                    </Typography>
                  )}
                  <TextField
                    fullWidth
                    label="Your review (optional)"
                    placeholder="What did you think?"
                    multiline
                    minRows={2}
                    value={a.text}
                    onChange={(e) => setAnswer(it.productId, { text: e.target.value })}
                    sx={{ mt: 1 }}
                  />
                </Box>
              );
            })}

            <Divider />

            <Box>
              <Typography fontWeight={600} gutterBottom>Overall order review</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                How was the delivery, packaging, and overall experience?
              </Typography>
              <Rating
                size="large"
                value={answers.overall?.rating || 0}
                onChange={(_, v) => setAnswer('overall', { rating: v })}
              />
              {showMissing && !answers.overall?.rating && (
                <Typography variant="caption" color="error" display="block">
                  Please select a star rating.
                </Typography>
              )}
              <TextField
                fullWidth
                label="Your review (optional)"
                placeholder="What did you think?"
                multiline
                minRows={2}
                value={answers.overall?.text || ''}
                onChange={(e) => setAnswer('overall', { text: e.target.value })}
                sx={{ mt: 1 }}
              />
            </Box>

            {error && <Alert severity="error">{error}</Alert>}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={!ready || saving}>
          {saving ? 'Submitting…' : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
