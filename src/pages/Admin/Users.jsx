import { useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Select, MenuItem,
  CircularProgress,
} from '@mui/material';
import { listUsers, setUserRole } from '../../firebase/db';
import { ROLES } from '../../lib/constants';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => { setUsers(await listUsers()); setLoading(false); };
  useEffect(() => { load(); }, []);

  const changeRole = async (uid, role) => { await setUserRole(uid, role); load(); };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Users & roles</Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Email</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Role</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.displayName}</TableCell>
              <TableCell>
                <Select size="small" value={u.role}
                  onChange={(e) => changeRole(u.id, e.target.value)}>
                  {Object.values(ROLES).map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
