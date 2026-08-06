import { Fragment, useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableBody, TableRow, TableCell, Chip,
} from '@mui/material';
import { getShippingRates } from '../../firebase/db';
import { formatINR } from '../../lib/calculations';
import {
  GARUDAVEGA_RATE_CARD, RATE_CARD_AS_OF, RATE_CARD_ROUTE, SERVICE_TIERS, DEFAULT_USD_INR_RATE,
  formatUSD, withDeltas,
} from '../../lib/garudavegaRates';

export default function ShippingRateChart() {
  const [usdInrRate, setUsdInrRate] = useState(DEFAULT_USD_INR_RATE);

  useEffect(() => {
    (async () => {
      const rates = await getShippingRates();
      if (rates?.usdInrRate) setUsdInrRate(rates.usdInrRate);
    })();
  }, []);

  const rows = withDeltas(GARUDAVEGA_RATE_CARD);

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Typography variant="h5" gutterBottom>Shipping rate chart</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {RATE_CARD_ROUTE} — published rates as of {RATE_CARD_AS_OF}. Rates change with courier
        updates and the USD/INR exchange rate; confirm the exact charge at checkout before
        shipping. Weights are rounded up to the courier&apos;s nearest billable step.
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Tip: check the &quot;extra to reach this weight&quot; column below — sometimes rounding up
        to the next published weight costs barely more than shipping at the lower weight.
      </Typography>

      <Paper sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell rowSpan={2}>Weight</TableCell>
              {SERVICE_TIERS.map((t) => (
                <TableCell key={t.key} colSpan={2} align="center">
                  {t.label}
                  <Typography variant="caption" display="block" color="text.secondary">{t.tat}</Typography>
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              {SERVICE_TIERS.map((t) => (
                <Fragment key={t.key}>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Extra to reach</TableCell>
                </Fragment>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.weightKg}>
                <TableCell>
                  <strong>{row.weightKg} kg</strong>
                </TableCell>
                {SERVICE_TIERS.map((t) => (
                  <Fragment key={t.key}>
                    <TableCell align="right">
                      {formatINR(row[t.key])}
                      <Typography variant="caption" display="block" color="text.secondary">
                        {formatUSD(row[t.key], usdInrRate)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {row.delta ? (
                        <Chip
                          size="small"
                          label={`+${formatINR(row.delta[t.key].extra)} / +${row.deltaKg}kg`}
                          color={row.delta[t.key].perKg < 500 ? 'success' : 'default'}
                          variant="outlined"
                        />
                      ) : '—'}
                    </TableCell>
                  </Fragment>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        USD shown at ₹{usdInrRate}/$1 (approximate, admin-adjustable) — for reference only, the
        order is always charged and settled in INR.
      </Typography>
    </Box>
  );
}
