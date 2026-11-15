import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Grid, Card, CardMedia, CardContent, CardActionArea, Typography, Box, TextField,
  MenuItem, CircularProgress, Rating, Checkbox, ListItemText, Alert,
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
import { useAuthStore } from '../../store/useAuthStore';
import { ROLES } from '../../lib/constants';
import { storePath, findStoreByKey } from '../../lib/storeLinks';
import StoreImageSlider from '../../components/StoreImageSlider';
import ProductModal from '../../components/ProductModal';

export default function Browse() {
  const {
    selectedStore, stores, ensureStores, loaded, openSwitcher, switcherOpen, setStore,
  } = useStoreSelection();
  const { profile } = useAuthStore();
  const { storeId } = useParams(); // set on /store/:storeId, absent on '/'
  const navigate = useNavigate();
  const [linkNotFound, setLinkNotFound] = useState(false);
  const linked = storeId ? findStoreByKey(stores, storeId) : null;
  const store = storeId && selectedStore?.id !== linked?.id ? null : selectedStore;
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

  // Two ways in:
  // - /store/:storeId (a store's shareable link, or picked from the picker):
  //   open that store directly, no picker. Internal/testing stores only open
  //   for staff, same as the picker list.
  // - '/' (landing): show the store picker right away -- mandatory when
  //   nothing was chosen before, otherwise dismissible; once a store is set
  //   and the picker is closed, move to that store's URL.
  useEffect(() => {
    if (!loaded || !storeId) return;
    const isStaff = profile?.role === ROLES.ADMIN || profile?.role === ROLES.FDM;
    const found = findStoreByKey(stores, storeId);
    const target = found && (isStaff || !found.internal) ? found : null;
    if (target) {
      setLinkNotFound(false);
      if (target.id !== selectedStore?.id) setStore(target);
    } else {
      setLinkNotFound(true);
      openSwitcher(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, storeId, stores, profile?.role]);

  useEffect(() => {
    if (!loaded || storeId) return;
    if (!promptedRef.current) {
      promptedRef.current = true;
      openSwitcher(!selectedStore);
    } else if (!switcherOpen && selectedStore) {
      navigate(storePath(selectedStore), { replace: true });
    }
  }, [loaded, storeId, selectedStore, switcherOpen, openSwitcher, navigate]);

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
      {linkNotFound && (
        <Alert severity="info" sx={{ mb: 2 }}>
          That store link isn't available. Pick a store to continue.
        </Alert>
      )}
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
