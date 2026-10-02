// Photo manager for the product forms (Admin add/edit, seller/FDM add/edit):
// upload several photos at once, reorder them, remove them. The first photo
// is the cover shown on product cards; the rest appear in the product
// popup's slideshow.
import { useState } from 'react';
import { Box, Button, IconButton, Typography, Tooltip, LinearProgress } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { uploadImage } from '../firebase/storage';

const MAX_FILE_MB = 5;
export const MAX_PRODUCT_IMAGES = 10;

// `storagePath` is where uploads go (e.g. products/{storeId}); null disables
// uploading (with `disabledHint` explaining why). `onUploadingChange` lets
// the form hold Save until uploads finish.
export default function ProductImagesField({ images, onChange, storagePath, disabledHint, onUploadingChange, onError }) {
  const [uploading, setUploading] = useState(false);
  const setBusy = (b) => { setUploading(b); onUploadingChange?.(b); };

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length || !storagePath) return;
    const room = MAX_PRODUCT_IMAGES - images.length;
    if (room <= 0) { onError?.(`Up to ${MAX_PRODUCT_IMAGES} photos per product.`); return; }
    const tooBig = files.filter((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (tooBig.length) { onError?.(`${tooBig.map((f) => f.name).join(', ')}: over ${MAX_FILE_MB} MB.`); return; }
    const batch = files.slice(0, room);
    if (batch.length < files.length) onError?.(`Only the first ${room} photo(s) were added — up to ${MAX_PRODUCT_IMAGES} per product.`);
    setBusy(true);
    try {
      const urls = await Promise.all(batch.map((f) => uploadImage(storagePath, f)));
      onChange([...images, ...urls]);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setBusy(false);
    }
  };

  const move = (i, d) => {
    const next = [...images];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  const remove = (i) => onChange(images.filter((_, idx) => idx !== i));

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Button
          component="label" variant="outlined" startIcon={<AddPhotoAlternateIcon />}
          disabled={!storagePath || uploading || images.length >= MAX_PRODUCT_IMAGES}
        >
          {uploading ? 'Uploading…' : images.length ? 'Add photos' : 'Upload photos'}
          <input hidden type="file" accept="image/*" multiple onChange={handleFiles} />
        </Button>
        <Typography variant="caption" color="text.secondary">
          {!storagePath && disabledHint
            ? disabledHint
            : `${images.length}/${MAX_PRODUCT_IMAGES} · first photo is the cover · max ${MAX_FILE_MB} MB each`}
        </Typography>
      </Box>
      {uploading && <LinearProgress sx={{ mt: 1 }} />}
      {images.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 1, mt: 1.5 }}>
          {images.map((url, i) => (
            <Box key={url} sx={{ position: 'relative', border: '1px solid', borderColor: i === 0 ? 'primary.main' : 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
              <Box component="img" src={url} alt={`Photo ${i + 1}`} sx={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
              {i === 0 && (
                <Typography variant="caption" sx={{ position: 'absolute', top: 4, left: 4, px: 0.75, borderRadius: 1, bgcolor: 'primary.main', color: '#fff', fontWeight: 600 }}>
                  Cover
                </Typography>
              )}
              <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', bgcolor: 'rgba(255,255,255,0.85)' }}>
                <Tooltip title="Move left"><span>
                  <IconButton size="small" disabled={i === 0} onClick={() => move(i, -1)}><ChevronLeftIcon fontSize="small" /></IconButton>
                </span></Tooltip>
                <Tooltip title="Remove"><IconButton size="small" color="error" onClick={() => remove(i)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Move right"><span>
                  <IconButton size="small" disabled={i === images.length - 1} onClick={() => move(i, 1)}><ChevronRightIcon fontSize="small" /></IconButton>
                </span></Tooltip>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
