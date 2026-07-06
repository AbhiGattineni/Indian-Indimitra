import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableHead, TableRow, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Stack, Chip,
  CircularProgress, Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuthStore } from '../../store/useAuthStore';
import {
  getStoreByOwner, listProductsByStore, listCategories,
  createProduct, updateProduct, deleteProduct,
} from '../../firebase/db';
import { uploadImage } from '../../firebase/storage';
import { formatINR } from '../../lib/calculations';
import { PRODUCT_STATUS } from '../../lib/constants';

const EMPTY = { name: '', description: '', categoryId: '', price: 0, quantity: 0, unit: 'unit', imageUrl: '', status: PRODUCT_STATUS.ACTIVE };

export default function SellerListings() {
  const { user } = useAuthStore();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const load = async (s) => {
    const st = s || (await getStoreByOwner(user.uid));
    setStore(st);
    const [p, c] = await Promise.all([listProductsByStore(st.id), listCategories()]);
    setProducts(p);
    setCategories(c);
    setLoading(false);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setError(''); setOpen(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...EMPTY, ...p }); setError(''); setOpen(true); };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(`products/${store.id}`, file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.name || !form.categoryId) { setError('Name and category are required.'); return; }
    const payload = {
      storeId: store.id, ownerUid: user.uid,
      name: form.name, description: form.description, categoryId: form.categoryId,
      price: Number(form.price) || 0, quantity: Number(form.quantity) || 0,
      unit: form.unit, imageUrl: form.imageUrl, status: form.status,
    };
    try {
      if (editing) await updateProduct(editing.id, payload);
      else await createProduct(payload);
      setOpen(false);
      load(store);
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this listing?')) return;
    await deleteProduct(id);
    load(store);
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">My listings</Typography>
        <Button variant="contained" onClick={openNew}>Add listing</Button>
      </Box>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell align="right">Price</TableCell>
            <TableCell align="right">Stock</TableCell>
            <TableCell>Status</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {products.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.name}</TableCell>
              <TableCell align="right">{formatINR(p.price)}</TableCell>
              <TableCell align="right">{p.quantity} {p.unit}</TableCell>
              <TableCell><Chip size="small" label={p.status} /></TableCell>
              <TableCell align="right">
                <IconButton onClick={() => openEdit(p)}><EditIcon /></IconButton>
                <IconButton onClick={() => remove(p.id)}><DeleteIcon /></IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit listing' : 'Add listing'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="Description" multiline rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <TextField select label="Category" value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Price (₹)" type="number" value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })} fullWidth />
              <TextField label="Quantity" type="number" value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })} fullWidth />
              <TextField label="Unit" value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })} sx={{ width: 120 }} />
            </Box>
            <TextField select label="Status" value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <MenuItem value={PRODUCT_STATUS.ACTIVE}>Active</MenuItem>
              <MenuItem value={PRODUCT_STATUS.UNLISTED}>Unlisted</MenuItem>
            </TextField>
            <Button component="label" variant="outlined" disabled={uploading}>
              {uploading ? 'Uploading…' : form.imageUrl ? 'Change image' : 'Upload image'}
              <input hidden type="file" accept="image/*" onChange={handleFile} />
            </Button>
            {form.imageUrl && (
              <Box component="img" src={form.imageUrl} sx={{ width: 120, borderRadius: 1 }} />
            )}
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
