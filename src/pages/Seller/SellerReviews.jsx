import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Tabs, Tab } from '@mui/material';
import { useAuthStore } from '../../store/useAuthStore';
import {
  getStoreByOwner, listReviewsByStore, listProductsByStore, listOrdersByStore, getOrderFeedback,
} from '../../firebase/db';
import { ORDER_STATUS } from '../../lib/constants';
import ReviewsAnalytics from '../../components/ReviewsAnalytics';
import ReviewCoverage from '../../components/ReviewCoverage';
import OrderFeedbackAnalytics from '../../components/OrderFeedbackAnalytics';

// storeOverride lets an FDM (or admin) view a specific assigned store; sellers
// omit it and their own store is resolved from ownerUid. showOrderFeedback
// adds the "Overall Order Reviews" tab — only FDM/admin can read that
// collection (see firestore.rules), so plain sellers never pass this.
export default function SellerReviews({ storeOverride, showOrderFeedback = false }) {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const store = storeOverride || (await getStoreByOwner(user.uid));
      if (!store) { setData({ store: null }); return; }
      const [reviews, products, orders] = await Promise.all([
        listReviewsByStore(store.id), listProductsByStore(store.id), listOrdersByStore(store.id),
      ]);
      const orderFeedback = showOrderFeedback
        ? (await Promise.all(orders.map((o) => getOrderFeedback(o.id)))).filter(Boolean)
        : [];
      setData({
        store,
        reviews,
        orderFeedback,
        productsById: Object.fromEntries(products.map((p) => [p.id, p])),
        ordersById: Object.fromEntries(orders.map((o) => [o.id, o])),
        deliveredOrders: orders.filter((o) => o.status === ORDER_STATUS.DELIVERED),
      });
    })();
  }, [user, storeOverride?.id, showOrderFeedback]);

  if (!data) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }

  if (!data.store) {
    return <Alert severity="info">Set up your store first to see reviews.</Alert>;
  }

  const itemized = (
    <>
      <ReviewsAnalytics reviews={data.reviews} productsById={data.productsById} />
      <ReviewCoverage orders={data.deliveredOrders} reviews={data.reviews} />
    </>
  );

  return (
    <Box>
      {!storeOverride && <Typography variant="h5" gutterBottom>Reviews</Typography>}
      {showOrderFeedback ? (
        <>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Tab label="Itemized Reviews" sx={{ textTransform: 'none', fontWeight: 600 }} />
            <Tab label="Overall Order Reviews" sx={{ textTransform: 'none', fontWeight: 600 }} />
          </Tabs>
          {tab === 0 && itemized}
          {tab === 1 && <OrderFeedbackAnalytics feedback={data.orderFeedback} ordersById={data.ordersById} />}
        </>
      ) : itemized}
    </Box>
  );
}
