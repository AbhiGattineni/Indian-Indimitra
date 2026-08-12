// Admin manages Forward Deployment Managers: add someone (by email) as an FDM,
// assign them one or more businesses, and remove them. Assignment is stored on
// each store's fdmUids array (many-to-many: a store can have several FDMs, an
// FDM can run several stores).
import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Chip, Stack, TextField, Alert,
  CircularProgress, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  FormGroup, FormControlLabel, Checkbox, IconButton, Avatar,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StorefrontIcon from '@mui/icons-material/Storefront';
import {
  listUsersByRole, getUserByEmail, setUserRole, listStores, setStoreFdmUids,
} from '../../firebase/db';
import { ROLES } from '../../lib/constants';

export default function FdmManagement() {
  const [fdms, setFdms] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState(null); // { type, text }
  const [assignFor, setAssignFor] = useState(null); // the FDM being assigned
  const [checked, setChecked] = useState({}); // storeId -> bool
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [f, s] = await Promise.all([listUsersByRole(ROLES.FDM), listStores()]);
    setFdms(f);
    setStores(s);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const storesForFdm = (uid) => stores.filter((s) => (s.fdmUids || []).includes(uid));

  const addFdm = async () => {
    const clean = email.trim().toLowerCase();
    if (!clean) return;
    setAdding(true); setMsg(null);
    try {
      const u = await getUserByEmail(clean);
      if (!u) {
        setMsg({ type: 'error', text: `No account found for ${clean}. Ask them to sign in once first, then add them.` });
      } else if (u.role === ROLES.FDM) {
        setMsg({ type: 'info', text: `${clean} is already a manager.` });
      } else if (u.role === ROLES.ADMIN) {
        setMsg({ type: 'error', text: `${clean} is an admin — leave them as admin.` });
      } else {
        await setUserRole(u.id, ROLES.FDM);
        setMsg({ type: 'success', text: `${clean} is now a manager. Assign them businesses below.` });
        setEmail('');
        await load();
      }
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setAdding(false);
    }
  };

  const openAssign = (fdm) => {
    const init = {};
    stores.forEach((s) => { init[s.id] = (s.fdmUids || []).includes(fdm.id); });
    setChecked(init);
    setAssignFor(fdm);
  };

  const saveAssign = async () => {
    setSaving(true);
    try {
      const uid = assignFor.id;
      await Promise.all(stores.map((s) => {
        const has = (s.fdmUids || []).includes(uid);
        const want = !!checked[s.id];
        if (has === want) return null;
        const next = want
          ? [...(s.fdmUids || []), uid]
          : (s.fdmUids || []).filter((x) => x !== uid);
        return setStoreFdmUids(s.id, next);
      }).filter(Boolean));
      setAssignFor(null);
      await load();
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const removeFdm = async (fdm) => {
    if (!window.confirm(`Remove ${fdm.email} as a manager? They'll be unassigned from all businesses.`)) return;
    // Strip from every store, then demote to customer.
    await Promise.all(
      storesForFdm(fdm.id).map((s) =>
        setStoreFdmUids(s.id, (s.fdmUids || []).filter((x) => x !== fdm.id))
      )
    );
    await setUserRole(fdm.id, ROLES.CUSTOMER);
    await load();
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Deployment Managers</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Managers run assigned businesses end to end — orders, listings and the live storefront.
      </Typography>

      {/* Add a manager */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Add a manager</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
            <TextField
              label="Person's email" size="small" fullWidth value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addFdm()}
              placeholder="they must have signed in at least once"
            />
            <Button
              variant="contained" startIcon={<PersonAddIcon />} onClick={addFdm}
              disabled={adding} sx={{ whiteSpace: 'nowrap' }}
            >
              {adding ? 'Adding…' : 'Add manager'}
            </Button>
          </Stack>
          {msg && <Alert severity={msg.type} sx={{ mt: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}
        </CardContent>
      </Card>

      {/* Current managers */}
      {fdms.length === 0 ? (
        <Typography color="text.secondary">No managers yet. Add one above.</Typography>
      ) : (
        <Stack spacing={2}>
          {fdms.map((fdm) => {
            const assigned = storesForFdm(fdm.id);
            return (
              <Card key={fdm.id} variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                      {(fdm.email || '?').charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontWeight={600} noWrap>{fdm.displayName || fdm.email}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>{fdm.email}</Typography>
                    </Box>
                    <Button size="small" variant="outlined" startIcon={<StorefrontIcon />} onClick={() => openAssign(fdm)}>
                      Assign
                    </Button>
                    <IconButton color="error" onClick={() => removeFdm(fdm)} aria-label="Remove manager">
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Box>
                  <Divider sx={{ mb: 1.5 }} />
                  {assigned.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No businesses assigned.</Typography>
                  ) : (
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                      {assigned.map((s) => (
                        <Chip key={s.id} icon={<StorefrontIcon />} label={s.name} size="small" />
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Assign-stores dialog */}
      <Dialog open={!!assignFor} onClose={() => setAssignFor(null)} fullWidth maxWidth="xs">
        <DialogTitle>Assign businesses to {assignFor?.displayName || assignFor?.email}</DialogTitle>
        <DialogContent>
          {stores.length === 0 ? (
            <Typography color="text.secondary">No businesses exist yet.</Typography>
          ) : (
            <FormGroup>
              {stores.map((s) => (
                <FormControlLabel
                  key={s.id}
                  control={
                    <Checkbox
                      checked={!!checked[s.id]}
                      onChange={(e) => setChecked((c) => ({ ...c, [s.id]: e.target.checked }))}
                    />
                  }
                  label={s.name}
                />
              ))}
            </FormGroup>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignFor(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveAssign} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
