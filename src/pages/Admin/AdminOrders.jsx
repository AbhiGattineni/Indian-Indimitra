import { useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, MenuItem, TextField,
  CircularProgress, Chip, TableContainer,
} from '@mui/material';
import { listAllOrders } from '../../firebase/db';
import { formatINR, cartWeightKg } from '../../lib/calculations';
import { ORDER_STATUS, paymentLabel } from '../../lib/constants';
import { orderWasEdited } from '../../lib/orderDiff';
import OrderStatusChip from '../../components/OrderStatusChip';
import AdminOrderDetailDialog from '../../components/AdminOrderDetailDialog';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const load = async () => {
    const all = await listAllOrders();
    setOrders(all);
    setLoading(false);
    return all;
  };
  useEffect(() => { load(); }, []);

  const handleChanged = async () => {
    const all = await load();
    setSelected((prev) => (prev ? all.find((o) => o.id === prev.id) || null : null));
  };

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
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Store</TableCell>
              <TableCell align="right">Weight</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="right">Margin</TableCell>
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
                <TableCell align="right">{cartWeightKg(o.items).toFixed(2)} kg</TableCell>
                <TableCell align="right">{formatINR(o.total)}</TableCell>
                <TableCell align="right">{formatINR(o.marginAmount)}</TableCell>
                <TableCell align="right">{formatINR(o.commissionAmount)}</TableCell>
                <TableCell>{paymentLabel(o.paymentMethod)}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    <OrderStatusChip status={o.status} />
                    {orderWasEdited(o.originalItems, o.items) && (
                      <Chip size="small" label="Edited" color="warning" variant="outlined" />
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <AdminOrderDetailDialog order={selected} onClose={() => setSelected(null)} onChanged={handleChanged} />
    </Box>
  );
}
