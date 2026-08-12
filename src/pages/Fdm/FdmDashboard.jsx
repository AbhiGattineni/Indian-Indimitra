// Forward Deployment Manager home: the businesses assigned to me, each with a
// snapshot, a button to open its live storefront, and a button to manage it.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, Button, Chip, CircularProgress, Divider, Alert,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useAuthStore } from '../../store/useAuthStore';
import { useStoreSelection } from '../../store/useStoreSelection';
import { listStoresByFdm, listProductsByStore, listOrdersByStore } from '../../firebase/db';
import { formatINR } from '../../lib/calculations';
import { ORDER_STATUS, STORE_STATUS } from '../../lib/constants';

export default function FdmDashboard() {
  const { user, profile } = useAuthStore();
  const setStore = useStoreSelection((s) => s.setStore);
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        // Load the assigned businesses first so we can render them even if the
        // per-store stats (orders/products) fail or are slow.
        const stores = await listStoresByFdm(user.uid);
        if (!cancelled) setRows(stores.map((store) => ({ store, stats: null })));

        // Then enrich each with stats independently; a failure on one store
        // (e.g. a transient read error) never blanks the whole page.
        const enriched = await Promise.all(
          stores.map(async (store) => {
            try {
              const [products, orders] = await Promise.all([
                listProductsByStore(store.id),
                listOrdersByStore(store.id),
              ]);
              const revenue = orders
                .filter((o) => o.status === ORDER_STATUS.DELIVERED)
                .reduce((sum, o) => sum + (o.total || 0), 0);
              const openOrders = orders.filter(
                (o) => o.status === ORDER_STATUS.PLACED || o.status === ORDER_STATUS.ACCEPTED
              ).length;
              return { store, stats: { products: products.length, orders: orders.length, openOrders, revenue } };
            } catch (e) {
              console.error(`Failed to load stats for store ${store.id}`, e);
              return { store, stats: null };
            }
          })
        );
        if (!cancelled) setRows(enriched);
      } catch (e) {
        console.error('Failed to load assigned businesses', e);
        if (!cancelled) setError('Could not load your businesses. Please refresh.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const openStorefront = (store) => {
    setStore(store);
    navigate('/');
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>My businesses</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Businesses assigned to you by Indimitra. You run each one end to end.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {rows.length === 0 ? (
        <Alert severity="info">
          No businesses are assigned to you yet
          {profile?.email || user?.email ? ` (signed in as ${profile?.email || user?.email})` : ''}.
          An admin assigns businesses from Admin → Users &amp; Roles or Admin → Managers.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {rows.map(({ store, stats }) => (
            <Grid item xs={12} sm={6} md={4} key={store.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <StorefrontIcon color="primary" fontSize="small" />
                    <Typography variant="h6" noWrap sx={{ flex: 1 }}>{store.name}</Typography>
                    <Chip
                      size="small"
                      label={store.approvalStatus}
                      color={store.approvalStatus === STORE_STATUS.APPROVED ? 'success' : 'warning'}
                    />
                  </Box>
                  {store.pickupAddress && (
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 1.5 }}>
                      {store.pickupAddress}
                    </Typography>
                  )}
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <Stat label="Products" value={stats ? stats.products : '—'} />
                    <Stat label="Open orders" value={stats ? stats.openOrders : '—'} highlight={stats?.openOrders > 0} />
                    <Stat label="Total orders" value={stats ? stats.orders : '—'} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    Delivered revenue: <b>{stats ? formatINR(stats.revenue) : '—'}</b>
                  </Typography>
                </CardContent>
                <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
                  <Button
                    fullWidth variant="contained" size="small"
                    onClick={() => navigate(`/fdm/manage/${store.id}`)}
                  >
                    Manage
                  </Button>
                  <Button
                    fullWidth variant="outlined" size="small"
                    startIcon={<OpenInNewIcon />}
                    onClick={() => openStorefront(store)}
                  >
                    Storefront
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <Box>
      <Typography variant="h6" color={highlight ? 'primary.main' : 'text.primary'} fontWeight={700}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Box>
  );
}
