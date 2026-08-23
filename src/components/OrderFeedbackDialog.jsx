// Order-level feedback — for anything other than the items themselves
// (delivery, packaging, timing, etc.), separate from per-item product
// reviews. One per order, editable/deletable anytime. Admin/FDM-only
// visibility (see OrderFeedbackView + firestore.rules).
import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, TextField, Rating, Alert,
} from '@mui/material';
import { getOrderFeedback, upsertOrderFeedback, deleteOrderFeedback } from '../firebase/db';
import { useAuthStore } from '../store/useAuthStore';

export default function OrderFeedbackDialog({ order, onClose, onSaved }) {
  const { user, profile } = useAuthStore();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [existing, setExisting] = useState(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!order) return;
    setReady(false);
    setError('');
    getOrderFeedback(order.id).then((f) => {
      setExisting(f);
      setRating(f?.rating || 0);
      setText(f?.text || '');
      setReady(true);
    });
  }, [order?.id]);

  if (!order) return null;

  const save = async () => {
    if (!rating && !text.trim()) {
      setError('Please add a rating or a comment.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await upsertOrderFeedback(order.id, {
        orderId: order.id,
        customerUid: user.uid,
        customerName: profile?.displayName || user.email || 'Customer',
        rating: rating || null,
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
      await deleteOrderFeedback(order.id);
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
      <DialogTitle>Feedback about order #{order.id.slice(0, 6)}</DialogTitle>
      <DialogContent>
        {ready && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              For anything other than the items themselves — delivery, packaging, timing, or any other issue.
            </Typography>
            <Rating size="large" value={rating} onChange={(_, v) => setRating(v)} />
            <TextField
              label="Your feedback"
              placeholder="What happened?"
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
