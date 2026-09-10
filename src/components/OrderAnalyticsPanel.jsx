// Business-stats panel shared by the Admin and FDM dashboards: revenue,
// shipping/margin/commission/seller-payout/profit breakdown, an order-status
// funnel, average time spent in each stage (placed→accepted→shipped→in
// transit→delivered), and a per-order timing drill-down table -- filterable
// by date range, store, and status.
import { useMemo, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, TextField, MenuItem, Chip, Table, TableHead,
  TableBody, TableRow, TableCell, TableContainer, Paper,
} from '@mui/material';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar,
  Legend,
} from 'recharts';
import { formatINR } from '../lib/calculations';
import { ORDER_STATUS, ORDER_STATUS_LABELS, orderStatusLabel } from '../lib/constants';
import { formatIST } from '../lib/datetime';
import {
  filterOrdersByDateRange, computeFinancialSummary, computeStatusCounts, computeStageDurations,
  computeOrderTimings, groupRevenueByDay, formatDuration,
} from '../lib/orderAnalytics';

const CHART_COLORS = {
  revenue: '#1976d2',
  profit: '#2e7d32',
};

const QUICK_RANGES = [
  { label: 'Today', days: 0 },
  { label: '7 days', days: 6 },
  { label: '30 days', days: 29 },
  { label: '90 days', days: 89 },
];

function toDateInput(d) {
  return d.toISOString().slice(0, 10);
}

// stores: [{id, name}] for the store filter -- pass [] to hide it (single-store FDM view).
export default function OrderAnalyticsPanel({ orders, stores = [] }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [storeId, setStoreId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const applyQuickRange = (days) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setDateFrom(toDateInput(from));
    setDateTo(toDateInput(to));
  };

  const filtered = useMemo(() => {
    let list = filterOrdersByDateRange(orders, dateFrom, dateTo);
    if (storeId !== 'all') list = list.filter((o) => o.storeId === storeId);
    if (statusFilter !== 'all') list = list.filter((o) => o.status === statusFilter);
    return list;
  }, [orders, dateFrom, dateTo, storeId, statusFilter]);

  const summary = useMemo(() => computeFinancialSummary(filtered), [filtered]);
  const statusCounts = useMemo(() => computeStatusCounts(filtered), [filtered]);
  const stages = useMemo(() => computeStageDurations(filtered), [filtered]);
  const timings = useMemo(() => computeOrderTimings(filtered), [filtered]);
  const revenueSeries = useMemo(() => groupRevenueByDay(filtered), [filtered]);

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>Business analytics</Typography>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        <TextField
          type="date" size="small" label="From" InputLabelProps={{ shrink: true }}
          value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
        />
        <TextField
          type="date" size="small" label="To" InputLabelProps={{ shrink: true }}
          value={dateTo} onChange={(e) => setDateTo(e.target.value)}
        />
        {QUICK_RANGES.map((r) => (
          <Chip key={r.label} label={r.label} size="small" onClick={() => applyQuickRange(r.days)} />
        ))}
        {(dateFrom || dateTo) && (
          <Chip
            label="Clear dates" size="small" variant="outlined"
            onClick={() => { setDateFrom(''); setDateTo(''); }}
          />
        )}
        {stores.length > 0 && (
          <TextField
            select size="small" label="Store" value={storeId}
            onChange={(e) => setStoreId(e.target.value)} sx={{ minWidth: 180 }}
          >
            <MenuItem value="all">All stores</MenuItem>
            {stores.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>
        )}
        <TextField
          select size="small" label="Status" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">All statuses</MenuItem>
          {Object.values(ORDER_STATUS).map((s) => (
            <MenuItem key={s} value={s}>{orderStatusLabel(s)}</MenuItem>
          ))}
        </TextField>
      </Box>

      {/* Stat cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Stat label="Total revenue" value={formatINR(summary.totalRevenue)} />
        <Stat label="Shipping (charged)" value={formatINR(summary.shippingRevenue)} />
        <Stat label="Platform margin" value={formatINR(summary.marginTotal)} />
        <Stat label="Commission" value={formatINR(summary.commissionTotal)} />
        <Stat label="Paid to sellers" value={formatINR(summary.sellerPayout)} />
        <Stat label="Tax collected" value={formatINR(summary.taxTotal)} />
        <Stat label="Total profit" value={formatINR(summary.profit)} highlight />
        <Stat label="Orders (live / cancelled)" value={`${summary.orderCount} / ${summary.cancelledCount}`} />
        <Stat label="Avg order value" value={formatINR(summary.avgOrderValue)} />
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Revenue over time */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>Revenue &amp; profit over time</Typography>
              {revenueSeries.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No orders in range.</Typography>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={revenueSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => formatINR(v)} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke={CHART_COLORS.revenue} fill={CHART_COLORS.revenue} fillOpacity={0.15} />
                    <Area type="monotone" dataKey="profit" name="Profit" stroke={CHART_COLORS.profit} fill={CHART_COLORS.profit} fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Order status breakdown */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>Orders by status</Typography>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={Object.entries(statusCounts).map(([status, count]) => ({
                  status: ORDER_STATUS_LABELS[status] || status, count,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Orders" fill={CHART_COLORS.revenue} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Stage timing */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>Average time per stage</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Only orders that have reached a stage (and were processed after this tracking was added) count toward its average.
          </Typography>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stages.map((s) => ({ label: s.label, hours: s.avgHours, samples: s.sampleSize }))} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} unit="h" />
              <YAxis type="category" dataKey="label" width={160} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, n, p) => [`${formatDuration(v)} (${p.payload.samples} orders)`, 'Avg time']} />
              <Bar dataKey="hours" name="Avg hours" fill="#f57c00" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Per-order timing table */}
      <Card>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>Order timing detail</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Order</TableCell>
                  {stores.length > 0 && <TableCell>Store</TableCell>}
                  <TableCell>Placed</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Placed→Accepted</TableCell>
                  <TableCell>Accepted→Shipped</TableCell>
                  <TableCell>Shipped→In transit</TableCell>
                  <TableCell>In transit→Delivered</TableCell>
                  <TableCell>Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {timings.map((t) => (
                  <TableRow key={t.id} hover>
                    <TableCell>#{t.id.slice(0, 6)}</TableCell>
                    {stores.length > 0 && <TableCell>{t.storeName}</TableCell>}
                    <TableCell>{formatIST(t.createdAt)}</TableCell>
                    <TableCell>{orderStatusLabel(t.status)}</TableCell>
                    <TableCell>{formatDuration(t.toAccepted)}</TableCell>
                    <TableCell>{formatDuration(t.toShipped)}</TableCell>
                    <TableCell>{formatDuration(t.toInTransit)}</TableCell>
                    <TableCell>{formatDuration(t.toDelivered)}</TableCell>
                    <TableCell><b>{formatDuration(t.total)}</b></TableCell>
                  </TableRow>
                ))}
                {timings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={stores.length > 0 ? 9 : 8}>
                      <Typography variant="body2" color="text.secondary">No orders in range.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <Grid item xs={6} sm={4} md={3} lg={4 / 3}>
      <Card sx={{ height: '100%', ...(highlight && { bgcolor: 'success.main', color: 'success.contrastText' }) }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Typography variant="caption" sx={{ opacity: highlight ? 0.9 : undefined }} color={highlight ? undefined : 'text.secondary'}>
            {label}
          </Typography>
          <Typography variant="h6" fontWeight={700}>{value}</Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}
