import { useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Select, MenuItem, TableContainer,
  CircularProgress, Chip, Stack, Dialog, DialogTitle, DialogContent, DialogActions,
  FormGroup, FormControlLabel, Checkbox, Button, Alert,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import {
  listUsers, setUserRole, listStores, setStoreFdmUids,
} from '../../firebase/db';
import { ROLES } from '../../lib/constants';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  // Store-assignment dialog shown when promoting someone to FDM.
  const [assign, setAssign] = useState(null); // { user, checked: {storeId: bool} }
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [u, s] = await Promise.all([listUsers(), listStores()]);
    setUsers(u);
    setStores(s);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const storesForFdm = (uid) => stores.filter((s) => (s.fdmUids || []).includes(uid));

  // Remove a uid from every store's assigned-FDM list.
  const unassignFromAllStores = async (uid) => {
    await Promise.all(
      storesForFdm(uid).map((s) =>
        setStoreFdmUids(s.id, (s.fdmUids || []).filter((x) => x !== uid))
      )
    );
  };

  const changeRole = async (user, role) => {
    if (role === user.role) return;
    if (role === ROLES.FDM) {
      // A manager is only a manager *for specific stores* — pick them now.
      const checked = {};
      stores.forEach((s) => { checked[s.id] = (s.fdmUids || []).includes(user.id); });
      setAssign({ user, checked });
      return;
    }
    // Moving to any non-FDM role: if they were an FDM, drop their store links.
    if (user.role === ROLES.FDM) await unassignFromAllStores(user.id);
    await setUserRole(user.id, role);
    await load();
  };

  const saveAssignment = async () => {
    const { user, checked } = assign;
    const chosen = stores.filter((s) => checked[s.id]);
    if (chosen.length === 0) {
      // FDM with no stores is pointless — make the admin pick at least one.
      return;
    }
    setSaving(true);
    try {
      await setUserRole(user.id, ROLES.FDM);
      await Promise.all(stores.map((s) => {
        const has = (s.fdmUids || []).includes(user.id);
        const want = !!checked[s.id];
        if (has === want) return null;
        const next = want
          ? [...(s.fdmUids || []), user.id]
          : (s.fdmUids || []).filter((x) => x !== user.id);
        return setStoreFdmUids(s.id, next);
      }).filter(Boolean));
      setAssign(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Users & roles</Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Assigned stores</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => {
              const assigned = u.role === ROLES.FDM ? storesForFdm(u.id) : [];
              return (
                <TableRow key={u.id}>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.displayName}</TableCell>
                  <TableCell>
                    <Select size="small" value={u.role}
                      onChange={(e) => changeRole(u, e.target.value)}>
                      {Object.values(ROLES).map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                    </Select>
                  </TableCell>
                  <TableCell>
                    {u.role === ROLES.FDM ? (
                      assigned.length === 0 ? (
                        <Typography variant="caption" color="warning.main">None — assign stores</Typography>
                      ) : (
                        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                          {assigned.map((s) => (
                            <Chip key={s.id} size="small" icon={<StorefrontIcon />} label={s.name} />
                          ))}
                        </Stack>
                      )
                    ) : (
                      <Typography variant="caption" color="text.secondary">—</Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pick which stores this FDM manages (required to promote to FDM). */}
      <Dialog open={!!assign} onClose={() => { setAssign(null); load(); }} fullWidth maxWidth="xs">
        <DialogTitle>
          Assign stores to {assign?.user?.displayName || assign?.user?.email}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            This manager will only be able to run the stores you select here.
          </Typography>
          {stores.length === 0 ? (
            <Alert severity="warning">No stores exist yet. Create a store first.</Alert>
          ) : (
            <FormGroup>
              {stores.map((s) => (
                <FormControlLabel
                  key={s.id}
                  control={
                    <Checkbox
                      checked={!!assign?.checked[s.id]}
                      onChange={(e) =>
                        setAssign((a) => ({ ...a, checked: { ...a.checked, [s.id]: e.target.checked } }))
                      }
                    />
                  }
                  label={s.name}
                />
              ))}
            </FormGroup>
          )}
          {assign && stores.length > 0 && !Object.values(assign.checked).some(Boolean) && (
            <Alert severity="info" sx={{ mt: 1 }}>Select at least one store.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAssign(null); load(); }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={saveAssignment}
            disabled={saving || stores.length === 0 || !Object.values(assign?.checked || {}).some(Boolean)}
          >
            {saving ? 'Saving…' : 'Make manager'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
