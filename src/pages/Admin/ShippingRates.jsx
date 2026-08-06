import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Stack, Alert, MenuItem, Table, TableHead,
  TableBody, TableRow, TableCell, IconButton, Tabs, Tab,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { getShippingRates, setShippingRates } from '../../firebase/db';
import { useAuthStore } from '../../store/useAuthStore';
import { SHIPPING_COUNTRIES, DOMESTIC_COUNTRY, defaultShippingRates } from '../../lib/shipping';

const INTL_COUNTRIES = SHIPPING_COUNTRIES.filter((c) => c.code !== DOMESTIC_COUNTRY);

const MODE_LABELS = {
  flat: 'Flat, up to weight',
  perKg: 'Per kg within band',
  perKgTotal: 'Per kg × whole shipment (bulk)',
};

function emptyBand() {
  return { uptoKg: '', mode: 'perKg', amount: '' };
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

  const bands = rates.countries?.[country] || [];

  const updateBands = (nextBands) => {
    setRates({ ...rates, countries: { ...rates.countries, [country]: nextBands } });
    setSaved(false);
  };
  const updateBand = (i, patch) => {
    updateBands(bands.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  };
  const addBand = () => updateBands([...bands, emptyBand()]);
  const removeBand = (i) => updateBands(bands.filter((_, idx) => idx !== i));

  const save = async () => {
    const cleanedCountries = {};
    Object.entries(rates.countries || {}).forEach(([code, list]) => {
      cleanedCountries[code] = list.map((b) => ({
        uptoKg: b.mode === 'perKgTotal' || b.uptoKg === '' ? null : Number(b.uptoKg),
        mode: b.mode,
        amount: Number(b.amount) || 0,
      }));
    });
    await setShippingRates({
      buffer: Number(rates.buffer) || 0,
      minKg: Number(rates.minKg) || 0.5,
      disclaimer: rates.disclaimer || '',
      ratesAsOf: rates.ratesAsOf || '',
      usdInrRate: Number(rates.usdInrRate) || 95,
      countries: cleanedCountries,
    }, user?.email);
    setSaved(true);
  };

  if (loading) return null;

  return (
    <Box sx={{ maxWidth: 780 }}>
      <Typography variant="h5" gutterBottom>Shipping rates (international)</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Weight-based rates charged for orders shipping outside India, by destination country.
        Domestic shipping is set per-store, not here. Rates here are shown to customers with the
        disclaimer below — keep it accurate to when you last checked the courier&apos;s published pricing.
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <TextField
            label="Flat buffer per shipment (₹)"
            type="number"
            value={rates.buffer}
            onChange={(e) => { setRates({ ...rates, buffer: e.target.value }); setSaved(false); }}
            helperText="Added on top of the banded cost below, for every international shipment."
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

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Mode</TableCell>
              <TableCell>Up to (kg)</TableCell>
              <TableCell>Amount (₹)</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {bands.map((b, i) => (
              <TableRow key={i}>
                <TableCell sx={{ minWidth: 220 }}>
                  <TextField
                    select size="small" fullWidth value={b.mode}
                    onChange={(e) => updateBand(i, { mode: e.target.value })}
                  >
                    {Object.entries(MODE_LABELS).map(([v, label]) => (
                      <MenuItem key={v} value={v}>{label}</MenuItem>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell sx={{ width: 140 }}>
                  <TextField
                    size="small" type="number" fullWidth
                    value={b.mode === 'perKgTotal' ? '' : b.uptoKg}
                    placeholder={b.mode === 'perKgTotal' ? '∞' : ''}
                    disabled={b.mode === 'perKgTotal'}
                    onChange={(e) => updateBand(i, { uptoKg: e.target.value })}
                  />
                </TableCell>
                <TableCell sx={{ width: 140 }}>
                  <TextField
                    size="small" type="number" fullWidth value={b.amount}
                    onChange={(e) => updateBand(i, { amount: e.target.value })}
                  />
                </TableCell>
                <TableCell sx={{ width: 48 }}>
                  <IconButton size="small" onClick={() => removeBand(i)}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button startIcon={<AddIcon />} onClick={addBand} sx={{ mt: 1 }}>Add band</Button>
      </Paper>

      {saved && <Alert severity="success" sx={{ mt: 2 }}>Saved.</Alert>}
      <Button variant="contained" onClick={save} sx={{ mt: 2 }}>Save all countries</Button>
    </Box>
  );
}
