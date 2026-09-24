// Per-store category management: add, rename, enable/disable. Categories are
// entirely store-owned (not shared with other stores) -- same shared
// component, rendered from both Admin (Stores & Products) and FDM (Manage
// store -> Categories tab). Disabling a category hides it from that store's
// customer-facing filter; any of its products still active get a chance to
// move to another category first, or are unlisted otherwise.
import { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Button, List, ListItem, ListItemText, IconButton, Paper,
  Switch, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, Alert,
  CircularProgress, Stack,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import {
  listCategoriesByStore, createStoreCategory, updateCategory,
  listProductsByStore, updateProduct,
} from '../firebase/db';
import { PRODUCT_STATUS } from '../lib/constants';

export default function StoreCategoriesEditor({ store, onChanged }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [disableTarget, setDisableTarget] = useState(null);
  const [affected, setAffected] = useState([]);
  const [reassign, setReassign] = useState({});
  const [disabling, setDisabling] = useState(false);

  const load = async () => {
    setLoading(true);
    setCategories(await listCategoriesByStore(store.id));
    setLoading(false);
  };
  useEffect(() => { load(); }, [store.id]);

  const add = async () => {
    if (!newName.trim()) return;
    setError('');
    try {
      await createStoreCategory(store.id, newName.trim());
      setNewName('');
      await load();
      onChanged?.();
    } catch (e) {
      setError(e.message);
    }
  };

  const startEdit = (c) => { setEditingId(c.id); setEditingName(c.name); };

  const saveEdit = async () => {
    if (!editingName.trim()) { setEditingId(null); return; }
    await updateCategory(editingId, { name: editingName.trim() });
    setEditingId(null);
    await load();
    onChanged?.();
  };

  const enable = async (c) => {
    await updateCategory(c.id, { enabled: true });
    await load();
    onChanged?.();
  };

  // Disabling with nothing active in it needs no confirmation; otherwise
  // warn and offer to move each affected product to another category.
  const requestDisable = async (c) => {
    setError('');
    const products = await listProductsByStore(store.id);
    const active = products.filter((p) => p.categoryId === c.id && p.status === PRODUCT_STATUS.ACTIVE);
    if (active.length === 0) {
      await updateCategory(c.id, { enabled: false });
      await load();
      onChanged?.();
      return;
    }
    setAffected(active);
    setReassign({});
    setDisableTarget(c);
  };

  const confirmDisable = async () => {
    setDisabling(true);
    setError('');
    try {
      await Promise.all(affected.map((p) => {
        const newCategoryId = reassign[p.id];
        return newCategoryId
          ? updateProduct(p.id, { categoryId: newCategoryId })
          : updateProduct(p.id, { status: PRODUCT_STATUS.UNLISTED });
      }));
      await updateCategory(disableTarget.id, { enabled: false });
      setDisableTarget(null);
      await load();
      onChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setDisabling(false);
    }
  };

  const otherEnabledCategories = (excludeId) =>
    categories.filter((c) => c.id !== excludeId && c.enabled !== false);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Categories for {store.name} — shown as filters on this store's page, and offered when adding a
        product here. Disabling a category doesn't delete it; it just hides it from customers, and
        (unless moved to another category first) unlists any products still in it.
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          size="small" label="New category" value={newName} fullWidth
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <Button variant="contained" onClick={add}>Add</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined">
        <List>
          {categories.length === 0 && (
            <ListItem><ListItemText secondary="No categories yet — add one above." /></ListItem>
          )}
          {categories.map((c) => {
            const enabled = c.enabled !== false;
            return (
              <ListItem
                key={c.id}
                secondaryAction={<Switch checked={enabled} onChange={() => (enabled ? requestDisable(c) : enable(c))} />}
              >
                {editingId === c.id ? (
                  <TextField
                    size="small" value={editingName} autoFocus
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  />
                ) : (
                  <>
                    <ListItemText primary={c.name} secondary={enabled ? null : 'Disabled'} />
                    <IconButton size="small" onClick={() => startEdit(c)} sx={{ mr: 1 }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </>
                )}
              </ListItem>
            );
          })}
        </List>
      </Paper>

      <Dialog open={!!disableTarget} onClose={() => setDisableTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Disable "{disableTarget?.name}"?</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            {affected.length} product{affected.length === 1 ? '' : 's'} in this category will be
            unlisted (hidden from customers) unless you move them to another category first.
          </Typography>
          <Stack spacing={1.5}>
            {affected.map((p) => (
              <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography sx={{ flex: 1 }} noWrap>{p.name}</Typography>
                <Select
                  size="small" displayEmpty sx={{ minWidth: 220 }}
                  value={reassign[p.id] || ''}
                  onChange={(e) => setReassign({ ...reassign, [p.id]: e.target.value })}
                >
                  <MenuItem value="">Unlist this product</MenuItem>
                  {otherEnabledCategories(disableTarget?.id).map((c) => (
                    <MenuItem key={c.id} value={c.id}>Move to {c.name}</MenuItem>
                  ))}
                </Select>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisableTarget(null)} disabled={disabling}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDisable} disabled={disabling}>
            {disabling ? 'Disabling…' : 'Disable category'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
