import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Table, TableHead,
  TableBody, TableRow, TableCell, IconButton, TableContainer, Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { formatINR } from '../lib/calculations';
import { SERVICE_TIERS, countryName } from '../lib/shipping';
import { formatUSD } from '../lib/garudavegaRates';

// Same rows/chargedTier the actual shipping charge is computed from
// (internationalShipping() in lib/shipping.js) -- shown here so the chart a
// customer sees can never drift from what they're actually billed.
export default function ShippingRateDialog({
  open, onClose, country, rows = [], chargedTier, usdInrRate, disclaimer, ratesAsOf,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Shipping rate chart
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          India → {countryName(country)}{ratesAsOf ? ` — published rates as of ${ratesAsOf}` : ''}.
          {' '}{disclaimer}
        </Typography>
        {rows.length === 0 ? (
          <Typography color="text.secondary">
            No rate chart has been entered for this country yet — shipping is estimated from a flat
            per-kg fallback instead.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Weight</TableCell>
                  {SERVICE_TIERS.map((t) => (
                    <TableCell key={t.key} align="right">
                      {t.label}
                      {t.key === chargedTier && <Chip size="small" color="primary" label="Charged" sx={{ ml: 1 }} />}
                      <Typography variant="caption" display="block" color="text.secondary">{t.tat}</Typography>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.weightKg}>
                    <TableCell><strong>{row.weightKg} kg</strong></TableCell>
                    {SERVICE_TIERS.map((t) => (
                      <TableCell
                        key={t.key}
                        align="right"
                        sx={t.key === chargedTier ? { bgcolor: 'action.selected', fontWeight: 700 } : undefined}
                      >
                        {row[t.key] != null ? formatINR(row[t.key]) : '—'}
                        {row[t.key] != null && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {formatUSD(row[t.key], usdInrRate)}
                          </Typography>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          USD shown at ₹{usdInrRate}/$1 (approximate, admin-adjustable) — the order is always
          charged and settled in INR. Heavier than the last row shown? The charge is estimated
          per kg beyond it.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
