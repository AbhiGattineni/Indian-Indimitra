// Accept / Reject / Mark shipped / Mark in transit / Mark delivered controls,
// plus a "Move back" action at every stage (and "Restore order" from
// cancelled) so a wrong status can be corrected without starting a new
// order. Only Admin and an assigned FDM may change an order's status
// (enforced both here via caller gating and in firestore.rules). Every
// change — forward or back — goes through a confirmation dialog and is
// logged (who + when) to orders/{id}/statusLog, shown below as a compact
// audit trail (admin/FDM-only, per firestore.rules).
import { useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, TextField, Stack,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import UndoIcon from '@mui/icons-material/Undo';
import { updateOrderStatus, updateOrder, logOrderStatusChange } from '../firebase/db';
import { useAuthStore } from '../store/useAuthStore';
import { ORDER_STATUS, orderStatusLabel } from '../lib/constants';
import OrderStatusLog from './OrderStatusLog';

// The normal forward path -- used to find "one step back" from any status.
const SEQUENCE = [
  ORDER_STATUS.PLACED,
  ORDER_STATUS.ACCEPTED,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.IN_TRANSIT,
  ORDER_STATUS.DELIVERED,
];

export default function OrderStatusActions({ order, onChanged }) {
  const { user, profile } = useAuthStore();
  const [transitOpen, setTransitOpen] = useState(false);
  const [transit, setTransit] = useState({ courierName: 'UPS', trackingNumber: '', trackingUrl: '' });
  const [editOpen, setEditOpen] = useState(false);
  const [editTransit, setEditTransit] = useState({ courierName: '', trackingNumber: '', trackingUrl: '' });
  // { status, keepTimestamps } -- keepTimestamps skips the stage-timestamp
  // stamp for a backward/restore move, so the original acceptedAt/shippedAt/
  // etc from when the order first reached that stage isn't overwritten.
  const [confirmTarget, setConfirmTarget] = useState(null);

  const logChange = (status) => logOrderStatusChange(order.id, {
    status,
    changedByUid: user.uid,
    changedByName: profile?.displayName || user.email || 'Unknown',
    changedByRole: profile?.role || 'unknown',
  });

  const setStatusForward = async (status) => {
    await updateOrderStatus(order.id, status);
    await logChange(status);
    onChanged?.();
  };

  const setStatusBack = async (status) => {
    await updateOrder(order.id, { status });
    await logChange(status);
    onChanged?.();
  };

  const runConfirmed = async () => {
    if (!confirmTarget) return;
    if (confirmTarget.keepTimestamps) await setStatusBack(confirmTarget.status);
    else await setStatusForward(confirmTarget.status);
    setConfirmTarget(null);
  };

  const confirmInTransit = async () => {
    await updateOrderStatus(order.id, ORDER_STATUS.IN_TRANSIT, {
      shipment: { ...transit, inTransitAt: new Date().toISOString() },
    });
    await logChange(ORDER_STATUS.IN_TRANSIT);
    setTransitOpen(false);
    setTransit({ courierName: 'UPS', trackingNumber: '', trackingUrl: '' });
    onChanged?.();
  };

  const openEditTracking = () => {
    setEditTransit({
      courierName: order.shipment?.courierName || '',
      trackingNumber: order.shipment?.trackingNumber || '',
      trackingUrl: order.shipment?.trackingUrl || '',
    });
    setEditOpen(true);
  };

  const saveEditTracking = async () => {
    await updateOrder(order.id, {
      shipment: { ...order.shipment, ...editTransit },
    });
    setEditOpen(false);
    onChanged?.();
  };

  const currentIndex = SEQUENCE.indexOf(order.status);
  const previousStatus = currentIndex > 0 ? SEQUENCE[currentIndex - 1] : null;

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {order.status === ORDER_STATUS.PLACED && (
          <>
            <Button variant="contained" onClick={() => setConfirmTarget({ status: ORDER_STATUS.ACCEPTED })}>
              Accept
            </Button>
            <Button color="error" onClick={() => setConfirmTarget({ status: ORDER_STATUS.CANCELLED })}>
              Reject
            </Button>
          </>
        )}
        {order.status === ORDER_STATUS.ACCEPTED && (
          <Button variant="contained" onClick={() => setConfirmTarget({ status: ORDER_STATUS.SHIPPED })}>
            Mark shipped
          </Button>
        )}
        {order.status === ORDER_STATUS.SHIPPED && (
          <Button variant="contained" onClick={() => setTransitOpen(true)}>Mark in transit</Button>
        )}
        {order.status === ORDER_STATUS.IN_TRANSIT && (
          <Button
            variant="contained"
            color="success"
            onClick={() => setConfirmTarget({ status: ORDER_STATUS.DELIVERED })}
          >
            Mark delivered
          </Button>
        )}
        {previousStatus && (
          <Button
            size="small"
            color="inherit"
            startIcon={<UndoIcon fontSize="small" />}
            onClick={() => setConfirmTarget({ status: previousStatus, keepTimestamps: true })}
          >
            Move back to {orderStatusLabel(previousStatus)}
          </Button>
        )}
        {order.status === ORDER_STATUS.CANCELLED && (
          <Button
            size="small"
            color="inherit"
            startIcon={<UndoIcon fontSize="small" />}
            onClick={() => setConfirmTarget({ status: ORDER_STATUS.PLACED, keepTimestamps: true })}
          >
            Restore order
          </Button>
        )}
        {order.shipment?.trackingNumber && (
          <Button size="small" startIcon={<EditIcon fontSize="small" />} onClick={openEditTracking}>
            Edit tracking info
          </Button>
        )}
      </Box>

      <OrderStatusLog orderId={order.id} />

      <Dialog open={!!confirmTarget} onClose={() => setConfirmTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Change order status?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Set this order's status from <strong>{orderStatusLabel(order.status)}</strong> to{' '}
            <strong>{confirmTarget && orderStatusLabel(confirmTarget.status)}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmTarget(null)}>Cancel</Button>
          <Button variant="contained" onClick={runConfirmed}>Confirm</Button>
        </DialogActions>
      </Dialog>

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

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Edit tracking info</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Carrier" value={editTransit.courierName}
              onChange={(e) => setEditTransit({ ...editTransit, courierName: e.target.value })} />
            <TextField label="Tracking number" required value={editTransit.trackingNumber}
              onChange={(e) => setEditTransit({ ...editTransit, trackingNumber: e.target.value })} />
            <TextField label="Tracking URL (optional)" value={editTransit.trackingUrl}
              onChange={(e) => setEditTransit({ ...editTransit, trackingUrl: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!editTransit.trackingNumber.trim()} onClick={saveEditTracking}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
