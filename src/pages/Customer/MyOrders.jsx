import { useEffect, useState } from 'react';
import {
  Box, Typography, Accordion, AccordionSummary, AccordionDetails, Chip, Divider,
  CircularProgress, Button, Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { listOrdersByCustomer, updateOrder } from '../../firebase/db';
import { useAuthStore } from '../../store/useAuthStore';
import { formatINR, formatWeight } from '../../lib/calculations';
import { ORDER_STATUS, paymentLabel } from '../../lib/constants';
import OrderStatusChip from '../../components/OrderStatusChip';

export default function MyOrders() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setOrders(await listOrdersByCustomer(user.uid));
    setLoading(false);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const cancel = async (o) => {
    await updateOrder(o.id, {
      status: ORDER_STATUS.CANCELLED,
      cancelReason: 'Cancelled by customer',
      cancelledBy: user.uid,
    });
    load();
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>My orders</Typography>
      {orders.length === 0 && <Typography color="text.secondary">No orders yet.</Typography>}
      {orders.map((o) => (
        <Accordion key={o.id}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', width: '100%' }}>
              <Typography sx={{ flexGrow: 1 }}>
                #{o.id.slice(0, 6)} — {o.storeName}
              </Typography>
              <Typography>{formatINR(o.total)}</Typography>
              <OrderStatusChip status={o.status} />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {o.items?.map((it) => (
              <Box key={it.productId} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">{it.name} ({formatWeight(it.grams)}) × {it.qty}</Typography>
                <Typography variant="body2">{formatINR(it.lineTotal)}</Typography>
              </Box>
            ))}
            <Divider sx={{ my: 1 }} />
            <Typography variant="body2">
              Deliver to: {o.shippingAddress?.line}, {o.shippingAddress?.city} — {o.shippingAddress?.pincode}
            </Typography>
            {o.shipment?.trackingNumber && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Shipped via {o.shipment.courierName} · Tracking: {o.shipment.trackingNumber}
              </Alert>
            )}
            <Box sx={{ mt: 1 }}>
              <Chip size="small" label={`Payment: ${paymentLabel(o.paymentMethod)}`} />
            </Box>
            {[ORDER_STATUS.PLACED, ORDER_STATUS.ACCEPTED].includes(o.status) && (
              <Button color="error" size="small" sx={{ mt: 1 }} onClick={() => cancel(o)}>
                Cancel order
              </Button>
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
