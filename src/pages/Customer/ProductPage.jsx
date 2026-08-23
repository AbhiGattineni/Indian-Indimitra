import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import {
  Box, Grid, Typography, Button, Paper, Chip, CircularProgress, Snackbar,
} from '@mui/material';
import { db } from '../../firebase/config';
import { getStore } from '../../firebase/db';
import { useCartStore } from '../../store/useCartStore';
import { formatINR, customerPricePerKg } from '../../lib/calculations';
import { placeholderImage } from '../../lib/placeholder';
import AddToCartDialog from '../../components/AddToCartDialog';

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const [product, setProduct] = useState(null);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, 'products', id));
      if (snap.exists()) {
        const p = { id: snap.id, ...snap.data() };
        setProduct(p);
        if (p.storeId) setStore(await getStore(p.storeId));
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!product) return <Typography>Product not found.</Typography>;

  const handleConfirm = ({ grams, qty, instructions }) => {
    addItem(product.storeId, store?.name || '', product, grams, qty, instructions);
    setToast(true);
  };

  return (
    <Box>
      <Grid container spacing={4}>
        <Grid item xs={12} md={5}>
          <Box
            component="img"
            src={product.imageUrl || placeholderImage(product.name)}
            alt={product.name}
            sx={{ width: '100%', borderRadius: 2 }}
          />
        </Grid>
        <Grid item xs={12} md={7}>
          <Typography variant="h4" gutterBottom>
            {product.name}
          </Typography>
          {store && <Chip label={`Sold by ${store.name}`} size="small" sx={{ mb: 2 }} />}
          <Typography variant="h5" color="primary" gutterBottom>
            {formatINR(customerPricePerKg(product.price))}{' '}
            <Typography component="span" color="text.secondary">
              / {product.unit}
            </Typography>
          </Typography>
          <Typography sx={{ my: 2 }}>{product.description}</Typography>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              In stock: {product.quantity} {product.unit}
            </Typography>
          </Paper>
          <Button
            variant="contained"
            size="large"
            onClick={() => setDialogOpen(true)}
            disabled={!product.quantity}
          >
            Add to cart
          </Button>
          <Button sx={{ ml: 2 }} onClick={() => navigate('/cart')}>
            Go to cart
          </Button>
        </Grid>
      </Grid>
      <AddToCartDialog
        open={dialogOpen}
        product={product}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirm}
      />
      <Snackbar
        open={toast}
        autoHideDuration={2000}
        onClose={() => setToast(false)}
        message="Added to cart"
      />
    </Box>
  );
}
