import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { useAuthStore } from '../../store/useAuthStore';
import { getStoreByOwner, listReviewsByStore, listProductsByStore, listOrdersByStore } from '../../firebase/db';
import { ORDER_STATUS } from '../../lib/constants';
import ReviewsAnalytics from '../../components/ReviewsAnalytics';
import ReviewCoverage from '../../components/ReviewCoverage';

// storeOverride lets an FDM (or admin) view a specific assigned store; sellers
// omit it and their own store is resolved from ownerUid.
export default function SellerReviews({ storeOverride }) {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const store = storeOverride || (await getStoreByOwner(user.uid));
      if (!store) { setData({ store: null }); return; }
      const [reviews, products, orders] = await Promise.all([
        listReviewsByStore(store.id), listProductsByStore(store.id), listOrdersByStore(store.id),
      ]);
      setData({
        store,
        reviews,
        productsById: Object.fromEntries(products.map((p) => [p.id, p])),
        deliveredOrders: orders.filter((o) => o.status === ORDER_STATUS.DELIVERED),
      });
    })();
  }, [user, storeOverride?.id]);

  if (!data) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }

  if (!data.store) {
    return <Alert severity="info">Set up your store first to see reviews.</Alert>;
  }

  return (
    <Box>
      {!storeOverride && <Typography variant="h5" gutterBottom>Reviews</Typography>}
      <ReviewsAnalytics reviews={data.reviews} productsById={data.productsById} />
      <ReviewCoverage orders={data.deliveredOrders} reviews={data.reviews} />
    </Box>
  );
}
