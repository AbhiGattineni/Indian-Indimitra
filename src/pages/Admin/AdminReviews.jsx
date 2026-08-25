import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { listAllReviews, listAllProducts, listStores, listAllOrders } from '../../firebase/db';
import { ORDER_STATUS } from '../../lib/constants';
import ReviewsAnalytics from '../../components/ReviewsAnalytics';
import ReviewCoverage from '../../components/ReviewCoverage';

export default function AdminReviews() {
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const [reviews, products, stores, orders] = await Promise.all([
        listAllReviews(), listAllProducts(), listStores(), listAllOrders(),
      ]);
      setData({
        reviews,
        productsById: Object.fromEntries(products.map((p) => [p.id, p])),
        storesById: Object.fromEntries(stores.map((s) => [s.id, s])),
        deliveredOrders: orders.filter((o) => o.status === ORDER_STATUS.DELIVERED),
      });
    })();
  }, []);

  if (!data) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Reviews</Typography>
      <ReviewsAnalytics reviews={data.reviews} productsById={data.productsById} storesById={data.storesById} />
      <ReviewCoverage orders={data.deliveredOrders} reviews={data.reviews} storesById={data.storesById} />
    </Box>
  );
}
