import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, ToggleButton,
  ToggleButtonGroup, TextField, Stack,
} from '@mui/material';
import { formatWeight } from '../lib/calculations';
import { piecesForGrams } from '../lib/pieceWeights';

const WEIGHT_OPTIONS = [250, 500, 1000];

export default function AddToCartDialog({ open, product, onClose, onConfirm }) {
  const [grams, setGrams] = useState(1000);
  const [qty, setQty] = useState(1);
  const [instructions, setInstructions] = useState('');

  if (!product) return null;

  const handleClose = () => {
    onClose();
    // Reset for next time this dialog opens on a (possibly different) product.
    setGrams(1000);
    setQty(1);
    setInstructions('');
  };

  const confirm = () => {
    onConfirm({ grams, qty, instructions: instructions.trim() });
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>{product.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>Weight</Typography>
            <ToggleButtonGroup
              exclusive value={grams}
              onChange={(_, v) => v !== null && setGrams(v)}
              size="small"
            >
              {WEIGHT_OPTIONS.map((g) => {
                const pieces = piecesForGrams(product.name, g);
                return (
                  <ToggleButton key={g} value={g} sx={{ textTransform: 'none' }}>
                    {formatWeight(g)}{pieces ? ` (~${pieces} pcs)` : ''}
                  </ToggleButton>
                );
              })}
            </ToggleButtonGroup>
          </Box>

          <TextField
            label="Quantity" type="number" value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            inputProps={{ min: 1 }}
            sx={{ width: 120 }}
          />

          <TextField
            label="Special instructions (optional)"
            placeholder="e.g. less sweet, extra crispy…"
            multiline minRows={2}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="contained" onClick={confirm}>Add to cart</Button>
      </DialogActions>
    </Dialog>
  );
}
