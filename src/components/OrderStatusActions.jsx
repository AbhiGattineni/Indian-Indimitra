// Accept / Reject / Mark shipped / Mark delivered controls. Only Admin and
// an assigned FDM may progress an order's status (enforced both here via
// caller gating and in firestore.rules) — after manually confirming any
// pre-acceptance edits with the customer.
import { useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack,
} from '@mui/material';
import { updateOrder } from '../firebase/db';
import { ORDER_STATUS } from '../lib/constants';

export default function OrderStatusActions({ order, onChanged }) {
  const [shipOpen, setShipOpen] = useState(false);
  const [ship, setShip] = useState({ courierName: '', trackingNumber: '', trackingUrl: '' });

  const setStatus = async (status) => {
    await updateOrder(order.id, { status });
    onChanged?.();
  };

  const confirmShip = async () => {
    await updateOrder(order.id, {
      status: ORDER_STATUS.SHIPPED,
      shipment: { ...ship, shippedAt: new Date().toISOString() },
    });
    setShipOpen(false);
    setShip({ courierName: '', trackingNumber: '', trackingUrl: '' });
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
          <Button variant="contained" onClick={() => setShipOpen(true)}>Mark shipped</Button>
        )}
        {order.status === ORDER_STATUS.SHIPPED && (
          <Button variant="contained" color="success" onClick={() => setStatus(ORDER_STATUS.DELIVERED)}>
            Mark delivered
          </Button>
        )}
      </Box>

      <Dialog open={shipOpen} onClose={() => setShipOpen(false)} fullWidth maxWidth="xs">
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
          <Button onClick={() => setShipOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={confirmShip}>Confirm shipped</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
