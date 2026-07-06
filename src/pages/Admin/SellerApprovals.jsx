import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Chip, Stack, TextField, CircularProgress,
} from '@mui/material';
import { listStores, updateStore, setUserRole } from '../../firebase/db';
import { STORE_STATUS, ROLES } from '../../lib/constants';

export default function SellerApprovals() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reasons, setReasons] = useState({});

  const load = async () => {
    setLoading(true);
    setStores(await listStores());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const approve = async (s) => {
    await updateStore(s.id, { approvalStatus: STORE_STATUS.APPROVED, rejectionReason: '' });
    // Promote the owner to seller. Admin-only per security rules.
    await setUserRole(s.ownerUid, ROLES.SELLER);
    load();
  };

  const reject = async (s) => {
    await updateStore(s.id, {
      approvalStatus: STORE_STATUS.REJECTED,
      rejectionReason: reasons[s.id] || 'Not approved',
    });
    load();
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }

  const pending = stores.filter((s) => s.approvalStatus === STORE_STATUS.PENDING);
  const others = stores.filter((s) => s.approvalStatus !== STORE_STATUS.PENDING);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Seller approvals</Typography>

      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Pending ({pending.length})</Typography>
      {pending.length === 0 && <Typography color="text.secondary">Nothing pending.</Typography>}
      <Stack spacing={2}>
        {pending.map((s) => (
          <Card key={s.id}>
            <CardContent>
              <Typography variant="h6">{s.name}</Typography>
              <Typography variant="body2" color="text.secondary">{s.description}</Typography>
              <Typography variant="body2">Pickup: {s.pickupAddress}</Typography>
              <Typography variant="body2">
                KYC — PAN: {s.kyc?.pan || '—'} · Payout: {s.kyc?.payoutMethod} {s.kyc?.payoutDetails}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 2, alignItems: 'center' }}>
                <Button variant="contained" onClick={() => approve(s)}>Approve</Button>
                <TextField size="small" placeholder="Rejection reason"
                  value={reasons[s.id] || ''}
                  onChange={(e) => setReasons({ ...reasons, [s.id]: e.target.value })} />
                <Button color="error" onClick={() => reject(s)}>Reject</Button>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Typography variant="subtitle1" sx={{ mt: 4, mb: 1 }}>Reviewed</Typography>
      <Stack spacing={1}>
        {others.map((s) => (
          <Card key={s.id} variant="outlined">
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
              <Typography sx={{ flexGrow: 1 }}>{s.name}</Typography>
              <Chip size="small" label={s.approvalStatus}
                color={s.approvalStatus === STORE_STATUS.APPROVED ? 'success' : 'error'} />
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}
