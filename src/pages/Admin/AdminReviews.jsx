import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { listAllReviews, listAllProducts, listStores } from '../../firebase/db';
import ReviewsAnalytics from '../../components/ReviewsAnalytics';

export default function AdminReviews() {
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const [reviews, products, stores] = await Promise.all([
        listAllReviews(), listAllProducts(), listStores(),
      ]);
      setData({
        reviews,
        productsById: Object.fromEntries(products.map((p) => [p.id, p])),
        storesById: Object.fromEntries(stores.map((s) => [s.id, s])),
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
    </Box>
  );
}
