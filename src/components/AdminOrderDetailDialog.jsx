import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Divider, Grid,
  IconButton, Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import { getUserProfile } from '../firebase/db';
import { formatINR, cartWeightKg } from '../lib/calculations';
import { paymentLabel } from '../lib/constants';
import { printInvoice } from '../lib/invoice';
import OrderStatusChip from './OrderStatusChip';
import OrderItemsDiff from './OrderItemsDiff';
import OrderStatusActions from './OrderStatusActions';
import TrackingStatus from './TrackingStatus';
import OrderFeedbackView from './OrderFeedbackView';
import { formatIST } from '../lib/datetime';

function Field({ label, value }) {
  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography variant="body2">{value || '—'}</Typography>
    </Box>
  );
}

export default function AdminOrderDetailDialog({ order, onClose, onChanged }) {
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    setCustomer(null);
    if (order?.customerUid) {
      getUserProfile(order.customerUid).then(setCustomer).catch(() => {});
    }
  }, [order?.customerUid]);

  if (!order) return null;
  const addr = order.shippingAddress || {};

  return (
    <Dialog open={!!order} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Order #{order.id.slice(0, 6)}
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
          <OrderStatusChip status={order.status} />
          <Chip size="small" label={`Payment: ${paymentLabel(order.paymentMethod)}`} />
        </Box>

        <Typography variant="subtitle2" gutterBottom>Status</Typography>
        <OrderStatusActions order={order} onChanged={onChanged} />
        <OrderFeedbackView orderId={order.id} />

        {order.shipment?.trackingNumber && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>Shipment</Typography>
            <TrackingStatus order={order} canRefresh onChanged={onChanged} />
          </>
        )}

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" gutterBottom>Customer</Typography>
            <Field label="Name" value={customer?.displayName} />
            <Field label="Email" value={order.customerEmail} />
            <Field label="Phone" value={addr.phone} />
            <Field label="Customer UID" value={order.customerUid} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" gutterBottom>Delivery address</Typography>
            <Field label="Apartment / unit" value={addr.apartmentName} />
            <Field label="Address" value={addr.line} />
            <Field label="City" value={addr.city} />
            <Field label={addr.country === 'IN' ? 'Pincode' : 'ZIP / Postal code'} value={addr.pincode} />
            <Field label="Country" value={addr.countryName || addr.country} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" gutterBottom>Store</Typography>
            <Field label="Store name" value={order.storeName} />
            <Field label="Store ID" value={order.storeId} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" gutterBottom>Timeline</Typography>
            <Field label="Placed" value={formatIST(order.createdAt)} />
            <Field label="Last updated" value={formatIST(order.updatedAt)} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" gutterBottom>Items</Typography>
        <OrderItemsDiff order={order} />

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" gutterBottom>Totals</Typography>
        <Field label="Total weight (shipment pricing)" value={`${cartWeightKg(order.items).toFixed(2)} kg`} />
        <Field label="Seller subtotal (seller's own prices)" value={formatINR(order.sellerSubtotal)} />
        <Field label="Margin (platform)" value={formatINR(order.marginAmount)} />
        <Field label="Subtotal (customer-facing)" value={formatINR(order.subtotal)} />
        <Field label="Shipping" value={formatINR(order.shippingFee)} />
        <Field label="Tax" value={formatINR(order.taxAmount)} />
        <Field label="Commission (platform, on seller subtotal)" value={formatINR(order.commissionAmount)} />
        <Field label="Seller net" value={formatINR(order.sellerNetAmount)} />
        <Divider sx={{ my: 1 }} />
        <Typography variant="subtitle1" fontWeight={700}>Total: {formatINR(order.total)}</Typography>

        {order.cancelReason && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>Cancellation</Typography>
            <Field label="Reason" value={order.cancelReason} />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button startIcon={<DownloadIcon />} onClick={() => printInvoice(order, customer)}>
          Download invoice
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
