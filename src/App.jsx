import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import ProtectedRoute from './routes/ProtectedRoute';
import Layout from './components/Layout';
import AdminShell from './components/AdminShell';
import { ROLES } from './lib/constants';

// Public / auth
import SignIn from './pages/Auth/SignIn';
import NotAuthorized from './pages/Auth/NotAuthorized';
// Customer
import Browse from './pages/Customer/Browse';
import ProductPage from './pages/Customer/ProductPage';
import Cart from './pages/Customer/Cart';
import Checkout from './pages/Customer/Checkout';
import MyOrders from './pages/Customer/MyOrders';
import BecomeSeller from './pages/Customer/BecomeSeller';
// Seller
import SellerDashboard from './pages/Seller/SellerDashboard';
import SellerListings from './pages/Seller/SellerListings';
import SellerOrders from './pages/Seller/SellerOrders';
// Admin
import AdminDashboard from './pages/Admin/AdminDashboard';
import SellerApprovals from './pages/Admin/SellerApprovals';
import AdminOrders from './pages/Admin/AdminOrders';
import Categories from './pages/Admin/Categories';
import Users from './pages/Admin/Users';
import PlatformConfig from './pages/Admin/PlatformConfig';
import ShippingRates from './pages/Admin/ShippingRates';
import Catalog from './pages/Admin/Catalog';

export default function App() {
  const initAuthListener = useAuthStore((s) => s.initAuthListener);

  useEffect(() => {
    const unsub = initAuthListener();
    return () => unsub && unsub();
  }, [initAuthListener]);

  return (
    <Layout>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Browse />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/not-authorized" element={<NotAuthorized />} />
        <Route path="/cart" element={<Cart />} />

        {/* Customer (any signed-in user) */}
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <MyOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/become-seller"
          element={
            <ProtectedRoute>
              <BecomeSeller />
            </ProtectedRoute>
          }
        />

        {/* Seller */}
        <Route
          path="/seller"
          element={
            <ProtectedRoute allow={ROLES.SELLER}>
              <SellerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seller/listings"
          element={
            <ProtectedRoute allow={ROLES.SELLER}>
              <SellerListings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seller/orders"
          element={
            <ProtectedRoute allow={ROLES.SELLER}>
              <SellerOrders />
            </ProtectedRoute>
          }
        />

        {/* Admin — persistent sidebar shell wraps every admin page */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allow={ROLES.ADMIN}>
              <AdminShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="approvals" element={<SellerApprovals />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="categories" element={<Categories />} />
          <Route path="catalog" element={<Catalog />} />
          <Route path="users" element={<Users />} />
          <Route path="config" element={<PlatformConfig />} />
          <Route path="shipping-rates" element={<ShippingRates />} />
        </Route>
      </Routes>
    </Layout>
  );
}
