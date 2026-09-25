// Quick-view "mini ordering page": a compact single-column card — image
// banner up top, everything else (info, controls, Add to Cart) in one dense
// content block below, so there's no wasted whitespace from redundant
// padded sections or a mismatched image/content split.
import { useEffect, useState } from 'react';
import {
  Dialog, IconButton, Box, Typography, Button, Chip, Divider, Snackbar,
  ToggleButton, ToggleButtonGroup, TextField, Paper, Badge, Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCartCheckout';
import { useCartStore } from '../store/useCartStore';
import {
  formatINR, formatSaleAmount, lineTotal as computeLineTotal, customerPrice,
} from '../lib/calculations';
import { piecesForGrams } from '../lib/pieceWeights';
import { placeholderImage } from '../lib/placeholder';
import ProductReviews from './ProductReviews';

const WEIGHT_OPTIONS = [
  { amount: 250, label: '250 g' },
  { amount: 500, label: '500 g' },
  { amount: 1000, label: '1 kg' },
];
const VOLUME_OPTIONS = [
  { amount: 250, label: '250 ml' },
  { amount: 500, label: '500 ml' },
  { amount: 1000, label: '1 L' },
];

export default function ProductModal({ open, product, storeId, storeName, onClose }) {
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const cartItems = useCartStore((s) => s.items);
  const [qty, setQty] = useState(1);
  const [amount, setAmount] = useState(1000);
  const [instructions, setInstructions] = useState('');
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (open) { setQty(1); setAmount(1000); setInstructions(''); }
  }, [open, product?.id]);

  if (!product) return null;

  const unitType = product.unitType || 'weight';
  const isPiece = unitType === 'piece';
  const tierOptions = unitType === 'volume' ? VOLUME_OPTIONS : WEIGHT_OPTIONS;
  const outOfStock = !product.quantity;
  const displayPrice = customerPrice(product);
  const unitPrice = isPiece ? displayPrice : displayPrice * (amount / 1000); // price for the selected tier
  const lineTotal = unitPrice * qty;

  // Existing cart lines for this product (one per tier selected so far, or
  // the single line for a piece product) — shown so re-opening the modal
  // doesn't hide what's already been added.
  const existingLines = cartItems
    .filter((i) => i.productId === product.id)
    .sort((a, b) => (a.grams || a.milliliters || 0) - (b.grams || b.milliliters || 0));

  const handleAdd = () => {
    addItem(storeId, storeName, product, isPiece ? 1 : amount, qty, instructions.trim());
    setToast(true);
    onClose();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xs"
        fullWidth
        scroll="body"
        BackdropProps={{ sx: { backgroundColor: 'rgba(15, 15, 15, 0.72)' } }}
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 32px 64px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.06)',
            my: { xs: 2, sm: 4 },
          },
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <Box
            component="img"
            src={product.imageUrl || placeholderImage(product.name)}
            alt={product.name}
            sx={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', bgcolor: 'grey.100', display: 'block' }}
          />
          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute', top: 8, right: 8,
              bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.25 }}>
              {product.name}
            </Typography>
            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
              <Typography variant="h6" color="primary.main" fontWeight={700} sx={{ lineHeight: 1.25 }}>
                {formatINR(displayPrice)}
              </Typography>
              <Typography variant="caption" color="text.secondary">/ {product.unit}</Typography>
            </Box>
          </Box>

          {outOfStock ? (
            <Chip label="Sold out" size="small" sx={{ alignSelf: 'flex-start' }} />
          ) : (
            <Typography variant="caption" color="text.secondary">
              In stock: {product.quantity} {product.unit}
            </Typography>
          )}

          {product.warning && (
            <Alert severity="error" icon={<WarningAmberIcon fontSize="small" />} sx={{ py: 0.25 }}>
              {product.warning}
            </Alert>
          )}

          {product.description && (
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
              {product.description}
            </Typography>
          )}

          <ProductReviews productId={product.id} />

          {existingLines.length > 0 && (
            <Paper variant="outlined" sx={{ p: 1.25 }}>
              <Typography variant="caption" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <ShoppingCartCheckoutIcon sx={{ fontSize: 15 }} color="primary" />
                Already in your cart
              </Typography>
              {existingLines.map((line) => (
                <Box key={line.lineId} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2">
                    {formatSaleAmount(line)} × {line.qty}
                    {line.instructions && (
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                        ({line.instructions})
                      </Typography>
                    )}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                    <Typography variant="body2" fontWeight={600}>{formatINR(computeLineTotal(line))}</Typography>
                    <IconButton size="small" onClick={() => removeItem(line.lineId)} aria-label="Remove from cart">
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Paper>
          )}

          <Divider />

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {!isPiece && (
              <Box sx={{ flex: '1 1 auto' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                  {unitType === 'volume' ? 'Volume' : 'Weight'}
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={amount}
                  onChange={(_, v) => v && setAmount(v)}
                  disabled={outOfStock}
                >
                  {tierOptions.map((w) => {
                    const pieces = unitType === 'weight' ? piecesForGrams(product.name, w.amount) : null;
                    const tierKey = unitType === 'volume' ? 'milliliters' : 'grams';
                    const inCartQty = existingLines.find((l) => l[tierKey] === w.amount)?.qty || 0;
                    return (
                      <ToggleButton key={w.amount} value={w.amount} sx={{ px: 1.25, fontWeight: 600, textTransform: 'none' }}>
                        <Badge
                          badgeContent={inCartQty}
                          color="primary"
                          sx={{ '& .MuiBadge-badge': { top: -8, right: -8 } }}
                        >
                          {w.label}{pieces ? ` (~${pieces})` : ''}
                        </Badge>
                      </ToggleButton>
                    );
                  })}
                </ToggleButtonGroup>
              </Box>
            )}

            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                Quantity
              </Typography>
              <Box
                sx={{
                  display: 'flex', alignItems: 'center', border: '1.5px solid', borderColor: 'primary.main',
                  borderRadius: 2, opacity: outOfStock ? 0.4 : 1, width: 'fit-content',
                }}
              >
                <IconButton size="small" disabled={outOfStock || qty <= 1}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}>
                  <RemoveIcon fontSize="small" />
                </IconButton>
                <Typography sx={{ minWidth: 24, textAlign: 'center', fontWeight: 700 }}>
                  {qty}
                </Typography>
                <IconButton size="small" disabled={outOfStock}
                  onClick={() => setQty((q) => q + 1)}>
                  <AddIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </Box>

          <TextField
            label="Special instructions (optional)"
            placeholder="e.g. less sweet, extra crispy…"
            multiline
            minRows={1}
            size="small"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            disabled={outOfStock}
            fullWidth
          />

          <Divider sx={{ borderStyle: 'dashed' }} />

          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} component="span">
                Total
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {isPiece ? 'Each' : tierOptions.find((w) => w.amount === amount)?.label} × {qty} @ {formatINR(unitPrice)}
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
            sx={{ py: 1.1, fontWeight: 600 }}
          >
            {outOfStock ? 'Unavailable' : 'Add to Cart'}
          </Button>
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
