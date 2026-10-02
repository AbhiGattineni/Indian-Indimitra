// Grid of product cards for staff product lists (Admin -> Stores & Products
// -> Products, and the seller's / FDM's Products tab). Each card looks like
// what customers see on the Browse page -- same image crop, name and
// customer price -- plus the staff-only bits: stock, listing status, seller
// price/margin, and edit/delete. Clicking a card opens it for editing.
// ProductViewToggle + useProductViewMode let each page switch between this
// grid and its existing table; the choice is remembered per browser.
import { useState } from 'react';
import {
  Grid, Card, CardMedia, CardContent, CardActionArea, CardActions, Typography, Box, Chip,
  IconButton, Tooltip, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import { formatINR, customerPrice, effectiveMargin } from '../lib/calculations';
import { placeholderImage } from '../lib/placeholder';
import { PRODUCT_STATUS, unitTypeShortLabel } from '../lib/constants';

const VIEW_KEY = 'staffProductView';

export function useProductViewMode() {
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem(VIEW_KEY) || 'grid'; } catch { return 'grid'; }
  });
  const update = (next) => {
    if (!next) return;
    setMode(next);
    try { localStorage.setItem(VIEW_KEY, next); } catch { /* storage unavailable */ }
  };
  return [mode, update];
}

export function ProductViewToggle({ value, onChange }) {
  return (
    <ToggleButtonGroup exclusive size="small" value={value} onChange={(_, v) => onChange(v)}>
      <ToggleButton value="grid" aria-label="Grid view"><GridViewIcon fontSize="small" /></ToggleButton>
      <ToggleButton value="table" aria-label="List view"><ViewListIcon fontSize="small" /></ToggleButton>
    </ToggleButtonGroup>
  );
}

export default function StaffProductGrid({ products, onEdit, onDelete, storeNameById }) {
  if (products.length === 0) {
    return <Typography color="text.secondary">No products.</Typography>;
  }
  return (
    <Grid container spacing={2}>
      {products.map((p) => {
        const unlisted = p.status !== PRODUCT_STATUS.ACTIVE;
        const soldOut = !p.quantity;
        return (
          <Grid item xs={6} sm={4} md={3} lg={2.4} key={p.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', opacity: unlisted ? 0.7 : 1 }}>
              <CardActionArea onClick={() => onEdit(p)} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                <Box sx={{ position: 'relative' }}>
                  <CardMedia
                    component="img"
                    image={p.imageUrl || placeholderImage(p.name)}
                    alt={p.name}
                    loading="lazy"
                    sx={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block' }}
                  />
                  <Box sx={{ position: 'absolute', top: 6, left: 6, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {unlisted && <Chip size="small" label="Unlisted" color="error" />}
                    {soldOut && <Chip size="small" label="Sold out" sx={{ bgcolor: 'rgba(255,255,255,0.9)' }} />}
                    {!p.imageUrl && <Chip size="small" label="No image" sx={{ bgcolor: 'rgba(255,255,255,0.9)' }} />}
                  </Box>
                </Box>
                <CardContent sx={{ flex: 1, pb: 1 }}>
                  <Typography noWrap fontWeight={600}>{p.name}</Typography>
                  {storeNameById && (
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                      {storeNameById[p.storeId] || p.storeId}
                    </Typography>
                  )}
                  <Typography color="primary" fontWeight={700}>
                    {formatINR(customerPrice(p))}
                    <Typography component="span" variant="caption" color="text.secondary">
                      {' '}/{unitTypeShortLabel(p.unitType)}
                    </Typography>
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Seller {formatINR(p.price)} + margin {formatINR(effectiveMargin(p))}
                  </Typography>
                  <Typography variant="caption" color={soldOut ? 'error.main' : 'text.secondary'} sx={{ display: 'block' }}>
                    Stock: {p.quantity ?? 0} {p.unit}
                  </Typography>
                  {p.warning && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <WarningAmberIcon color="error" sx={{ fontSize: 15 }} />
                      <Typography variant="caption" color="error.main" fontWeight={600} noWrap>
                        {p.warning}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </CardActionArea>
              <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => onEdit(p)}><EditIcon fontSize="small" /></IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton size="small" onClick={() => onDelete(p.id)}><DeleteIcon fontSize="small" /></IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}
