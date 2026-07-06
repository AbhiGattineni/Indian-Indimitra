// Quick-view "mini ordering page": product image + full details on one side,
// a proper order-summary style footer (quantity, running total, Add to Cart)
// on the other — avoids a full page navigation while still feeling spacious.
import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, IconButton, Box, Typography, Button, Chip, Divider, Snackbar,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useCartStore } from '../store/useCartStore';
import { formatINR } from '../lib/calculations';
import { placeholderImage } from '../lib/placeholder';

const WEIGHT_OPTIONS = [
  { g: 250, label: '250 g' },
  { g: 500, label: '500 g' },
  { g: 1000, label: '1 kg' },
];

export default function ProductModal({ open, product, storeId, storeName, onClose }) {
  const addItem = useCartStore((s) => s.addItem);
  const [qty, setQty] = useState(1);
  const [grams, setGrams] = useState(1000);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (open) { setQty(1); setGrams(1000); }
  }, [open, product?.id]);

  if (!product) return null;

  const outOfStock = !product.quantity;
  const unitPrice = product.price * (grams / 1000); // price for the selected weight
  const lineTotal = unitPrice * qty;

  const handleAdd = () => {
    addItem(storeId, storeName, product, grams, qty);
    setToast(true);
    onClose();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        BackdropProps={{ sx: { backgroundColor: 'rgba(15, 15, 15, 0.72)' } }}
        PaperProps={{
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: '0 32px 64px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.06)',
          },
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute', top: 12, right: 12, zIndex: 2,
            bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' } }}>
          <Box
            component="img"
            src={product.imageUrl || placeholderImage(product.name)}
            alt={product.name}
            sx={{
              width: { xs: '100%', sm: 240 },
              height: { xs: 220, sm: 'auto' },
              flexShrink: 0,
              objectFit: 'cover',
            }}
          />

          <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="h5" fontWeight={700}>
                {product.name}
              </Typography>

              {product.description && (
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  {product.description}
                </Typography>
              )}

              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
                <Typography variant="h4" color="primary.main" fontWeight={700}>
                  {formatINR(product.price)}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  / {product.unit}
                </Typography>
              </Box>

              {outOfStock ? (
                <Chip label="Sold out" color="default" sx={{ alignSelf: 'flex-start', mt: 0.5 }} />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  In stock: {product.quantity} {product.unit}
                </Typography>
              )}
            </DialogContent>

            <Divider />

            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, bgcolor: 'grey.50' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Weight
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={grams}
                  onChange={(_, v) => v && setGrams(v)}
                  disabled={outOfStock}
                >
                  {WEIGHT_OPTIONS.map((w) => (
                    <ToggleButton key={w.g} value={w.g} sx={{ px: 1.75, fontWeight: 600, textTransform: 'none' }}>
                      {w.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Quantity
                </Typography>
                <Box
                  sx={{
                    display: 'flex', alignItems: 'center', border: '2px solid', borderColor: 'primary.main',
                    borderRadius: 2, opacity: outOfStock ? 0.4 : 1, bgcolor: 'background.paper',
                  }}
                >
                  <IconButton disabled={outOfStock || qty <= 1}
                    onClick={() => setQty((q) => Math.max(1, q - 1))}>
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  <Typography sx={{ minWidth: 32, textAlign: 'center', fontWeight: 700, fontSize: '1.05rem' }}>
                    {qty}
                  </Typography>
                  <IconButton disabled={outOfStock}
                    onClick={() => setQty((q) => q + 1)}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>

              <Divider sx={{ borderStyle: 'dashed' }} />

              <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} component="span">
                    Total
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {WEIGHT_OPTIONS.find((w) => w.g === grams)?.label} × {qty} @ {formatINR(unitPrice)}
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight={700}>
                  {formatINR(lineTotal)}
                </Typography>
              </Box>

              <Button
                variant="contained"
                size="large"
                startIcon={<ShoppingCartIcon />}
                disabled={outOfStock}
                onClick={handleAdd}
                sx={{ py: 1.4, fontWeight: 600, fontSize: '1rem' }}
              >
                {outOfStock ? 'Unavailable' : 'Add to Cart'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Dialog>

      <Snackbar
        open={toast}
        autoHideDuration={2000}
        onClose={() => setToast(false)}
        message="Added to cart"
      />
    </>
  );
}
