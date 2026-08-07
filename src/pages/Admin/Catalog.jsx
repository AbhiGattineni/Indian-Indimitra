import { useEffect, useState } from 'react';
import {
  Box, Typography, Tabs, Tab, Table, TableBody, TableCell, TableHead, TableRow, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Stack, Chip, Button,
  CircularProgress, Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  listStores, updateStore, listAllProducts, listCategories, updateProduct, deleteProduct,
} from '../../firebase/db';
import { uploadImage } from '../../firebase/storage';
import { formatINR } from '../../lib/calculations';
import { PRODUCT_STATUS, STORE_STATUS } from '../../lib/constants';

export default function Catalog() {
  const [tab, setTab] = useState('stores');
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [s, p, c] = await Promise.all([listStores(), listAllProducts(), listCategories()]);
    setStores(s);
    setProducts(p);
    setCategories(c);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }

  const storeNameById = Object.fromEntries(stores.map((s) => [s.id, s.name]));

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Stores & products</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tab value="stores" label="Stores" />
        <Tab value="products" label="Products" />
      </Tabs>

      {tab === 'stores' && <StoresTab stores={stores} onSaved={load} />}
      {tab === 'products' && (
        <ProductsTab products={products} categories={categories} storeNameById={storeNameById} onSaved={load} />
      )}
    </Box>
  );
}

/* ---------------- Stores ---------------- */

const EMPTY_STORE = {
  name: '', description: '', pickupAddress: '', shippingFlatFee: 0, freeShippingThreshold: 0,
  approvalStatus: STORE_STATUS.PENDING, imageUrl: '',
};

function StoresTab({ stores, onSaved }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_STORE);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const openEdit = (s) => {
    setEditing(s);
    setForm({ ...EMPTY_STORE, ...s, imageUrl: s.images?.[0] || s.imageUrl || '' });
    setError('');
    setOpen(true);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploading(true);
    try {
      const url = await uploadImage(`stores/${editing.id}`, file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    try {
      await updateStore(editing.id, {
        name: form.name,
        description: form.description,
        pickupAddress: form.pickupAddress,
        shippingFlatFee: Number(form.shippingFlatFee) || 0,
        freeShippingThreshold: Number(form.freeShippingThreshold) || 0,
        approvalStatus: form.approvalStatus,
        images: form.imageUrl ? [form.imageUrl] : [],
      });
      setOpen(false);
      onSaved();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Pickup address</TableCell>
            <TableCell align="right">Flat shipping</TableCell>
            <TableCell align="right">Free-ship over</TableCell>
            <TableCell>Status</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {stores.map((s) => (
            <TableRow key={s.id}>
              <TableCell>{s.name}</TableCell>
              <TableCell>{s.pickupAddress}</TableCell>
              <TableCell align="right">{formatINR(s.shippingFlatFee)}</TableCell>
              <TableCell align="right">{formatINR(s.freeShippingThreshold)}</TableCell>
              <TableCell><Chip size="small" label={s.approvalStatus} /></TableCell>
              <TableCell align="right">
                <IconButton onClick={() => openEdit(s)}><EditIcon /></IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit store</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="Description" multiline rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <TextField label="Pickup address" value={form.pickupAddress}
              onChange={(e) => setForm({ ...form, pickupAddress: e.target.value })} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Flat shipping fee (₹)" type="number" value={form.shippingFlatFee}
                onChange={(e) => setForm({ ...form, shippingFlatFee: e.target.value })} fullWidth />
              <TextField label="Free shipping over (₹)" type="number" value={form.freeShippingThreshold}
                onChange={(e) => setForm({ ...form, freeShippingThreshold: e.target.value })} fullWidth />
            </Box>
            <TextField select label="Approval status" value={form.approvalStatus}
              onChange={(e) => setForm({ ...form, approvalStatus: e.target.value })}>
              {Object.values(STORE_STATUS).map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
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
    </>
  );
}

/* ---------------- Products ---------------- */

const EMPTY_PRODUCT = {
  name: '', description: '', categoryId: '', price: 0, quantity: 0, unit: 'unit', imageUrl: '',
  status: PRODUCT_STATUS.ACTIVE,
};

function ProductsTab({ products, categories, storeNameById, onSaved }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const openEdit = (p) => { setEditing(p); setForm({ ...EMPTY_PRODUCT, ...p }); setError(''); setOpen(true); };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploading(true);
    try {
      const url = await uploadImage(`products/${editing.storeId}`, file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.name || !form.categoryId) { setError('Name and category are required.'); return; }
    try {
      await updateProduct(editing.id, {
        name: form.name, description: form.description, categoryId: form.categoryId,
        price: Number(form.price) || 0, quantity: Number(form.quantity) || 0,
        unit: form.unit, imageUrl: form.imageUrl, status: form.status,
      });
      setOpen(false);
      onSaved();
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    await deleteProduct(id);
    onSaved();
  };

  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Image</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Store</TableCell>
            <TableCell align="right">Price</TableCell>
            <TableCell align="right">Stock</TableCell>
            <TableCell>Status</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {products.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                {p.imageUrl && (
                  <Box component="img" src={p.imageUrl} sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1 }} />
                )}
              </TableCell>
              <TableCell>{p.name}</TableCell>
              <TableCell>{storeNameById[p.storeId] || p.storeId}</TableCell>
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
        <DialogTitle>Edit product</DialogTitle>
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
    </>
  );
}
