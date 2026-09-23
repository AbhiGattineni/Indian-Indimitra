import { useEffect, useState } from 'react';
import {
  Box, Typography, Tabs, Tab, Table, TableBody, TableCell, TableHead, TableRow, IconButton, TableContainer,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Stack, Chip, Button,
  CircularProgress, Alert, InputAdornment, FormControl, InputLabel, Select, OutlinedInput, Checkbox, ListItemText,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import {
  listStores, updateStore, createStore, getUserByEmail, setUserRole, listUsersByRole,
  listAllProducts, listCategories, createProduct, updateProduct, deleteProduct,
} from '../../firebase/db';
import { uploadImage } from '../../firebase/storage';
import { formatINR } from '../../lib/calculations';
import { PRODUCT_STATUS, STORE_STATUS, ROLES } from '../../lib/constants';
import PackagingChartEditor from '../../components/PackagingChartEditor';

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
        <ProductsTab
          products={products} categories={categories} stores={stores} storeNameById={storeNameById} onSaved={load}
        />
      )}
    </Box>
  );
}

/* ---------------- Stores ---------------- */

// Multi-select of FDMs, shared by the Add-store and Edit-store dialogs.
function FdmAssignSelect({ idPrefix, fdms, value, onChange }) {
  const labelId = `${idPrefix}-fdms-label`;
  return (
    <FormControl fullWidth>
      <InputLabel id={labelId}>Assign managers (optional)</InputLabel>
      <Select
        labelId={labelId}
        multiple
        input={<OutlinedInput label="Assign managers (optional)" />}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        renderValue={(selected) => fdms
          .filter((f) => selected.includes(f.id))
          .map((f) => f.displayName || f.email)
          .join(', ')}
      >
        {fdms.length === 0 ? (
          <MenuItem disabled>No managers yet — add one under Managers.</MenuItem>
        ) : fdms.map((f) => (
          <MenuItem key={f.id} value={f.id}>
            <Checkbox checked={value.includes(f.id)} />
            <ListItemText primary={f.displayName || f.email} secondary={f.email} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

const EMPTY_STORE = {
  name: '', description: '', pickupAddress: '', shippingFlatFee: 0, freeShippingThreshold: 0,
  approvalStatus: STORE_STATUS.PENDING, imageUrl: '', fdmUids: [],
};

const EMPTY_NEW_STORE = {
  ownerEmail: '', name: '', description: '', pickupAddress: '',
  shippingFlatFee: 0, freeShippingThreshold: 0, fdmUids: [],
};

function StoresTab({ stores, onSaved }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_STORE);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [packagingStore, setPackagingStore] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_NEW_STORE);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const [fdms, setFdms] = useState([]);

  useEffect(() => { listUsersByRole(ROLES.FDM).then(setFdms); }, []);

  const openEdit = (s) => {
    setEditing(s);
    setForm({ ...EMPTY_STORE, ...s, imageUrl: s.images?.[0] || s.imageUrl || '', fdmUids: s.fdmUids || [] });
    setError('');
    setOpen(true);
  };

  const openAdd = () => { setAddForm(EMPTY_NEW_STORE); setAddError(''); setAddOpen(true); };

  // Onboard a business directly (skipping the pending-approval queue): looks
  // up the owner by email (they must have signed in at least once), promotes
  // a plain customer to seller (same as SellerApprovals' approve()), and
  // optionally assigns one or more FDMs to run it right away.
  const createStoreDirect = async () => {
    const email = addForm.ownerEmail.trim().toLowerCase();
    if (!email || !addForm.name || !addForm.pickupAddress) {
      setAddError('Owner email, store name and pickup address are required.');
      return;
    }
    setAddSaving(true);
    setAddError('');
    try {
      const owner = await getUserByEmail(email);
      if (!owner) {
        setAddError(`No account found for ${email}. Ask them to sign in once first, then add the store.`);
        return;
      }
      await createStore(owner.id, {
        name: addForm.name,
        description: addForm.description,
        pickupAddress: addForm.pickupAddress,
        shippingFlatFee: Number(addForm.shippingFlatFee) || 0,
        freeShippingThreshold: Number(addForm.freeShippingThreshold) || 0,
        images: [],
        approvalStatus: STORE_STATUS.APPROVED,
        fdmUids: addForm.fdmUids,
      });
      if (owner.role === ROLES.CUSTOMER) await setUserRole(owner.id, ROLES.SELLER);
      setAddOpen(false);
      onSaved();
    } catch (e) {
      setAddError(e.message);
    } finally {
      setAddSaving(false);
    }
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
        fdmUids: form.fdmUids,
      });
      setOpen(false);
      onSaved();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Add store</Button>
      </Box>

      <TableContainer>
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
                  <IconButton onClick={() => setPackagingStore(s)} title="Packaging chart">
                    <Inventory2Icon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
            <FdmAssignSelect
              idPrefix="edit-store"
              fdms={fdms}
              value={form.fdmUids}
              onChange={(fdmUids) => setForm({ ...form, fdmUids })}
            />
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

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add store</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Owner's email" value={addForm.ownerEmail}
              onChange={(e) => setAddForm({ ...addForm, ownerEmail: e.target.value })}
              placeholder="they must have signed in at least once"
            />
            <TextField label="Name" value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} />
            <TextField label="Description" multiline rows={2} value={addForm.description}
              onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} />
            <TextField label="Pickup address" value={addForm.pickupAddress}
              onChange={(e) => setAddForm({ ...addForm, pickupAddress: e.target.value })} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Flat shipping fee (₹)" type="number" value={addForm.shippingFlatFee}
                onChange={(e) => setAddForm({ ...addForm, shippingFlatFee: e.target.value })} fullWidth />
              <TextField label="Free shipping over (₹)" type="number" value={addForm.freeShippingThreshold}
                onChange={(e) => setAddForm({ ...addForm, freeShippingThreshold: e.target.value })} fullWidth />
            </Box>
            <FdmAssignSelect
              idPrefix="add-store"
              fdms={fdms}
              value={addForm.fdmUids}
              onChange={(fdmUids) => setAddForm({ ...addForm, fdmUids })}
            />
            <Typography variant="caption" color="text.secondary">
              Created as approved — skips the pending-approval queue. Add an image and packaging chart
              afterward from the store's row.
            </Typography>
            {addError && <Alert severity="error">{addError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={createStoreDirect} disabled={addSaving}>
            {addSaving ? 'Adding…' : 'Add store'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!packagingStore} onClose={() => setPackagingStore(null)} fullWidth maxWidth="md">
        <DialogTitle>Packaging chart{packagingStore ? ` — ${packagingStore.name}` : ''}</DialogTitle>
        <DialogContent>
          {packagingStore && (
            <PackagingChartEditor
              store={packagingStore}
              onSaved={onSaved}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPackagingStore(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

/* ---------------- Products ---------------- */

const EMPTY_PRODUCT = {
  name: '', description: '', categoryId: '', price: 0, quantity: 0, unit: 'unit', imageUrl: '',
  status: PRODUCT_STATUS.ACTIVE, warning: '',
};

const EMPTY_NEW_PRODUCT = {
  storeId: '', name: '', description: '', categoryId: '', price: 0, quantity: 0, unit: 'unit',
  status: PRODUCT_STATUS.ACTIVE, warning: '',
};

function ProductsTab({ products, categories, stores, storeNameById, onSaved }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_NEW_PRODUCT);
  const [addError, setAddError] = useState('');
  const [addSaving, setAddSaving] = useState(false);

  const openEdit = (p) => { setEditing(p); setForm({ ...EMPTY_PRODUCT, ...p }); setError(''); setOpen(true); };

  const openAdd = () => { setAddForm(EMPTY_NEW_PRODUCT); setAddError(''); setAddOpen(true); };

  const createProductDirect = async () => {
    if (!addForm.storeId || !addForm.name || !addForm.categoryId) {
      setAddError('Store, name and category are required.');
      return;
    }
    setAddSaving(true);
    setAddError('');
    try {
      const store = stores.find((s) => s.id === addForm.storeId);
      await createProduct({
        storeId: addForm.storeId,
        ownerUid: store?.ownerUid || '',
        name: addForm.name,
        description: addForm.description,
        categoryId: addForm.categoryId,
        price: Number(addForm.price) || 0,
        quantity: Number(addForm.quantity) || 0,
        unit: addForm.unit,
        imageUrl: '',
        status: addForm.status,
        warning: addForm.warning,
      });
      setAddOpen(false);
      onSaved();
    } catch (e) {
      setAddError(e.message);
    } finally {
      setAddSaving(false);
    }
  };

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
        unit: form.unit, imageUrl: form.imageUrl, status: form.status, warning: form.warning,
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

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return p.name?.toLowerCase().includes(q) || (storeNameById[p.storeId] || '').toLowerCase().includes(q);
  });

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search products or stores"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 260 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Add product</Button>
      </Box>

      <TableContainer>
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
            {filtered.map((p) => (
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
                <TableCell>
                  <Chip
                    size="small"
                    label={p.status}
                    color={p.status === PRODUCT_STATUS.ACTIVE ? 'success' : 'error'}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => openEdit(p)}><EditIcon /></IconButton>
                  <IconButton onClick={() => remove(p.id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
            <TextField
              label="Warning (optional)"
              placeholder="e.g. Shelf life: 3 days, including travel."
              helperText="Shown to customers in red on the product card and detail page."
              value={form.warning}
              onChange={(e) => setForm({ ...form, warning: e.target.value })}
            />
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

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add product</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="Store" value={addForm.storeId}
              onChange={(e) => setAddForm({ ...addForm, storeId: e.target.value })}>
              {stores.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </TextField>
            <TextField label="Name" value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} />
            <TextField label="Description" multiline rows={2} value={addForm.description}
              onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} />
            <TextField select label="Category" value={addForm.categoryId}
              onChange={(e) => setAddForm({ ...addForm, categoryId: e.target.value })}>
              {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Price (₹)" type="number" value={addForm.price}
                onChange={(e) => setAddForm({ ...addForm, price: e.target.value })} fullWidth />
              <TextField label="Quantity" type="number" value={addForm.quantity}
                onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })} fullWidth />
              <TextField label="Unit" value={addForm.unit}
                onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })} sx={{ width: 120 }} />
            </Box>
            <TextField select label="Status" value={addForm.status}
              onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}>
              <MenuItem value={PRODUCT_STATUS.ACTIVE}>Active</MenuItem>
              <MenuItem value={PRODUCT_STATUS.UNLISTED}>Unlisted</MenuItem>
            </TextField>
            <TextField
              label="Warning (optional)"
              placeholder="e.g. Shelf life: 3 days, including travel."
              helperText="Shown to customers in red on the product card and detail page."
              value={addForm.warning}
              onChange={(e) => setAddForm({ ...addForm, warning: e.target.value })}
            />
            <Typography variant="caption" color="text.secondary">
              Add an image afterward by editing the product.
            </Typography>
            {addError && <Alert severity="error">{addError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={createProductDirect} disabled={addSaving}>
            {addSaving ? 'Adding…' : 'Add product'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
