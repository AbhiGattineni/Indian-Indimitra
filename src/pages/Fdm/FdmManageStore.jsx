// FDM runs one assigned business end to end: same Orders + Listings tools the
// seller uses, but pointed at the assigned store via storeOverride.
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Tabs, Tab, Button, CircularProgress, Chip, Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { useAuthStore } from '../../store/useAuthStore';
import { useStoreSelection } from '../../store/useStoreSelection';
import { getStore } from '../../firebase/db';
import { ROLES, STORE_STATUS } from '../../lib/constants';
import SellerOrders from '../Seller/SellerOrders';
import SellerListings from '../Seller/SellerListings';

export default function FdmManageStore() {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const setStore = useStoreSelection((s) => s.setStore);
  const [store, setStoreState] = useState(null);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const st = await getStore(storeId);
      const assigned = st?.fdmUids?.includes(user.uid) || profile?.role === ROLES.ADMIN;
      if (!st || !assigned) { setDenied(true); setLoading(false); return; }
      setStoreState(st);
      setLoading(false);
    })();
  }, [user, storeId, profile?.role]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }

  if (denied) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/fdm')} sx={{ mb: 2 }}>
          Back to my businesses
        </Button>
        <Typography color="text.secondary">
          This business isn't assigned to you.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/fdm')} sx={{ mb: 1 }}>
        My businesses
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
        <StorefrontIcon color="primary" />
        <Typography variant="h5" sx={{ flex: 1, minWidth: 0 }} noWrap>{store.name}</Typography>
        <Chip
          size="small"
          label={store.approvalStatus}
          color={store.approvalStatus === STORE_STATUS.APPROVED ? 'success' : 'warning'}
        />
        <Button
          variant="outlined" size="small" startIcon={<OpenInNewIcon />}
          onClick={() => { setStore(store); navigate('/'); }}
        >
          Open storefront
        </Button>
      </Box>
      {store.pickupAddress && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {store.pickupAddress}
        </Typography>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid', borderColor: 'divider', mb: 2 }}>
        <Tab label="Orders" sx={{ textTransform: 'none', fontWeight: 600 }} />
        <Tab label="Listings" sx={{ textTransform: 'none', fontWeight: 600 }} />
      </Tabs>

      {tab === 0 && <SellerOrders storeOverride={store} />}
      {tab === 1 && <SellerListings storeOverride={store} />}
    </Box>
  );
}
