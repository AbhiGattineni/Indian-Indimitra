// Shared reviews analytics dashboard — reused (with different data scopes)
// by Admin (all stores), Seller (own store), and FDM (assigned store): stat
// cards, a clickable rating-distribution breakdown, and a filterable/
// searchable/sortable table of individual reviews.
import { useMemo, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, TextField, MenuItem, Chip, Rating,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer, LinearProgress,
} from '@mui/material';

function reviewDate(review) {
  const value = review.createdAt || review.updatedAt;
  const d = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(d?.getTime()) ? null : d;
}

function formatDate(d) {
  return d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}

export default function ReviewsAnalytics({ reviews, productsById = {}, storesById = null }) {
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const showStoreColumn = !!storesById;

  const enriched = useMemo(() => reviews.map((r) => ({
    ...r,
    _date: reviewDate(r),
    _product: productsById[r.productId] || null,
    _store: showStoreColumn ? (storesById[r.storeId] || null) : null,
  })), [reviews, productsById, storesById, showStoreColumn]);

  const total = enriched.length;
  const avg = total ? enriched.reduce((sum, r) => sum + Number(r.rating || 0), 0) / total : 0;
  const withText = enriched.filter((r) => r.text?.trim()).length;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star, count: enriched.filter((r) => r.rating === star).length,
  }));

  const filtered = useMemo(() => {
    let rows = enriched;
    if (ratingFilter !== 'all') rows = rows.filter((r) => r.rating === ratingFilter);
    if (storeFilter !== 'all') rows = rows.filter((r) => r.storeId === storeFilter);
    if (dateFrom) rows = rows.filter((r) => r._date && r._date >= new Date(dateFrom));
    if (dateTo) rows = rows.filter((r) => r._date && r._date <= new Date(`${dateTo}T23:59:59`));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => (
        r.text?.toLowerCase().includes(q)
        || r.customerName?.toLowerCase().includes(q)
        || r._product?.name?.toLowerCase().includes(q)
        || r._store?.name?.toLowerCase().includes(q)
      ));
    }
    const sorted = [...rows];
    sorted.sort((a, b) => {
      if (sortBy === 'oldest') return (a._date || 0) - (b._date || 0);
      if (sortBy === 'highest') return b.rating - a.rating;
      if (sortBy === 'lowest') return a.rating - b.rating;
      return (b._date || 0) - (a._date || 0); // newest
    });
    return sorted;
  }, [enriched, ratingFilter, storeFilter, dateFrom, dateTo, search, sortBy]);

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Stat label="Total reviews" value={total} />
        <Stat label="Average rating" value={total ? avg.toFixed(2) : '—'} />
        <Stat label="5-star share" value={total ? `${Math.round((distribution[0].count / total) * 100)}%` : '—'} />
        <Stat label="With written feedback" value={withText} />
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
          size="small" placeholder="Search product, customer, or review text…"
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
        {filtered.length} of {total} review{total === 1 ? '' : 's'}
      </Typography>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Product</TableCell>
              {showStoreColumn && <TableCell>Store</TableCell>}
              <TableCell>Customer</TableCell>
              <TableCell>Rating</TableCell>
              <TableCell>Review</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(r._date)}</TableCell>
                <TableCell>{r._product?.name || r.productId}</TableCell>
                {showStoreColumn && <TableCell>{r._store?.name || r.storeId}</TableCell>}
                <TableCell>{r.customerName || '—'}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Rating value={r.rating} readOnly size="small" />
                </TableCell>
                <TableCell sx={{ maxWidth: 360 }}>{r.text || <em>No written feedback</em>}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={showStoreColumn ? 6 : 5}>
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    {total === 0 ? 'No reviews yet.' : 'No reviews match these filters.'}
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
