// Per-store table of "original product weight -> weight after packing"
// (box + packing material overhead), used to compute the actual shippable
// weight an order is billed on (see packedWeightKg/packagingOverheadKg in
// lib/shipping.js). Admin and the store's assigned FDM can both edit this
// -- same shared component, just rendered from different entry points
// (Admin -> Stores & Products, and FDM -> Manage store -> Packaging tab).
import { useState } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Stack, Alert, Table, TableHead, TableContainer,
  TableBody, TableRow, TableCell, IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { updateStore } from '../firebase/db';
import { normalizePackagingChart } from '../lib/shipping';

function emptyRow() {
  return { originalKg: '', afterKg: '' };
}

export default function PackagingChartEditor({ store, onSaved }) {
  const [chart, setChart] = useState(() => normalizePackagingChart(store.packagingChart));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const rows = chart.rows || [];
  const updateRows = (nextRows) => { setChart({ ...chart, rows: nextRows }); setSaved(false); };
  const updateRow = (i, patch) => updateRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => updateRows([...rows, emptyRow()]);
  const removeRow = (i) => updateRows(rows.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const cleanedRows = rows
        .filter((r) => r.originalKg !== '' && r.afterKg !== '')
        .map((r) => ({ originalKg: Number(r.originalKg), afterKg: Number(r.afterKg) }))
        .sort((a, b) => a.originalKg - b.originalKg);
      await updateStore(store.id, {
        packagingChart: {
          rows: cleanedRows,
          extraKgBeyondLastRow: Number(chart.extraKgBeyondLastRow) || 0,
        },
      });
      setSaved(true);
      onSaved?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        The box and packing material add real weight that ships (and is billed) along with the
        product. For each original product weight, enter what it actually weighs once packed --
        this drives the shipping weight/cost at checkout for {store.name}.
      </Typography>

      <Paper sx={{ p: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Original weight (kg)</TableCell>
                <TableCell>After packing (kg)</TableCell>
                <TableCell>Overhead (kg)</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell sx={{ width: 160 }}>
                    <TextField
                      size="small" type="number" fullWidth value={r.originalKg}
                      onChange={(e) => updateRow(i, { originalKg: e.target.value })}
                    />
                  </TableCell>
                  <TableCell sx={{ width: 160 }}>
                    <TextField
                      size="small" type="number" fullWidth value={r.afterKg}
                      onChange={(e) => updateRow(i, { afterKg: e.target.value })}
                    />
                  </TableCell>
                  <TableCell sx={{ width: 100 }}>
                    <Typography variant="body2" color="text.secondary">
                      {r.originalKg !== '' && r.afterKg !== ''
                        ? (Number(r.afterKg) - Number(r.originalKg)).toFixed(2)
                        : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ width: 48 }}>
                    <IconButton size="small" onClick={() => removeRow(i)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Button startIcon={<AddIcon />} onClick={addRow} sx={{ mt: 1 }}>Add weight row</Button>

        <Stack spacing={2} sx={{ mt: 3, maxWidth: 420 }}>
          <TextField
            label="Extra overhead per kg beyond the last row (kg)"
            type="number"
            value={chart.extraKgBeyondLastRow}
            onChange={(e) => { setChart({ ...chart, extraKgBeyondLastRow: e.target.value }); setSaved(false); }}
            helperText="For a product heavier than your last row above, this much extra packed weight is added per additional kg. Leave at 0 to just carry the last row's overhead forward flat."
          />
          {error && <Alert severity="error">{error}</Alert>}
          {saved && <Alert severity="success">Saved.</Alert>}
          <Button variant="contained" onClick={save} disabled={saving}>Save packaging chart</Button>
        </Stack>
      </Paper>
    </Box>
  );
}
