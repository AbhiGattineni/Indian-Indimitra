import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Divider, Grid,
  Table, TableHead, TableBody, TableRow, TableCell, IconButton, Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import { getUserProfile } from '../firebase/db';
import { formatINR, formatWeight, cartWeightKg } from '../lib/calculations';
import { paymentLabel } from '../lib/constants';
import { printInvoice } from '../lib/invoice';
import OrderStatusChip from './OrderStatusChip';

function formatTimestamp(ts) {
  const d = ts?.toDate?.();
  return d ? d.toLocaleString() : '—';
}

function Field({ label, value }) {
  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography variant="body2">{value || '—'}</Typography>
    </Box>
  );
}

export default function AdminOrderDetailDialog({ order, onClose }) {
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
            <Field label="Placed" value={formatTimestamp(order.createdAt)} />
            <Field label="Last updated" value={formatTimestamp(order.updatedAt)} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" gutterBottom>Items</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>Weight</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Price / kg</TableCell>
              <TableCell align="right">Line total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(order.items || []).map((it, i) => (
              <TableRow key={it.productId || i}>
                <TableCell>
                  {it.name}
                  {it.instructions && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Note: {it.instructions}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{formatWeight(it.grams)}</TableCell>
                <TableCell align="right">{it.qty}</TableCell>
                <TableCell align="right">{formatINR(it.price)}</TableCell>
                <TableCell align="right">{formatINR(it.lineTotal)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" gutterBottom>Totals</Typography>
        <Field label="Total weight (shipment pricing)" value={`${cartWeightKg(order.items).toFixed(2)} kg`} />
        <Field label="Subtotal" value={formatINR(order.subtotal)} />
        <Field label="Shipping" value={formatINR(order.shippingFee)} />
        <Field label="Tax" value={formatINR(order.taxAmount)} />
        <Field label="Commission (platform)" value={formatINR(order.commissionAmount)} />
        <Field label="Seller net" value={formatINR(order.sellerNetAmount)} />
        <Divider sx={{ my: 1 }} />
        <Typography variant="subtitle1" fontWeight={700}>Total: {formatINR(order.total)}</Typography>

        {(order.shipment?.trackingNumber || order.shipment?.courierName) && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>Shipment</Typography>
            <Field label="Courier" value={order.shipment?.courierName} />
            <Field label="Tracking number" value={order.shipment?.trackingNumber} />
            <Field label="Tracking URL" value={order.shipment?.trackingUrl} />
          </>
        )}

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
