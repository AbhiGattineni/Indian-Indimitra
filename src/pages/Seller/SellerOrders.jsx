import { useEffect, useState } from 'react';
import {
  Box, Typography, Accordion, AccordionSummary, AccordionDetails, Divider, CircularProgress, Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuthStore } from '../../store/useAuthStore';
import { getStoreByOwner, listOrdersByStore } from '../../firebase/db';
import { formatINR } from '../../lib/calculations';
import { ROLES } from '../../lib/constants';
import { orderWasEdited } from '../../lib/orderDiff';
import { formatAddressLine } from '../../lib/address';
import OrderStatusChip from '../../components/OrderStatusChip';
import OrderItemsDiff from '../../components/OrderItemsDiff';
import OrderStatusActions from '../../components/OrderStatusActions';
import TrackingStatus from '../../components/TrackingStatus';

// storeOverride lets an FDM (or admin) run a specific assigned store; sellers
// leave it undefined and their own owned store is looked up.
export default function SellerOrders({ storeOverride }) {
  const { user, profile } = useAuthStore();
  const [store, setStore] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Only Admin/FDM change order status — after confirming with the customer.
  // A seller viewing their own store's orders gets a read-only list.
  const canManageStatus = profile?.role === ROLES.ADMIN || profile?.role === ROLES.FDM;

  const load = async (s) => {
    const st = s || storeOverride || (await getStoreByOwner(user.uid));
    setStore(st);
    setOrders(await listOrdersByStore(st.id));
    setLoading(false);
  };
  useEffect(() => { if (user) load(storeOverride); }, [user, storeOverride?.id]);

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
              Ship to: {formatAddressLine(o.shippingAddress)} · ☎ {o.shippingAddress?.phone}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your net: {formatINR(o.sellerNetAmount)} (commission {formatINR(o.commissionAmount)})
            </Typography>

            <TrackingStatus order={o} canRefresh={canManageStatus} onChanged={() => load(store)} />

            {canManageStatus && (
              <Box sx={{ mt: 2 }}>
                <OrderStatusActions order={o} onChanged={() => load(store)} />
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
