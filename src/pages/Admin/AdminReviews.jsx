import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Tabs, Tab } from '@mui/material';
import {
  listAllReviews, listAllProducts, listStores, listAllOrders, listAllOrderFeedback,
} from '../../firebase/db';
import { ORDER_STATUS } from '../../lib/constants';
import ReviewsAnalytics from '../../components/ReviewsAnalytics';
import ReviewCoverage from '../../components/ReviewCoverage';
import OrderFeedbackAnalytics from '../../components/OrderFeedbackAnalytics';

export default function AdminReviews() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    (async () => {
      const [reviews, products, stores, orders, orderFeedback] = await Promise.all([
        listAllReviews(), listAllProducts(), listStores(), listAllOrders(), listAllOrderFeedback(),
      ]);
      setData({
        reviews,
        orderFeedback,
        productsById: Object.fromEntries(products.map((p) => [p.id, p])),
        storesById: Object.fromEntries(stores.map((s) => [s.id, s])),
        ordersById: Object.fromEntries(orders.map((o) => [o.id, o])),
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
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tab label="Itemized Reviews" sx={{ textTransform: 'none', fontWeight: 600 }} />
        <Tab label="Overall Order Reviews" sx={{ textTransform: 'none', fontWeight: 600 }} />
      </Tabs>

      {tab === 0 && (
        <>
          <ReviewsAnalytics reviews={data.reviews} productsById={data.productsById} storesById={data.storesById} />
          <ReviewCoverage orders={data.deliveredOrders} reviews={data.reviews} storesById={data.storesById} />
        </>
      )}
      {tab === 1 && (
        <OrderFeedbackAnalytics
          feedback={data.orderFeedback} ordersById={data.ordersById} storesById={data.storesById}
        />
      )}
    </Box>
  );
}
