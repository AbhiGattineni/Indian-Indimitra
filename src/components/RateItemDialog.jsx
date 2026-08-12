// Lets a customer rate/review one product from a delivered order — one
// review per product per customer (editable/deletable anytime), keyed by a
// deterministic doc id so submitting again from a later order just edits it.
import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, TextField, Rating, Alert,
} from '@mui/material';
import { getReview, upsertReview, deleteReview } from '../firebase/db';
import { reviewId } from '../lib/reviews';
import { useAuthStore } from '../store/useAuthStore';

export default function RateItemDialog({ item, storeId, onClose, onSaved }) {
  const { user, profile } = useAuthStore();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [existing, setExisting] = useState(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!item || !user) return;
    setReady(false);
    setError('');
    getReview(reviewId(item.productId, user.uid)).then((r) => {
      setExisting(r);
      setRating(r?.rating || 0);
      setText(r?.text || '');
      setReady(true);
    });
  }, [item?.productId, user?.uid]);

  if (!item) return null;

  const save = async () => {
    if (!rating) {
      setError('Please select a star rating.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const id = reviewId(item.productId, user.uid);
      await upsertReview(id, {
        productId: item.productId,
        storeId,
        customerUid: user.uid,
        customerName: profile?.displayName || user.email || 'Customer',
        rating,
        text: text.trim(),
        ...(existing ? {} : { createdAt: new Date().toISOString() }),
      });
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await deleteReview(reviewId(item.productId, user.uid));
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!item} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Rate {item.name}</DialogTitle>
      <DialogContent>
        {ready && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Rating
              size="large"
              value={rating}
              onChange={(_, v) => setRating(v)}
            />
            <TextField
              label="Your review (optional)"
              placeholder="What did you think?"
              multiline
              minRows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {error && <Alert severity="error">{error}</Alert>}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {existing && (
          <Button color="error" onClick={remove} disabled={saving} sx={{ mr: 'auto' }}>
            Delete
          </Button>
        )}
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={!ready || saving}>
          {existing ? 'Update' : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
