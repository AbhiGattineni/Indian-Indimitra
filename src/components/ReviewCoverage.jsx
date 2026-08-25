// Secondary panel below the main reviews dashboard: every delivered order's
// items, each showing the customer's review if they left one, or a "yet to
// get the review" flag if not — plus a small coverage stat row. The reviews
// table above stays the dashboard's main focus; this is a supporting view of
// what's still outstanding.
import { useMemo, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, TextField, MenuItem, Chip, Rating,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
} from '@mui/material';
import { reviewId } from '../lib/reviews';

function formatDate(value) {
  const d = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(d?.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ReviewCoverage({ orders, reviews, storesById = null }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const showStoreColumn = !!storesById;

  const reviewsByKey = useMemo(
    () => Object.fromEntries(reviews.map((r) => [reviewId(r.productId, r.customerUid), r])),
    [reviews]
  );

  const rows = useMemo(() => orders.flatMap((order) => (order.items || []).map((item) => {
    const review = reviewsByKey[reviewId(item.productId, order.customerUid)] || null;
    return {
      key: `${order.id}_${item.lineId || item.productId}`,
      orderId: order.id,
      deliveredAt: order.updatedAt,
      customerEmail: order.customerEmail,
      storeId: order.storeId,
      storeName: storesById?.[order.storeId]?.name || order.storeName,
      itemName: item.name,
      review,
    };
  })), [orders, reviewsByKey, storesById]);

  const totalItems = rows.length;
  const reviewedCount = rows.filter((r) => r.review).length;
  const pendingCount = totalItems - reviewedCount;
  const coveragePct = totalItems ? Math.round((reviewedCount / totalItems) * 100) : 0;

  const filtered = useMemo(() => {
    let list = rows;
    if (statusFilter === 'reviewed') list = list.filter((r) => r.review);
    if (statusFilter === 'pending') list = list.filter((r) => !r.review);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => (
        r.customerEmail?.toLowerCase().includes(q)
        || r.itemName?.toLowerCase().includes(q)
        || r.storeName?.toLowerCase().includes(q)
        || r.orderId?.toLowerCase().includes(q)
      ));
    }
    return [...list].sort((a, b) => new Date(b.deliveredAt?.toDate?.() || b.deliveredAt) - new Date(a.deliveredAt?.toDate?.() || a.deliveredAt));
  }, [rows, statusFilter, search]);

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        Delivered order review coverage
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Which delivered items customers have reviewed, and which are still outstanding.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Stat label="Delivered orders" value={orders.length} />
        <Stat label="Delivered items" value={totalItems} />
        <Stat label="Reviewed" value={`${reviewedCount} (${coveragePct}%)`} />
        <Stat label="Awaiting review" value={pendingCount} />
      </Grid>

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mb: 1.5 }}>
        <TextField
          size="small" placeholder="Search order, customer, item…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 240, flex: 1 }}
        />
        <TextField
          select size="small" label="Status" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 170 }}
        >
          <MenuItem value="all">All items</MenuItem>
          <MenuItem value="reviewed">Reviewed</MenuItem>
          <MenuItem value="pending">Awaiting review</MenuItem>
        </TextField>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Order</TableCell>
              <TableCell>Delivered</TableCell>
              <TableCell>Customer</TableCell>
              {showStoreColumn && <TableCell>Store</TableCell>}
              <TableCell>Item</TableCell>
              <TableCell>Review</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.key}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>#{r.orderId.slice(0, 6)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(r.deliveredAt)}</TableCell>
                <TableCell>{r.customerEmail || '—'}</TableCell>
                {showStoreColumn && <TableCell>{r.storeName || r.storeId}</TableCell>}
                <TableCell>{r.itemName}</TableCell>
                <TableCell sx={{ maxWidth: 320 }}>
                  {r.review ? (
                    <Box>
                      <Rating value={r.review.rating} readOnly size="small" />
                      {r.review.text && (
                        <Typography variant="body2" color="text.secondary">{r.review.text}</Typography>
                      )}
                    </Box>
                  ) : (
                    <Chip size="small" label="Yet to get the review" variant="outlined" color="warning" />
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={showStoreColumn ? 6 : 5}>
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    {totalItems === 0 ? 'No delivered orders yet.' : 'No items match these filters.'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function Stat({ label, value }) {
  return (
    <Grid item xs={6} md={3}>
      <Card variant="outlined">
        <CardContent>
          <Typography color="text.secondary" variant="body2">{label}</Typography>
          <Typography variant="h6">{value}</Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}
