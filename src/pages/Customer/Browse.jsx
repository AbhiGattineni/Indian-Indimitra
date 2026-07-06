import { useEffect, useState } from 'react';
import {
  Grid, Card, CardMedia, CardContent, CardActionArea, Typography, Box, TextField,
  MenuItem, CircularProgress,
} from '@mui/material';
import { listActiveProducts, listCategories, listStores } from '../../firebase/db';
import { formatINR } from '../../lib/calculations';
import { placeholderImage } from '../../lib/placeholder';
import { STORE_STATUS } from '../../lib/constants';
import StoreImageSlider from '../../components/StoreImageSlider';
import ProductModal from '../../components/ProductModal';

export default function Browse() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [store, setStore] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, c, stores] = await Promise.all([
          listActiveProducts(), listCategories(), listStores(STORE_STATUS.APPROVED),
        ]);
        setProducts(p);
        setCategories(c);
        setStore(stores[0] || null);
      } catch (e) {
        console.error('Failed to load catalog', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
                    height="150"
                    image={p.imageUrl || placeholderImage(p.name)}
                    alt={p.name}
                  />
                  <CardContent>
                    <Typography noWrap fontWeight={600}>
                      {p.name}
                    </Typography>
                    <Typography color="primary" fontWeight={700}>
                      {formatINR(p.price)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {p.unit}
                    </Typography>
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
