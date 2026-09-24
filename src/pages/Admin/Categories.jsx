// Categories belong to one store (see StoreCategoriesEditor) -- this page is
// just a store picker in front of the same editor FDM gets from their Manage
// store > Categories tab, so admin can manage any store's categories here
// too without going through Stores & products.
import { useEffect, useState } from 'react';
import { Box, Typography, TextField, MenuItem, CircularProgress } from '@mui/material';
import { listStores } from '../../firebase/db';
import StoreCategoriesEditor from '../../components/StoreCategoriesEditor';

export default function Categories() {
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listStores().then((s) => {
      setStores(s);
      setLoading(false);
    });
  }, []);

  const store = stores.find((s) => s.id === storeId) || null;

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ maxWidth: 640 }}>
      <Typography variant="h5" gutterBottom>Categories</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Each store has its own categories. Pick a store to add, rename, or enable/disable its categories.
      </Typography>

      {stores.length === 0 ? (
        <Typography color="text.secondary">No stores yet.</Typography>
      ) : (
        <TextField
          select label="Store" value={storeId} fullWidth sx={{ mb: 3, maxWidth: 360 }}
          onChange={(e) => setStoreId(e.target.value)}
        >
          {stores.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
        </TextField>
      )}

      {store && <StoreCategoriesEditor store={store} />}
    </Box>
  );
}
