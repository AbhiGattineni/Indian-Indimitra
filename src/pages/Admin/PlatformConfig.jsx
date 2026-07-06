import { useEffect, useState } from 'react';
import { Box, Typography, Paper, TextField, Button, Stack, Alert } from '@mui/material';
import { getPlatformConfig, setPlatformConfig } from '../../firebase/db';

export default function PlatformConfig() {
  const [config, setConfig] = useState({ commissionRate: 0, taxRate: 0, currency: 'INR' });
  const [saved, setSaved] = useState(false);

  useEffect(() => { (async () => setConfig(await getPlatformConfig()))(); }, []);

  const save = async () => {
    await setPlatformConfig({
      commissionRate: Number(config.commissionRate) || 0,
      taxRate: Number(config.taxRate) || 0,
      currency: 'INR',
    });
    setSaved(true);
  };

  return (
    <Box sx={{ maxWidth: 420 }}>
      <Typography variant="h5" gutterBottom>Platform config</Typography>
      <Paper sx={{ p: 3 }}>
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
    </Box>
  );
}
