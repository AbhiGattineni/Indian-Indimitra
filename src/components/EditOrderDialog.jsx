// Lets a customer edit their own order's items while it's still `placed` —
// once a seller/FDM/admin accepts it, editing is locked (see MyOrders.jsx,
// which only renders the "Edit order" button for placed orders, and
// firestore.rules, which independently enforces the same cutoff).
import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, IconButton,
  ToggleButtonGroup, ToggleButton, TextField, Divider, MenuItem, Alert, CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  getStore, getPlatformConfig, getShippingRates, listProductsByStore, updateOrderItems,
} from '../firebase/db';
import {
  lineTotal, cartSubtotal, cartWeightKg, sellerSubtotal, shippingFee, taxAmount, commissionAmount,
  customerPricePerKg, formatINR, formatWeight,
} from '../lib/calculations';
import { isDomestic, internationalShipping, packedWeightKg } from '../lib/shipping';

const WEIGHT_OPTIONS = [
  { g: 250, label: '250 g' },
  { g: 500, label: '500 g' },
  { g: 1000, label: '1 kg' },
];

export default function EditOrderDialog({ order, onClose, onSaved }) {
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [store, setStore] = useState(null);
  const [config, setConfig] = useState(null);
  const [shippingRates, setShippingRates] = useState(null);
  const [ready, setReady] = useState(false);
  const [addProductId, setAddProductId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!order) return;
    setItems(order.items.map((it) => ({ ...it })));
    setReady(false);
    setError('');
    (async () => {
      const [s, cfg, rates, prods] = await Promise.all([
        getStore(order.storeId), getPlatformConfig(), getShippingRates(), listProductsByStore(order.storeId),
      ]);
      setStore(s);
      setConfig(cfg);
      setShippingRates(rates);
      setProducts(prods);
      setReady(true);
    })();
  }, [order?.id]);

  if (!order) return null;

  const updateQty = (lineId, delta) => {
    setItems((prev) => prev.map((it) => (
      it.lineId === lineId ? { ...it, qty: Math.max(1, it.qty + delta) } : it
    )));
  };
  const updateGrams = (lineId, grams) => {
    if (!grams) return;
    setItems((prev) => prev.map((it) => (it.lineId === lineId ? { ...it, grams } : it)));
  };
  const removeLine = (lineId) => setItems((prev) => prev.filter((it) => it.lineId !== lineId));

  const addProduct = () => {
    const p = products.find((x) => x.id === addProductId);
    if (!p) return;
    const grams = 1000;
    const lineId = `${p.id}_${grams}`;
    setItems((prev) => {
      const existing = prev.find((it) => it.lineId === lineId);
      if (existing) {
        return prev.map((it) => (it.lineId === lineId ? { ...it, qty: it.qty + 1 } : it));
      }
      return [...prev, {
        lineId, productId: p.id, name: p.name, price: customerPricePerKg(p.price), sellerPrice: p.price,
        grams, qty: 1, imageUrl: p.imageUrl || '', instructions: '',
      }];
    });
    setAddProductId('');
  };

  const country = order.shippingAddress?.country || 'IN';
  const withTotals = items.map((it) => ({ ...it, lineTotal: lineTotal(it) }));
  const subtotal = +cartSubtotal(withTotals).toFixed(2);
  const sellerSub = +sellerSubtotal(withTotals).toFixed(2);
  const margin = +(subtotal - sellerSub).toFixed(2);
  const totalKg = cartWeightKg(withTotals);
  const packedKg = packedWeightKg(totalKg);
  const intl = !isDomestic(country);
  const shipping = intl
    ? internationalShipping(country, packedKg, shippingRates)
    : +shippingFee(subtotal, store).toFixed(2);
  const tax = taxAmount(subtotal, config);
  const commission = commissionAmount(sellerSub, config);
  const total = +(subtotal + shipping + tax).toFixed(2);
  const sellerNet = +(sellerSub - commission).toFixed(2);

  const addableProducts = products.filter((p) => p.quantity !== 0);

  const save = async () => {
    if (items.length === 0) {
      setError('An order needs at least one item — remove the whole order via Cancel instead.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateOrderItems(order.id, {
        items: withTotals,
        subtotal,
        sellerSubtotal: sellerSub,
        marginAmount: margin,
        shippingFee: shipping,
        taxAmount: tax,
        commissionAmount: commission,
        sellerNetAmount: sellerNet,
        total,
      });
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
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Edit order #{order.id.slice(0, 6)}
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {!ready ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              You can edit this order until the store accepts it. Changes will be shown as strike-through
              next to the new values on the order.
            </Typography>

            {items.map((it) => (
              <Box key={it.lineId} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 0 }}>
                    {it.name}
                  </Typography>
                  <IconButton size="small" onClick={() => removeLine(it.lineId)} aria-label="Remove item">
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mt: 0.5 }}>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={it.grams}
                    onChange={(_, g) => updateGrams(it.lineId, g)}
                  >
                    {WEIGHT_OPTIONS.map((w) => (
                      <ToggleButton key={w.g} value={w.g} sx={{ px: 1.25, textTransform: 'none' }}>
                        {w.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                  <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <IconButton size="small" disabled={it.qty <= 1} onClick={() => updateQty(it.lineId, -1)}>
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                    <Typography sx={{ minWidth: 24, textAlign: 'center' }}>{it.qty}</Typography>
                    <IconButton size="small" onClick={() => updateQty(it.lineId, 1)}>
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography variant="body2" sx={{ ml: 'auto' }}>{formatINR(lineTotal(it))}</Typography>
                </Box>
              </Box>
            ))}

            {items.length === 0 && (
              <Typography color="text.secondary" sx={{ mb: 2 }}>No items left in this order.</Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                select size="small" label="Add an item" value={addProductId}
                onChange={(e) => setAddProductId(e.target.value)} sx={{ flex: 1 }}
              >
                {addableProducts.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name} — {formatINR(customerPricePerKg(p.price))}/kg</MenuItem>
                ))}
              </TextField>
              <Button variant="outlined" disabled={!addProductId} onClick={addProduct}>Add</Button>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Row label="Subtotal" value={formatINR(subtotal)} />
            <Row label="Shipping" value={shipping ? formatINR(shipping) : 'Free'} />
            {intl && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Total weight {packedKg.toFixed(2)} kg ({totalKg.toFixed(2)} kg product + packaging)
              </Typography>
            )}
            <Row label="Tax" value={formatINR(tax)} />
            <Row label="Total" value={formatINR(total)} bold />

            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!ready || saving} onClick={save}>
          Save changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Row({ label, value, bold }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.4 }}>
      <Typography fontWeight={bold ? 700 : 400}>{label}</Typography>
      <Typography fontWeight={bold ? 700 : 400}>{value}</Typography>
    </Box>
  );
}
