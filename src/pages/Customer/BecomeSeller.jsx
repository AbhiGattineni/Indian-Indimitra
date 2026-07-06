import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Stack, Alert, Chip,
} from '@mui/material';
import { useAuthStore } from '../../store/useAuthStore';
import { createStore, getStoreByOwner } from '../../firebase/db';
import { STORE_STATUS } from '../../lib/constants';

export default function BecomeSeller() {
  const { user } = useAuthStore();
  const [existing, setExisting] = useState(null);
  const [form, setForm] = useState({
    name: '', description: '', pickupAddress: '',
    shippingFlatFee: 0, freeShippingThreshold: 0,
    pan: '', gst: '', payoutMethod: 'UPI', payoutDetails: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => { if (user) setExisting(await getStoreByOwner(user.uid)); })();
  }, [user]);

  const submit = async () => {
    if (!form.name || !form.pickupAddress) {
      setError('Store name and pickup address are required.');
      return;
    }
    setError('');
    try {
      await createStore(user.uid, {
        name: form.name,
        description: form.description,
        pickupAddress: form.pickupAddress,
        shippingFlatFee: Number(form.shippingFlatFee) || 0,
        freeShippingThreshold: Number(form.freeShippingThreshold) || 0,
        images: [],
        kyc: {
          pan: form.pan, gst: form.gst,
          payoutMethod: form.payoutMethod, payoutDetails: form.payoutDetails,
          docUrls: [],
        },
      });
      setSubmitted(true);
    } catch (e) {
      setError(e.message);
    }
  };

  if (existing || submitted) {
    const status = existing?.approvalStatus || STORE_STATUS.PENDING;
    return (
      <Box sx={{ maxWidth: 560 }}>
        <Typography variant="h5" gutterBottom>Seller application</Typography>
        <Paper sx={{ p: 3 }}>
          <Typography sx={{ mb: 1 }}>
            Store: <strong>{existing?.name || form.name}</strong>
          </Typography>
          <Chip
            label={`Status: ${status}`}
            color={status === STORE_STATUS.APPROVED ? 'success'
              : status === STORE_STATUS.REJECTED ? 'error' : 'warning'}
          />
          {status === STORE_STATUS.PENDING && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Your application is pending admin approval. Once approved you can start listing products.
            </Alert>
          )}
          {status === STORE_STATUS.REJECTED && existing?.rejectionReason && (
            <Alert severity="error" sx={{ mt: 2 }}>Reason: {existing.rejectionReason}</Alert>
          )}
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 560 }}>
      <Typography variant="h5" gutterBottom>Become a seller</Typography>
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <TextField label="Store name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="Description" multiline rows={2} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <TextField label="Pickup address" value={form.pickupAddress}
            onChange={(e) => setForm({ ...form, pickupAddress: e.target.value })} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Flat shipping fee (₹)" type="number" value={form.shippingFlatFee}
              onChange={(e) => setForm({ ...form, shippingFlatFee: e.target.value })} fullWidth />
            <TextField label="Free shipping over (₹)" type="number" value={form.freeShippingThreshold}
              onChange={(e) => setForm({ ...form, freeShippingThreshold: e.target.value })} fullWidth />
          </Box>
          <Typography variant="subtitle2" color="text.secondary">
            KYC / payout (informational for cash-payment MVP)
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="PAN" value={form.pan}
              onChange={(e) => setForm({ ...form, pan: e.target.value })} fullWidth />
            <TextField label="GST (optional)" value={form.gst}
              onChange={(e) => setForm({ ...form, gst: e.target.value })} fullWidth />
          </Box>
          <TextField label="Payout details (UPI ID / bank a/c)" value={form.payoutDetails}
            onChange={(e) => setForm({ ...form, payoutDetails: e.target.value })} />
          {error && <Alert severity="error">{error}</Alert>}
          <Button variant="contained" onClick={submit}>Submit application</Button>
        </Stack>
      </Paper>
    </Box>
  );
}
