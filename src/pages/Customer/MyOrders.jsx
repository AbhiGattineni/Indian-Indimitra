import { useEffect, useState } from 'react';
import {
  Box, Typography, Accordion, AccordionSummary, AccordionDetails, Chip, Divider,
  CircularProgress, Button,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { listOrdersByCustomer, updateOrder } from '../../firebase/db';
import { useAuthStore } from '../../store/useAuthStore';
import { formatINR, cartWeightKg } from '../../lib/calculations';
import { ORDER_STATUS, paymentLabel } from '../../lib/constants';
import { orderWasEdited } from '../../lib/orderDiff';
import { formatAddressLine } from '../../lib/address';
import OrderStatusChip from '../../components/OrderStatusChip';
import OrderItemsDiff from '../../components/OrderItemsDiff';
import EditOrderDialog from '../../components/EditOrderDialog';
import RateItemDialog from '../../components/RateItemDialog';
import TrackingStatus from '../../components/TrackingStatus';
import OrderFeedbackDialog from '../../components/OrderFeedbackDialog';

export default function MyOrders() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [rating, setRating] = useState(null); // { item, storeId }
  const [feedbackOrder, setFeedbackOrder] = useState(null);

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
              <Typography variant="body2" color="text.secondary">
                {cartWeightKg(o.items).toFixed(2)} kg
              </Typography>
              <Typography>{formatINR(o.total)}</Typography>
              {orderWasEdited(o.originalItems, o.items) && (
                <Chip size="small" label="Edited" color="warning" variant="outlined" />
              )}
              <OrderStatusChip status={o.status} />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <OrderItemsDiff order={o} />
            <Divider sx={{ my: 1 }} />
            <Typography variant="body2">
              Deliver to: {formatAddressLine(o.shippingAddress)}
            </Typography>
            <TrackingStatus order={o} canRefresh={false} />
            <Box sx={{ mt: 1 }}>
              <Chip size="small" label={`Payment: ${paymentLabel(o.paymentMethod)}`} />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              {o.status === ORDER_STATUS.PLACED && (
                <Button size="small" onClick={() => setEditing(o)}>
                  Edit order
                </Button>
              )}
              {[ORDER_STATUS.PLACED, ORDER_STATUS.ACCEPTED].includes(o.status) && (
                <Button color="error" size="small" onClick={() => cancel(o)}>
                  Cancel order
                </Button>
              )}
              <Button size="small" onClick={() => setFeedbackOrder(o)}>
                Feedback about this order
              </Button>
            </Box>
            {o.status === ORDER_STATUS.DELIVERED && (
              <Box sx={{ mt: 1 }}>
                <Divider sx={{ mb: 1 }} />
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Rate your items
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {o.items?.map((it) => (
                    <Button
                      key={it.lineId || it.productId}
                      size="small"
                      variant="outlined"
                      onClick={() => setRating({ item: it, storeId: o.storeId })}
                    >
                      Rate {it.name}
                    </Button>
                  ))}
                </Box>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      ))}
      <EditOrderDialog order={editing} onClose={() => setEditing(null)} onSaved={load} />
      <RateItemDialog
        item={rating?.item}
        storeId={rating?.storeId}
        onClose={() => setRating(null)}
        onSaved={load}
      />
      <OrderFeedbackDialog
        order={feedbackOrder}
        onClose={() => setFeedbackOrder(null)}
        onSaved={load}
      />
    </Box>
  );
}
