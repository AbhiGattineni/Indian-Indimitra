// Per-store banner images: the slides in the StoreImageSlider at the top of
// that store's Browse page (stored as store.images, in display order).
// Admin and the store's assigned FDM can both manage these -- same shared
// component, rendered from Admin (Stores & Products) and FDM (Manage store
// -> Banners tab). Every change (upload, reorder, remove) saves right away.
import { useState } from 'react';
import {
  Box, Typography, Button, IconButton, Paper, Alert, Stack, Tooltip, LinearProgress,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { updateStore } from '../firebase/db';
import { uploadImage } from '../firebase/storage';

const MAX_FILE_MB = 5;

export default function StoreBannersEditor({ store, onSaved }) {
  const [images, setImages] = useState(store.images || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const persist = async (next) => {
    await updateStore(store.id, { images: next });
    setImages(next);
    onSaved?.();
  };

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    const tooBig = files.filter((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (tooBig.length) {
      setError(`${tooBig.map((f) => f.name).join(', ')} ${tooBig.length > 1 ? 'are' : 'is'} over ${MAX_FILE_MB} MB.`);
      return;
    }
    run(async () => {
      const urls = await Promise.all(files.map((f) => uploadImage(`stores/${store.id}`, f)));
      await persist([...images, ...urls]);
    });
  };

  const move = (i, delta) => run(async () => {
    const next = [...images];
    [next[i], next[i + delta]] = [next[i + delta], next[i]];
    await persist(next);
  });

  const remove = (i) => {
    if (!window.confirm('Remove this banner from the store page?')) return;
    run(() => persist(images.filter((_, idx) => idx !== i)));
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        These rotate at the top of the store's Browse page, in this order. Use wide images
        (around 1600 × 500 px); the edges may be cropped on phones. Max {MAX_FILE_MB} MB each.
      </Typography>

      <Button
        component="label" variant="contained" startIcon={<AddPhotoAlternateIcon />} disabled={busy}
        sx={{ mb: 2 }}
      >
        Upload banners
        <input hidden type="file" accept="image/*" multiple onChange={handleFiles} />
      </Button>

      {busy && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {images.length === 0 ? (
        <Typography color="text.secondary">
          No banners yet. Customers see an "Offers &amp; promotions coming soon" placeholder.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {images.map((url, i) => (
            <Paper key={url} variant="outlined" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ width: 20, textAlign: 'center' }}>
                {i + 1}
              </Typography>
              <Box
                component="img" src={url} alt={`Banner ${i + 1}`}
                sx={{ flex: 1, minWidth: 0, height: { xs: 60, sm: 90 }, objectFit: 'cover', borderRadius: 1 }}
              />
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' } }}>
                <Tooltip title="Move up">
                  <span>
                    <IconButton size="small" disabled={busy || i === 0} onClick={() => move(i, -1)}>
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Move down">
                  <span>
                    <IconButton size="small" disabled={busy || i === images.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Remove">
                  <span>
                    <IconButton size="small" color="error" disabled={busy} onClick={() => remove(i)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}
