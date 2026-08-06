import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Table, TableHead,
  TableBody, TableRow, TableCell, IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { formatINR } from '../lib/calculations';
import {
  GARUDAVEGA_RATE_CARD, RATE_CARD_AS_OF, RATE_CARD_ROUTE, SERVICE_TIERS, formatUSD,
} from '../lib/garudavegaRates';

export default function ShippingRateDialog({ open, onClose, usdInrRate }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Shipping rate chart
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {RATE_CARD_ROUTE} — published rates as of {RATE_CARD_AS_OF}. Rates change with courier
          updates and the USD/INR exchange rate; the exact charge is confirmed at checkout.
          Weights are rounded up to the courier&apos;s nearest billable step.
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Weight</TableCell>
              {SERVICE_TIERS.map((t) => (
                <TableCell key={t.key} align="right">
                  {t.label}
                  <Typography variant="caption" display="block" color="text.secondary">{t.tat}</Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {GARUDAVEGA_RATE_CARD.map((row) => (
              <TableRow key={row.weightKg}>
                <TableCell><strong>{row.weightKg} kg</strong></TableCell>
                {SERVICE_TIERS.map((t) => (
                  <TableCell key={t.key} align="right">
                    {formatINR(row[t.key])}
                    <Typography variant="caption" display="block" color="text.secondary">
                      {formatUSD(row[t.key], usdInrRate)}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          USD shown at ₹{usdInrRate}/$1 (approximate, admin-adjustable) — the order is always
          charged and settled in INR.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
