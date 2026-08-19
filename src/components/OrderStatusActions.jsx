// Accept / Reject / Mark shipped / Mark in transit / Mark delivered controls.
// Only Admin and an assigned FDM may progress an order's status (enforced
// both here via caller gating and in firestore.rules) — after manually
// confirming any pre-acceptance edits with the customer. Every change is
// logged (who + when) to orders/{id}/statusLog, shown below as a compact
// audit trail (admin/FDM-only, per firestore.rules).
import { useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack,
} from '@mui/material';
import { updateOrder, logOrderStatusChange } from '../firebase/db';
import { useAuthStore } from '../store/useAuthStore';
import { ORDER_STATUS, orderStatusLabel } from '../lib/constants';
import OrderStatusLog from './OrderStatusLog';

export default function OrderStatusActions({ order, onChanged }) {
  const { user, profile } = useAuthStore();
  const [transitOpen, setTransitOpen] = useState(false);
  const [transit, setTransit] = useState({ courierName: 'UPS', trackingNumber: '', trackingUrl: '' });

  const logChange = (status) => logOrderStatusChange(order.id, {
    status,
    changedByUid: user.uid,
    changedByName: profile?.displayName || user.email || 'Unknown',
    changedByRole: profile?.role || 'unknown',
  });

  const setStatus = async (status) => {
    await updateOrder(order.id, { status });
    await logChange(status);
    onChanged?.();
  };

  const confirmInTransit = async () => {
    await updateOrder(order.id, {
      status: ORDER_STATUS.IN_TRANSIT,
      shipment: { ...transit, inTransitAt: new Date().toISOString() },
    });
    await logChange(ORDER_STATUS.IN_TRANSIT);
    setTransitOpen(false);
    setTransit({ courierName: 'UPS', trackingNumber: '', trackingUrl: '' });
    onChanged?.();
  };

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {order.status === ORDER_STATUS.PLACED && (
          <>
            <Button variant="contained" onClick={() => setStatus(ORDER_STATUS.ACCEPTED)}>Accept</Button>
            <Button color="error" onClick={() => setStatus(ORDER_STATUS.CANCELLED)}>Reject</Button>
          </>
        )}
        {order.status === ORDER_STATUS.ACCEPTED && (
          <Button variant="contained" onClick={() => setStatus(ORDER_STATUS.SHIPPED)}>Mark shipped</Button>
        )}
        {order.status === ORDER_STATUS.SHIPPED && (
          <Button variant="contained" onClick={() => setTransitOpen(true)}>Mark in transit</Button>
        )}
        {order.status === ORDER_STATUS.IN_TRANSIT && (
          <Button variant="contained" color="success" onClick={() => setStatus(ORDER_STATUS.DELIVERED)}>
            Mark delivered
          </Button>
        )}
      </Box>

      <OrderStatusLog orderId={order.id} />

      <Dialog open={transitOpen} onClose={() => setTransitOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Mark {orderStatusLabel(ORDER_STATUS.IN_TRANSIT)}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Carrier" value={transit.courierName}
              onChange={(e) => setTransit({ ...transit, courierName: e.target.value })} />
            <TextField label="Tracking number" required value={transit.trackingNumber}
              onChange={(e) => setTransit({ ...transit, trackingNumber: e.target.value })} />
            <TextField label="Tracking URL (optional)" value={transit.trackingUrl}
              onChange={(e) => setTransit({ ...transit, trackingUrl: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransitOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!transit.trackingNumber.trim()} onClick={confirmInTransit}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
