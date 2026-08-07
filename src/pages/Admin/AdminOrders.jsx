import { useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, MenuItem, TextField,
  CircularProgress,
} from '@mui/material';
import { listAllOrders } from '../../firebase/db';
import { formatINR } from '../../lib/calculations';
import { ORDER_STATUS, paymentLabel } from '../../lib/constants';
import OrderStatusChip from '../../components/OrderStatusChip';
import AdminOrderDetailDialog from '../../components/AdminOrderDetailDialog';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (async () => { setOrders(await listAllOrders()); setLoading(false); })();
  }, []);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }

  const shown = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">All orders</Typography>
        <TextField select size="small" label="Status" value={filter}
          onChange={(e) => setFilter(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="all">All</MenuItem>
          {Object.values(ORDER_STATUS).map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
      </Box>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Order</TableCell>
            <TableCell>Customer</TableCell>
            <TableCell>Store</TableCell>
            <TableCell align="right">Total</TableCell>
            <TableCell align="right">Commission</TableCell>
            <TableCell>Payment</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {shown.map((o) => (
            <TableRow key={o.id} hover onClick={() => setSelected(o)} sx={{ cursor: 'pointer' }}>
              <TableCell>#{o.id.slice(0, 6)}</TableCell>
              <TableCell>{o.customerEmail}</TableCell>
              <TableCell>{o.storeName}</TableCell>
              <TableCell align="right">{formatINR(o.total)}</TableCell>
              <TableCell align="right">{formatINR(o.commissionAmount)}</TableCell>
              <TableCell>{paymentLabel(o.paymentMethod)}</TableCell>
              <TableCell><OrderStatusChip status={o.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <AdminOrderDetailDialog order={selected} onClose={() => setSelected(null)} />
    </Box>
  );
}
