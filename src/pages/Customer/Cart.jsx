import {
  Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, IconButton, TableContainer,
  TextField, Button, Paper,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/useCartStore';
import { formatINR, cartSubtotal, lineTotal, formatWeight } from '../../lib/calculations';

export default function Cart() {
  const { items, storeName, setQty, removeItem } = useCartStore();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', mt: 6 }}>
        <Typography variant="h6" color="text.secondary">
          Your cart is empty.
        </Typography>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/')}>
          Browse products
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Cart {storeName && `— ${storeName}`}
      </Typography>
      <Paper variant="outlined">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>Weight</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="center">Qty</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.lineId}>
                  <TableCell>
                    {it.name}
                    {it.instructions && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Note: {it.instructions}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{formatWeight(it.grams)}</TableCell>
                  <TableCell align="right">
                    {formatINR(it.price * ((Number(it.grams) || 1000) / 1000))}
                  </TableCell>
                  <TableCell align="center">
                    <TextField
                      type="number"
                      size="small"
                      value={it.qty}
                      onChange={(e) => setQty(it.lineId, Math.max(0, Number(e.target.value)))}
                      sx={{ width: 70 }}
                      inputProps={{ min: 0 }}
                    />
                  </TableCell>
                  <TableCell align="right">{formatINR(lineTotal(it))}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => removeItem(it.lineId)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 3, alignItems: 'center' }}>
        <Typography variant="h6">Subtotal: {formatINR(cartSubtotal(items))}</Typography>
        <Button variant="contained" size="large" onClick={() => navigate('/checkout')}>
          Checkout
        </Button>
      </Box>
    </Box>
  );
}
