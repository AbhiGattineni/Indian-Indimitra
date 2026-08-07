import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Stack, Alert, Card, CardContent, Snackbar,
} from '@mui/material';
import { getPlatformConfig, setPlatformConfig } from '../../firebase/db';
import { seedCatalog } from '../../firebase/seed';
import { SEED_STORE } from '../../data/seedCatalog';
import { useAuthStore } from '../../store/useAuthStore';

export default function PlatformConfig() {
  const { user } = useAuthStore();
  const [config, setConfig] = useState({ commissionRate: 0, taxRate: 0, currency: 'INR' });
  const [saved, setSaved] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [snack, setSnack] = useState(null);

  useEffect(() => { (async () => setConfig(await getPlatformConfig()))(); }, []);

  const save = async () => {
    await setPlatformConfig({
      commissionRate: Number(config.commissionRate) || 0,
      taxRate: Number(config.taxRate) || 0,
      currency: 'INR',
    });
    setSaved(true);
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const r = await seedCatalog(user.uid);
      setSnack({
        severity: 'success',
        msg: `Seeded "${SEED_STORE.name}": +${r.productsAdded} products, +${r.categoriesAdded} categories`
          + (r.skipped ? `, ${r.skipped} already existed` : ''),
      });
    } catch (e) {
      setSnack({ severity: 'error', msg: e.message });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 520 }}>
      <Typography variant="h5" gutterBottom>Platform config</Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <TextField
            label="Commission rate (0–1, e.g. 0.10 = 10%)"
            type="number" value={config.commissionRate}
            onChange={(e) => setConfig({ ...config, commissionRate: e.target.value })}
            inputProps={{ step: 0.01, min: 0, max: 1 }}
          />
          <TextField
            label="Tax rate (0–1)"
            type="number" value={config.taxRate}
            onChange={(e) => setConfig({ ...config, taxRate: e.target.value })}
            inputProps={{ step: 0.01, min: 0, max: 1 }}
          />
          {saved && <Alert severity="success">Saved.</Alert>}
          <Button variant="contained" onClick={save}>Save</Button>
        </Stack>
      </Paper>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Demo data</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create the “{SEED_STORE.name}” store and load its catalog (28 products across
            Sweets, Hot Snacks, Pickles, Podis). Safe to run more than once.
          </Typography>
          <Button variant="contained" onClick={handleSeed} disabled={seeding}>
            {seeding ? 'Seeding…' : 'Seed catalog'}
          </Button>
        </CardContent>
      </Card>

      <Snackbar
        open={!!snack}
        autoHideDuration={5000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snack && (
          <Alert severity={snack.severity} onClose={() => setSnack(null)}>
            {snack.msg}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
}
