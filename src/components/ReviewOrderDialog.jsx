// Guided review flow for a delivered order: one star+comment step per item,
// then a final "overall order" step (delivery, packaging, timing, etc). Star
// rating is mandatory on every step; the comment is always optional. Nothing
// is written until the final Submit, so backing up or cancelling mid-flow
// discards nothing already saved.
import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, TextField, Rating, Alert,
} from '@mui/material';
import {
  getReview, upsertReview, getOrderFeedback, upsertOrderFeedback,
} from '../firebase/db';
import { reviewId } from '../lib/reviews';
import { useAuthStore } from '../store/useAuthStore';

export default function ReviewOrderDialog({ order, onClose, onSaved }) {
  const { user, profile } = useAuthStore();
  const items = order?.items || [];
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [productId|'overall']: { rating, text } }
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!order || !user) return;
    setReady(false);
    setStepIndex(0);
    setError('');
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

  const isOverallStep = stepIndex === items.length;
  const currentItem = isOverallStep ? null : items[stepIndex];
  const currentKey = isOverallStep ? 'overall' : currentItem.productId;
  const current = answers[currentKey] || { rating: 0, text: '' };

  const setCurrent = (patch) => setAnswers((a) => ({ ...a, [currentKey]: { ...current, ...patch } }));

  const back = () => { setError(''); setStepIndex((s) => Math.max(0, s - 1)); };

  const next = async () => {
    if (!current.rating) {
      setError('Please select a star rating.');
      return;
    }
    setError('');
    if (!isOverallStep) {
      setStepIndex((s) => s + 1);
      return;
    }
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
    <Dialog open={!!order} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {isOverallStep ? 'Overall order review' : `Rate ${currentItem.name}`}
        <Typography variant="caption" color="text.secondary" display="block">
          {isOverallStep ? 'Last step' : `Item ${stepIndex + 1} of ${items.length}`}
        </Typography>
      </DialogTitle>
      <DialogContent>
        {ready && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {isOverallStep && (
              <Typography variant="body2" color="text.secondary">
                How was the delivery, packaging, and overall experience?
              </Typography>
            )}
            <Rating size="large" value={current.rating} onChange={(_, v) => setCurrent({ rating: v })} />
            <TextField
              label="Your review (optional)"
              placeholder="What did you think?"
              multiline
              minRows={3}
              value={current.text}
              onChange={(e) => setCurrent({ text: e.target.value })}
            />
            {error && <Alert severity="error">{error}</Alert>}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ mr: 'auto' }} disabled={saving}>Cancel</Button>
        {stepIndex > 0 && <Button onClick={back} disabled={saving}>Back</Button>}
        <Button variant="contained" onClick={next} disabled={!ready || saving}>
          {isOverallStep ? (saving ? 'Submitting…' : 'Submit') : 'Next'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
