import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { useAuthStore } from '../../store/useAuthStore';
import { getStoreByOwner, listReviewsByStore, listProductsByStore } from '../../firebase/db';
import ReviewsAnalytics from '../../components/ReviewsAnalytics';

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
      const [reviews, products] = await Promise.all([
        listReviewsByStore(store.id), listProductsByStore(store.id),
      ]);
      setData({
        store,
        reviews,
        productsById: Object.fromEntries(products.map((p) => [p.id, p])),
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
    </Box>
  );
}
