import { useEffect, useState } from 'react';
import {
  Box, Typography, Accordion, AccordionSummary, AccordionDetails, Button, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack, CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuthStore } from '../../store/useAuthStore';
import { getStoreByOwner, listOrdersByStore, updateOrder } from '../../firebase/db';
import { formatINR, formatWeight } from '../../lib/calculations';
import { ORDER_STATUS } from '../../lib/constants';
import OrderStatusChip from '../../components/OrderStatusChip';

// storeOverride lets an FDM (or admin) run a specific assigned store; sellers
// leave it undefined and their own owned store is looked up.
export default function SellerOrders({ storeOverride }) {
  const { user } = useAuthStore();
  const [store, setStore] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shipFor, setShipFor] = useState(null);
  const [ship, setShip] = useState({ courierName: '', trackingNumber: '', trackingUrl: '' });

  const load = async (s) => {
    const st = s || storeOverride || (await getStoreByOwner(user.uid));
    setStore(st);
    setOrders(await listOrdersByStore(st.id));
    setLoading(false);
  };
  useEffect(() => { if (user) load(storeOverride); }, [user, storeOverride?.id]);

  const setStatus = async (o, status) => {
    await updateOrder(o.id, { status });
    load(store);
  };

  const confirmShip = async () => {
    await updateOrder(shipFor.id, {
      status: ORDER_STATUS.SHIPPED,
      shipment: { ...ship, shippedAt: new Date().toISOString() },
    });
    setShipFor(null);
    setShip({ courierName: '', trackingNumber: '', trackingUrl: '' });
    load(store);
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Store orders</Typography>
      {orders.length === 0 && <Typography color="text.secondary">No orders yet.</Typography>}
      {orders.map((o) => (
        <Accordion key={o.id}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', width: '100%' }}>
              <Typography sx={{ flexGrow: 1 }}>#{o.id.slice(0, 6)}</Typography>
              <Typography>{formatINR(o.total)}</Typography>
              <OrderStatusChip status={o.status} />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {o.items?.map((it) => (
              <Box key={it.productId} sx={{ mb: 0.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">{it.name} ({formatWeight(it.grams)}) × {it.qty}</Typography>
                  <Typography variant="body2">{formatINR(it.lineTotal)}</Typography>
                </Box>
                {it.instructions && (
                  <Typography variant="caption" color="error.main" display="block">
                    Note: {it.instructions}
                  </Typography>
                )}
              </Box>
            ))}
            <Divider sx={{ my: 1 }} />
            <Typography variant="body2">
              Ship to: {o.shippingAddress?.line}, {o.shippingAddress?.city} — {o.shippingAddress?.pincode} ·
              ☎ {o.shippingAddress?.phone}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your net: {formatINR(o.sellerNetAmount)} (commission {formatINR(o.commissionAmount)})
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              {o.status === ORDER_STATUS.PLACED && (
                <>
                  <Button variant="contained" onClick={() => setStatus(o, ORDER_STATUS.ACCEPTED)}>Accept</Button>
                  <Button color="error" onClick={() => setStatus(o, ORDER_STATUS.CANCELLED)}>Reject</Button>
                </>
              )}
              {o.status === ORDER_STATUS.ACCEPTED && (
                <Button variant="contained" onClick={() => setShipFor(o)}>Mark shipped</Button>
              )}
              {o.status === ORDER_STATUS.SHIPPED && (
                <Button variant="contained" color="success"
                  onClick={() => setStatus(o, ORDER_STATUS.DELIVERED)}>Mark delivered</Button>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}

      <Dialog open={!!shipFor} onClose={() => setShipFor(null)} fullWidth maxWidth="xs">
        <DialogTitle>Shipment details</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Courier name" value={ship.courierName}
              onChange={(e) => setShip({ ...ship, courierName: e.target.value })} />
            <TextField label="Tracking number" value={ship.trackingNumber}
              onChange={(e) => setShip({ ...ship, trackingNumber: e.target.value })} />
            <TextField label="Tracking URL (optional)" value={ship.trackingUrl}
              onChange={(e) => setShip({ ...ship, trackingUrl: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShipFor(null)}>Cancel</Button>
          <Button variant="contained" onClick={confirmShip}>Confirm shipped</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
