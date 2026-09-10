import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Stack, Alert, MenuItem, Table, TableHead, TableContainer,
  TableBody, TableRow, TableCell, IconButton, Tabs, Tab, Radio, RadioGroup, FormControlLabel, FormLabel,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { getShippingRates, setShippingRates } from '../../firebase/db';
import { useAuthStore } from '../../store/useAuthStore';
import {
  SHIPPING_COUNTRIES, DOMESTIC_COUNTRY, defaultShippingRates, SERVICE_TIERS,
} from '../../lib/shipping';

const INTL_COUNTRIES = SHIPPING_COUNTRIES.filter((c) => c.code !== DOMESTIC_COUNTRY);

function emptyRow() {
  const row = { weightKg: '' };
  SERVICE_TIERS.forEach((t) => { row[t.key] = ''; });
  return row;
}

export default function ShippingRates() {
  const { user } = useAuthStore();
  const [rates, setRates] = useState(defaultShippingRates());
  const [country, setCountry] = useState(INTL_COUNTRIES[0].code);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setRates(await getShippingRates());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const chart = rates.countries?.[country] || { rows: [], perKgBeyond: {} };
  const rows = chart.rows || [];

  const updateChart = (patch) => {
    setRates({ ...rates, countries: { ...rates.countries, [country]: { ...chart, ...patch } } });
    setSaved(false);
  };
  const updateRow = (i, patch) => {
    updateChart({ rows: rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });
  };
  const addRow = () => updateChart({ rows: [...rows, emptyRow()] });
  const removeRow = (i) => updateChart({ rows: rows.filter((_, idx) => idx !== i) });
  const updatePerKgBeyond = (tierKey, value) => {
    updateChart({ perKgBeyond: { ...chart.perKgBeyond, [tierKey]: value } });
  };

  const save = async () => {
    const cleanedCountries = {};
    Object.entries(rates.countries || {}).forEach(([code, c]) => {
      const cleanedRows = (c.rows || [])
        .filter((r) => r.weightKg !== '')
        .map((r) => {
          const row = { weightKg: Number(r.weightKg) };
          SERVICE_TIERS.forEach((t) => { row[t.key] = r[t.key] === '' ? null : Number(r[t.key]); });
          return row;
        })
        .sort((a, b) => a.weightKg - b.weightKg);
      const perKgBeyond = {};
      SERVICE_TIERS.forEach((t) => { perKgBeyond[t.key] = Number(c.perKgBeyond?.[t.key]) || 0; });
      cleanedCountries[code] = { rows: cleanedRows, perKgBeyond };
    });
    await setShippingRates({
      chargedTier: rates.chargedTier,
      buffer: Number(rates.buffer) || 0,
      disclaimer: rates.disclaimer || '',
      ratesAsOf: rates.ratesAsOf || '',
      usdInrRate: Number(rates.usdInrRate) || 95,
      countries: cleanedCountries,
    }, user?.email);
    setSaved(true);
  };

  if (loading) return null;

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Typography variant="h5" gutterBottom>Shipping rates (international)</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        One weight × service-tier chart per destination country — the exact same numbers are shown to
        customers on the rate chart at checkout and used to calculate what they're actually charged, so
        the two can never drift apart. Domestic shipping is set per-store, not here.
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <Box>
            <FormLabel sx={{ fontSize: 14, display: 'block', mb: 0.5 }}>
              Service tier actually charged to customers
            </FormLabel>
            <RadioGroup
              row
              value={rates.chargedTier}
              onChange={(e) => { setRates({ ...rates, chargedTier: e.target.value }); setSaved(false); }}
            >
              {SERVICE_TIERS.map((t) => (
                <FormControlLabel key={t.key} value={t.key} control={<Radio size="small" />} label={t.label} />
              ))}
            </RadioGroup>
          </Box>
          <TextField
            label="Flat buffer per shipment (₹)"
            type="number"
            value={rates.buffer}
            onChange={(e) => { setRates({ ...rates, buffer: e.target.value }); setSaved(false); }}
            helperText="Added on top of the chart amount below. Keep at 0 so checkout matches the rate chart shown to customers exactly -- any nonzero value means checkout will charge more than the chart's displayed number."
          />
          <TextField
            label="USD/INR rate (₹ per $1, approximate)"
            type="number"
            value={rates.usdInrRate}
            onChange={(e) => { setRates({ ...rates, usdInrRate: e.target.value }); setSaved(false); }}
            helperText="Used to show shipping rate chart prices in USD alongside INR. Update periodically."
          />
          <TextField
            label="Rates as of (e.g. 2026-08-06)"
            value={rates.ratesAsOf || ''}
            onChange={(e) => { setRates({ ...rates, ratesAsOf: e.target.value }); setSaved(false); }}
            helperText="Shown to customers next to the disclaimer. Update this whenever you re-check courier pricing."
          />
          <TextField
            label="Disclaimer shown at checkout"
            value={rates.disclaimer || ''}
            onChange={(e) => { setRates({ ...rates, disclaimer: e.target.value }); setSaved(false); }}
            multiline minRows={2}
          />
          {rates.updatedAt && (
            <Typography variant="caption" color="text.secondary">
              Last saved {rates.updatedAt.toDate?.().toLocaleString?.() || ''}
              {rates.updatedBy ? ` by ${rates.updatedBy}` : ''}
            </Typography>
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Tabs
          value={country}
          onChange={(_, v) => setCountry(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          {INTL_COUNTRIES.map((c) => (
            <Tab key={c.code} value={c.code} label={c.name} sx={{ textTransform: 'none' }} />
          ))}
        </Tabs>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Weight (kg)</TableCell>
                {SERVICE_TIERS.map((t) => (
                  <TableCell key={t.key}>{t.label} (₹)</TableCell>
                ))}
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell sx={{ width: 110 }}>
                    <TextField
                      size="small" type="number" fullWidth value={r.weightKg ?? ''}
                      onChange={(e) => updateRow(i, { weightKg: e.target.value })}
                    />
                  </TableCell>
                  {SERVICE_TIERS.map((t) => (
                    <TableCell key={t.key} sx={{ width: 130 }}>
                      <TextField
                        size="small" type="number" fullWidth value={r[t.key] ?? ''}
                        onChange={(e) => updateRow(i, { [t.key]: e.target.value })}
                      />
                    </TableCell>
                  ))}
                  <TableCell sx={{ width: 48 }}>
                    <IconButton size="small" onClick={() => removeRow(i)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell sx={{ fontStyle: 'italic' }}>Beyond last row, ₹/kg</TableCell>
                {SERVICE_TIERS.map((t) => (
                  <TableCell key={t.key}>
                    <TextField
                      size="small" type="number" fullWidth value={chart.perKgBeyond?.[t.key] ?? ''}
                      onChange={(e) => updatePerKgBeyond(t.key, e.target.value)}
                    />
                  </TableCell>
                ))}
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        <Button startIcon={<AddIcon />} onClick={addRow} sx={{ mt: 1 }}>Add weight row</Button>
      </Paper>

      {saved && <Alert severity="success" sx={{ mt: 2 }}>Saved.</Alert>}
      <Button variant="contained" onClick={save} sx={{ mt: 2 }}>Save all countries</Button>
    </Box>
  );
}
