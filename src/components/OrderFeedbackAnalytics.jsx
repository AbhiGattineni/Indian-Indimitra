// Overall order-level feedback ("anything other than the items themselves" —
// delivery, packaging, timing, etc.) — deliberately separate from the
// itemized per-product reviews in ReviewsAnalytics, both for UI clarity and
// because it's a different business signal (product quality vs. delivery/
// service experience). Same stat-cards + filter + table shape as
// ReviewsAnalytics for a consistent feel, but scoped to orders, not items.
import { useMemo, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, TextField, MenuItem, Chip, Rating,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer, LinearProgress,
} from '@mui/material';

function feedbackDate(entry) {
  const value = entry.createdAt || entry.updatedAt;
  const d = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(d?.getTime()) ? null : d;
}

function formatDate(d) {
  return d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}

export default function OrderFeedbackAnalytics({ feedback, ordersById = {}, storesById = null }) {
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const showStoreColumn = !!storesById;

  const enriched = useMemo(() => feedback.map((f) => {
    const order = ordersById[f.orderId] || null;
    return {
      ...f,
      _date: feedbackDate(f),
      _order: order,
      _store: showStoreColumn && order ? (storesById[order.storeId] || null) : null,
    };
  }), [feedback, ordersById, storesById, showStoreColumn]);

  const total = enriched.length;
  const rated = enriched.filter((f) => f.rating);
  const avg = rated.length ? rated.reduce((sum, f) => sum + Number(f.rating || 0), 0) / rated.length : 0;
  const textOnly = enriched.filter((f) => !f.rating && f.text?.trim()).length;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star, count: enriched.filter((f) => f.rating === star).length,
  }));

  const filtered = useMemo(() => {
    let rows = enriched;
    if (ratingFilter !== 'all') rows = rows.filter((f) => f.rating === ratingFilter);
    if (storeFilter !== 'all') rows = rows.filter((f) => f._order?.storeId === storeFilter);
    if (dateFrom) rows = rows.filter((f) => f._date && f._date >= new Date(dateFrom));
    if (dateTo) rows = rows.filter((f) => f._date && f._date <= new Date(`${dateTo}T23:59:59`));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((f) => (
        f.text?.toLowerCase().includes(q)
        || f.customerName?.toLowerCase().includes(q)
        || f._store?.name?.toLowerCase().includes(q)
        || f.orderId?.toLowerCase().includes(q)
      ));
    }
    const sorted = [...rows];
    sorted.sort((a, b) => {
      if (sortBy === 'oldest') return (a._date || 0) - (b._date || 0);
      if (sortBy === 'highest') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'lowest') return (a.rating || 0) - (b.rating || 0);
      return (b._date || 0) - (a._date || 0); // newest
    });
    return sorted;
  }, [enriched, ratingFilter, storeFilter, dateFrom, dateTo, search, sortBy]);

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Feedback about the order experience — delivery, packaging, timing, or anything else outside the
        products themselves. Kept separate from item reviews above since it's a different signal.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Stat label="Total feedback" value={total} />
        <Stat label="Average rating" value={rated.length ? avg.toFixed(2) : '—'} />
        <Stat label="Rated" value={rated.length} />
        <Stat label="Text-only (no rating)" value={textOnly} />
      </Grid>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>Rating distribution</Typography>
          {distribution.map(({ star, count }) => (
            <Box
              key={star}
              onClick={() => setRatingFilter(ratingFilter === star ? 'all' : star)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5, cursor: 'pointer',
                borderRadius: 1, px: 0.5,
                bgcolor: ratingFilter === star ? 'action.selected' : 'transparent',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Typography variant="body2" sx={{ width: 40 }}>{star}★</Typography>
              <LinearProgress
                variant="determinate"
                value={total ? (count / total) * 100 : 0}
                sx={{ flex: 1, height: 8, borderRadius: 4 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ width: 32, textAlign: 'right' }}>
                {count}
              </Typography>
            </Box>
          ))}
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mb: 1.5 }}>
        <TextField
          size="small" placeholder="Search order, customer, or feedback text…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 260, flex: 1 }}
        />
        {showStoreColumn && (
          <TextField
            select size="small" label="Store" value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)} sx={{ minWidth: 160 }}
          >
            <MenuItem value="all">All stores</MenuItem>
            {Object.values(storesById).map((s) => (
              <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
            ))}
          </TextField>
        )}
        <TextField
          size="small" type="date" label="From" InputLabelProps={{ shrink: true }}
          value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
        />
        <TextField
          size="small" type="date" label="To" InputLabelProps={{ shrink: true }}
          value={dateTo} onChange={(e) => setDateTo(e.target.value)}
        />
        <TextField
          select size="small" label="Sort" value={sortBy}
          onChange={(e) => setSortBy(e.target.value)} sx={{ minWidth: 140 }}
        >
          <MenuItem value="newest">Newest first</MenuItem>
          <MenuItem value="oldest">Oldest first</MenuItem>
          <MenuItem value="highest">Highest rated</MenuItem>
          <MenuItem value="lowest">Lowest rated</MenuItem>
        </TextField>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Chip
          label="All ratings" size="small" onClick={() => setRatingFilter('all')}
          color={ratingFilter === 'all' ? 'primary' : 'default'}
          variant={ratingFilter === 'all' ? 'filled' : 'outlined'}
        />
        {[5, 4, 3, 2, 1].map((star) => (
          <Chip
            key={star} label={`${star}★`} size="small" onClick={() => setRatingFilter(star)}
            color={ratingFilter === star ? 'primary' : 'default'}
            variant={ratingFilter === star ? 'filled' : 'outlined'}
          />
        ))}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        {filtered.length} of {total} feedback entr{total === 1 ? 'y' : 'ies'}
      </Typography>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Order</TableCell>
              {showStoreColumn && <TableCell>Store</TableCell>}
              <TableCell>Customer</TableCell>
              <TableCell>Rating</TableCell>
              <TableCell>Feedback</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((f) => (
              <TableRow key={f.id}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(f._date)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>#{f.orderId.slice(0, 6)}</TableCell>
                {showStoreColumn && <TableCell>{f._store?.name || f._order?.storeId || '—'}</TableCell>}
                <TableCell>{f.customerName || '—'}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {f.rating ? <Rating value={f.rating} readOnly size="small" /> : <em>No rating</em>}
                </TableCell>
                <TableCell sx={{ maxWidth: 360 }}>{f.text || <em>No written feedback</em>}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={showStoreColumn ? 6 : 5}>
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    {total === 0 ? 'No order feedback yet.' : 'No feedback matches these filters.'}
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
      <Card>
        <CardContent>
          <Typography color="text.secondary" variant="body2">{label}</Typography>
          <Typography variant="h5">{value}</Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}
