import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, Button, Chip, CircularProgress, Alert,
} from '@mui/material';
import { useAuthStore } from '../../store/useAuthStore';
import { getStoreByOwner, listProductsByStore, listOrdersByStore } from '../../firebase/db';
import { formatINR } from '../../lib/calculations';
import { ORDER_STATUS, STORE_STATUS } from '../../lib/constants';

export default function SellerDashboard() {
  const { user } = useAuthStore();
  const [store, setStore] = useState(null);
  const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const s = await getStoreByOwner(user.uid);
      setStore(s);
      if (s) {
        const [products, orders] = await Promise.all([
          listProductsByStore(s.id), listOrdersByStore(s.id),
        ]);
        const revenue = orders
          .filter((o) => o.status === ORDER_STATUS.DELIVERED)
          .reduce((sum, o) => sum + (o.sellerNetAmount || 0), 0);
        const pending = orders.filter((o) => o.status === ORDER_STATUS.PLACED).length;
        setStats({ products: products.length, orders: orders.length, revenue, pending });
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h5">{store?.name || 'Seller dashboard'}</Typography>
        {store && (
          <Chip
            label={store.approvalStatus}
            color={store.approvalStatus === STORE_STATUS.APPROVED ? 'success' : 'warning'}
          />
        )}
      </Box>

      {store?.approvalStatus !== STORE_STATUS.APPROVED && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Your store is not approved yet. Listings you create may not be visible until an admin approves your store.
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Stat label="Listings" value={stats.products} />
        <Stat label="Total orders" value={stats.orders} />
        <Stat label="Pending orders" value={stats.pending} />
        <Stat label="Earnings (net)" value={formatINR(stats.revenue)} />
      </Grid>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="contained" component={Link} to="/seller/listings">Manage listings</Button>
        <Button variant="outlined" component={Link} to="/seller/orders">View orders</Button>
        <Button variant="outlined" component={Link} to="/seller/reviews">Reviews</Button>
      </Box>
    </Box>
  );
}

function Stat({ label, value }) {
  return (
    <Grid item xs={6} md={3}>
      <Card>
        <CardContent>
          <Typography color="text.secondary" variant="body2">{label}</Typography>
          <Typography variant="h5">{value}</Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}
