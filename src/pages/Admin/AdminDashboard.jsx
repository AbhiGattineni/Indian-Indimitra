import { useEffect, useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, CircularProgress } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import StorefrontIcon from '@mui/icons-material/Storefront';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentsIcon from '@mui/icons-material/Payments';
import { listUsers, listStores, listAllOrders } from '../../firebase/db';
import { formatINR } from '../../lib/calculations';
import { STORE_STATUS, ORDER_STATUS } from '../../lib/constants';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      const [users, stores, orders] = await Promise.all([
        listUsers(), listStores(), listAllOrders(),
      ]);
      const gmv = orders
        .filter((o) => o.status === ORDER_STATUS.DELIVERED)
        .reduce((s, o) => s + (o.total || 0), 0);
      setStats({
        users: users.length,
        stores: stores.length,
        pendingStores: stores.filter((s) => s.approvalStatus === STORE_STATUS.PENDING).length,
        orders: orders.length,
        gmv,
      });
    })();
  }, []);

  if (!stats) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mb: 3 }}>
        Admin Dashboard
      </Typography>

      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <StatCard icon={PeopleIcon} color="primary" label="Users" value={stats.users} />
        <StatCard icon={StorefrontIcon} color="secondary" label="Stores" value={stats.stores} />
        <StatCard icon={HowToRegIcon} color="warning" label="Pending Approvals" value={stats.pendingStores} />
        <StatCard icon={ReceiptLongIcon} color="info" label="Orders" value={stats.orders} />
        <StatCard icon={PaymentsIcon} color="success" label="GMV (delivered)" value={formatINR(stats.gmv)} />
      </Grid>
    </Box>
  );
}

function StatCard({ icon: Icon, color, label, value }) {
  return (
    <Grid item xs={12} sm={6} md={4} lg={2.4}>
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <Box
              sx={{
                width: 40, height: 40, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: (t) => `${t.palette[color].main}1F`, // ~12% tint
                color: `${color}.main`,
              }}
            >
              <Icon fontSize="small" />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              {label}
            </Typography>
          </Box>
          <Typography variant="h4" fontWeight={700}>{value}</Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}
