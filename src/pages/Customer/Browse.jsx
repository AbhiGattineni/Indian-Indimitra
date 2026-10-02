import { useEffect, useRef, useState } from 'react';
import {
  Grid, Card, CardMedia, CardContent, CardActionArea, Typography, Box, TextField,
  MenuItem, CircularProgress, Rating, Checkbox, ListItemText,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import { listCategoriesByStore, listProductsByStore, listReviewsByStore } from '../../firebase/db';
import { formatINR, customerPrice } from '../../lib/calculations';
import { placeholderImage } from '../../lib/placeholder';
import { productImages } from '../../lib/productImages';
import { PRODUCT_STATUS } from '../../lib/constants';
import { ratingsByProduct } from '../../lib/reviews';
import { useStoreSelection } from '../../store/useStoreSelection';
import StoreImageSlider from '../../components/StoreImageSlider';
import ProductModal from '../../components/ProductModal';

export default function Browse() {
  const { selectedStore, ensureStores, loaded, openSwitcher } = useStoreSelection();
  const store = selectedStore;
  const [products, setProducts] = useState([]);
  const [ratings, setRatings] = useState({});
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  // Selected category ids; empty means all categories.
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const promptedRef = useRef(false);

  useEffect(() => { ensureStores(); }, [ensureStores]);

  // Show the store picker once per visit to this page, so a customer always
  // sees the full list of businesses (not just whichever one they're already
  // in) -- mandatory (no close button) only when nothing is selected yet;
  // otherwise dismissible, since they can just keep shopping their last
  // store. Guarded by a ref so it doesn't reopen every time selectedStore
  // changes (e.g. right after they pick one from it).
  useEffect(() => {
    if (loaded && !promptedRef.current) {
      promptedRef.current = true;
      openSwitcher(!selectedStore);
    }
  }, [loaded, selectedStore, openSwitcher]);

  // Categories are each store's own -- reload whenever the store changes,
  // and drop any category filter that no longer applies to it.
  useEffect(() => {
    setSelectedCategories([]);
    if (!store) { setCategories([]); return; }
    listCategoriesByStore(store.id)
      .then((c) => setCategories(c.filter((x) => x.enabled !== false)))
      .catch(() => setCategories([]));
  }, [store?.id]);

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
    const matchCat = selectedCategories.length === 0 || selectedCategories.includes(p.categoryId);
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
          value={selectedCategories}
          onChange={(e) => {
            // "All categories" is sent as the '' entry: it clears the selection.
            const v = e.target.value;
            setSelectedCategories(v.includes('') ? [] : v);
          }}
          SelectProps={{
            multiple: true,
            displayEmpty: true,
            renderValue: (ids) => {
              if (ids.length === 0) return 'All categories';
              if (ids.length === 1) return categories.find((c) => c.id === ids[0])?.name || '1 category';
              return `${ids.length} categories`;
            },
            MenuProps: { PaperProps: { sx: { maxHeight: 360 } } },
          }}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="" divider>
            <Checkbox size="small" checked={selectedCategories.length === 0} />
            <ListItemText primary="All categories" />
          </MenuItem>
          {categories.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              <Checkbox size="small" checked={selectedCategories.includes(c.id)} />
              <ListItemText primary={c.name} />
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
                  <Box sx={{ position: 'relative' }}>
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
                    {productImages(p).length > 1 && (
                      <Box
                        sx={{
                          position: 'absolute', bottom: 6, right: 6, display: 'flex', alignItems: 'center', gap: 0.5,
                          px: 0.75, py: 0.25, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff',
                        }}
                      >
                        <PhotoLibraryIcon sx={{ fontSize: 14 }} />
                        <Typography variant="caption" sx={{ lineHeight: 1 }}>{productImages(p).length}</Typography>
                      </Box>
                    )}
                  </Box>
                  <CardContent>
                    <Typography noWrap fontWeight={600}>
                      {p.name}
                    </Typography>
                    <Typography color="primary" fontWeight={700}>
                      {formatINR(customerPrice(p))}
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
                    {p.warning && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <WarningAmberIcon color="error" sx={{ fontSize: 15 }} />
                        <Typography variant="caption" color="error.main" fontWeight={600}>
                          {p.warning}
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
