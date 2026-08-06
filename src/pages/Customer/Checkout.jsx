import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, TextField, Button, Divider, Stack, Alert, Chip, MenuItem,
} from '@mui/material';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import {
  getStore, getPlatformConfig, getShippingRates, createOrder, clearCart as clearCartDoc,
} from '../../firebase/db';
import {
  cartSubtotal, cartWeightKg, lineTotal, shippingFee, taxAmount, commissionAmount, formatINR,
} from '../../lib/calculations';
import { PAYMENT_METHOD } from '../../lib/constants';
import {
  SHIPPING_COUNTRIES, isDomestic, internationalShipping, countryName, billableWeight,
} from '../../lib/shipping';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, storeId, storeName, clear } = useCartStore();
  const { user } = useAuthStore();
  const [store, setStore] = useState(null);
  const [config, setConfig] = useState(null);
  const [shippingRates, setShippingRates] = useState(null);
  const [addr, setAddr] = useState({ line: '', city: '', pincode: '', phone: '' });
  const [country, setCountry] = useState('US');
  const [placing, setPlacing] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState('');

  const phoneDigits = addr.phone.replace(/\D/g, '');
  const phoneValid = phoneDigits.length >= 10;

  useEffect(() => {
    (async () => {
      if (storeId) setStore(await getStore(storeId));
      setConfig(await getPlatformConfig());
      setShippingRates(await getShippingRates());
    })();
  }, [storeId]);

  if (items.length === 0) {
    return <Typography>Your cart is empty.</Typography>;
  }

  // Shipping is country-aware: India keeps the store's domestic flat/free rule;
  // any other country pays a weight-based estimate so we never absorb shipping.
  const totalKg = cartWeightKg(items);
  const subtotal = +cartSubtotal(items).toFixed(2);
  const intl = !isDomestic(country);
  const shipping = intl
    ? internationalShipping(country, totalKg, shippingRates)
    : +shippingFee(subtotal, store).toFixed(2);
  const tax = taxAmount(subtotal, config);
  const commission = commissionAmount(subtotal, config);
  const total = +(subtotal + shipping + tax).toFixed(2);
  const sellerNet = +(subtotal - commission).toFixed(2);
  const totals = { subtotal, shipping, tax, commission, total, sellerNet };

  const placeOrder = async () => {
    setAttempted(true);
    if (!addr.line || !addr.city || !addr.pincode) {
      setError('Please fill in the full delivery address.');
      return;
    }
    if (!phoneValid) {
      setError('A valid phone number is required to place the order.');
      return;
    }
    setError('');
    setPlacing(true);
    try {
      const orderData = {
        customerUid: user.uid,
        customerEmail: user.email || '', // used by the server-side order-email function
        storeId,
        storeName,
        items: items.map((i) => ({ ...i, lineTotal: lineTotal(i) })),
        subtotal: totals.subtotal,
        shippingFee: totals.shipping,
        taxAmount: totals.tax,
        commissionAmount: totals.commission,
        sellerNetAmount: totals.sellerNet,
        total: totals.total,
        paymentMethod: PAYMENT_METHOD.COD,
        shippingAddress: { ...addr, country, countryName: countryName(country) },
        shipment: { courierName: '', trackingNumber: '', trackingUrl: '' },
      };
      // A Cloud Function (onNewOrderEmail) sends the operator notification
      // server-side when this doc is created — no email logic/secrets in the client.
      const ref = await createOrder(orderData);
      // Best-effort clear of the persisted cart doc.
      try { await clearCartDoc(user.uid, storeId); } catch { /* ignore */ }
      clear();
      navigate('/orders', { state: { justPlaced: ref.id } });
    } catch (e) {
      setError(e.message);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Checkout
      </Typography>
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Paper sx={{ p: 3, flex: 1, minWidth: 300 }}>
          <Typography variant="h6" gutterBottom>
            Delivery address
          </Typography>
          <Stack spacing={2}>
            <TextField
              select
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              helperText={
                intl
                  ? 'International orders include shipping, charged at cost.'
                  : 'Free shipping within India (over the store threshold).'
              }
              fullWidth
            >
              {SHIPPING_COUNTRIES.map((c) => (
                <MenuItem key={c.code} value={c.code}>{c.name}</MenuItem>
              ))}
            </TextField>
            <TextField label="Address line" value={addr.line}
              onChange={(e) => setAddr({ ...addr, line: e.target.value })} fullWidth />
            <TextField label="City" value={addr.city}
              onChange={(e) => setAddr({ ...addr, city: e.target.value })} fullWidth />
            <TextField label={intl ? 'ZIP / Postal code' : 'Pincode'} value={addr.pincode}
              onChange={(e) => setAddr({ ...addr, pincode: e.target.value })} fullWidth />
            <TextField
              label="Phone number"
              required
              type="tel"
              value={addr.phone}
              onChange={(e) => setAddr({ ...addr, phone: e.target.value })}
              error={attempted && !phoneValid}
              helperText={
                attempted && !phoneValid
                  ? 'A valid phone number (at least 10 digits) is required.'
                  : "We'll use this to coordinate your delivery."
              }
              fullWidth
            />
          </Stack>
        </Paper>

        <Paper sx={{ p: 3, width: 320 }}>
          <Typography variant="h6" gutterBottom>
            Order summary
          </Typography>
          <Row label="Subtotal" value={formatINR(totals.subtotal)} />
          <Row
            label={intl ? `Shipping to ${countryName(country)}` : 'Shipping'}
            value={totals.shipping ? formatINR(totals.shipping) : 'Free'}
          />
          {intl && (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Billable weight {billableWeight(totalKg)} kg (of {totalKg.toFixed(2)} kg) — shipping charged at cost.
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontStyle: 'italic' }}>
                {shippingRates?.disclaimer}
                {shippingRates?.ratesAsOf ? ` (Rates as of ${shippingRates.ratesAsOf}.)` : ''}
              </Typography>
            </>
          )}
          <Row label="Tax" value={formatINR(totals.tax)} />
          <Divider sx={{ my: 1 }} />
          <Row label="Total" value={formatINR(totals.total)} bold />
          <Box sx={{ mt: 2 }}>
            <Chip color="secondary" label="Payment: Cash payment" />
          </Box>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          <Button
            fullWidth variant="contained" size="large" sx={{ mt: 2 }}
            onClick={placeOrder} disabled={placing}
          >
            Place order
          </Button>
        </Paper>
      </Box>
    </Box>
  );
}

function Row({ label, value, bold }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
      <Typography fontWeight={bold ? 700 : 400}>{label}</Typography>
      <Typography fontWeight={bold ? 700 : 400}>{value}</Typography>
    </Box>
  );
}
