import { useEffect, useState } from 'react';
import {
  Grid, Card, CardMedia, CardContent, CardActionArea, Typography, Box, TextField,
  MenuItem, CircularProgress, Rating,
} from '@mui/material';
import { listCategories, listProductsByStore, listReviewsByStore } from '../../firebase/db';
import { formatINR, customerPricePerKg } from '../../lib/calculations';
import { placeholderImage } from '../../lib/placeholder';
import { PRODUCT_STATUS } from '../../lib/constants';
import { ratingsByProduct } from '../../lib/reviews';
import { useStoreSelection } from '../../store/useStoreSelection';
import StoreImageSlider from '../../components/StoreImageSlider';
import ProductModal from '../../components/ProductModal';

export default function Browse() {
  const { selectedStore, ensureStores, loaded } = useStoreSelection();
  const store = selectedStore;
  const [products, setProducts] = useState([]);
  const [ratings, setRatings] = useState({});
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => { ensureStores(); }, [ensureStores]);

  // Categories are global; loaded once.
  useEffect(() => { listCategories().then(setCategories).catch(() => {}); }, []);

  // Load the selected store's active products (+ ratings, for the small
  // per-card badge) whenever the store changes.
  useEffect(() => {
    if (!loaded) return;
    if (!store) { setProducts([]); setRatings({}); setLoading(false); return; }
    setLoading(true);
    Promise.all([listProductsByStore(store.id), listReviewsByStore(store.id)])
      .then(([p, reviews]) => {
        setProducts(p.filter((x) => x.status === PRODUCT_STATUS.ACTIVE));
        setRatings(ratingsByProduct(reviews));
      })
      .catch((e) => console.error('Failed to load products', e))
      .finally(() => setLoading(false));
  }, [store?.id, loaded]);

  const filtered = products.filter((p) => {
    const matchName = p.name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'all' || p.categoryId === category;
    return matchName && matchCat;
  });

  return (
    <Box>
      {!loading && (
        <StoreImageSlider
          images={store?.images || []}
          storeAddress={store?.pickupAddress}
          storeDescription={store?.description}
        />
      )}

      <Typography variant="h5" gutterBottom>
        Browse products
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          label="Search"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 220 }}
        />
        <TextField
          select
          label="Category"
          size="small"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="all">All categories</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Typography color="text.secondary">No products found.</Typography>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((p) => (
            <Grid item xs={6} sm={4} md={3} key={p.id}>
              <Card>
                <CardActionArea onClick={() => setSelectedProduct(p)}>
                  <CardMedia
                    component="img"
                    image={p.imageUrl || placeholderImage(p.name)}
                    alt={p.name}
                    sx={{
                      width: '100%',
                      aspectRatio: '4 / 3',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                  <CardContent>
                    <Typography noWrap fontWeight={600}>
                      {p.name}
                    </Typography>
                    <Typography color="primary" fontWeight={700}>
                      {formatINR(customerPricePerKg(p.price))}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {p.unit}
                    </Typography>
                    {ratings[p.id] && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                        <Rating value={ratings[p.id].avg} precision={0.1} readOnly size="small" />
                        <Typography variant="caption" color="text.secondary">
                          ({ratings[p.id].count})
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <ProductModal
        open={!!selectedProduct}
        product={selectedProduct}
        storeId={store?.id}
        storeName={store?.name}
        onClose={() => setSelectedProduct(null)}
      />
    </Box>
  );
}
