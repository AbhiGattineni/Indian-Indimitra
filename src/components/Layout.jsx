// App shell: sticky, responsive top bar. Inline nav + account menu on
// desktop; brand + cart + hamburger (opening a slide-out drawer) on mobile.
import { useState } from 'react';
import {
  AppBar, Toolbar, Typography, Button, Box, Badge, IconButton, Container,
  Drawer, List, ListItemButton, ListItemIcon, ListItemText, Divider, Menu, MenuItem,
  useMediaQuery, Avatar,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import StorefrontIcon from '@mui/icons-material/Storefront';
import HomeIcon from '@mui/icons-material/Home';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import StoreIcon from '@mui/icons-material/Store';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import { signOut } from '../firebase/auth';
import { ROLES } from '../lib/constants';

export default function Layout({ children }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user, profile } = useAuthStore();
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.qty, 0));
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);

  const handleSignOut = async () => {
    await signOut();
    setDrawerOpen(false);
    setMenuAnchor(null);
    navigate('/');
  };

  const navItems = [
    profile?.role === ROLES.ADMIN && { label: 'Admin', to: '/admin', icon: <AdminPanelSettingsIcon fontSize="small" /> },
    profile?.role === ROLES.SELLER && { label: 'Seller', to: '/seller', icon: <StoreIcon fontSize="small" /> },
    user && { label: 'My Orders', to: '/orders', icon: <ReceiptLongIcon fontSize="small" /> },
  ].filter(Boolean);

  const initial = (profile?.email || user?.email || '?').charAt(0).toUpperCase();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{ bgcolor: 'background.paper', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 1.5, sm: 3 }, gap: 0.5 }}>
          {/* Brand */}
          <Box
            component={Link}
            to="/"
            sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none', color: 'inherit', minWidth: 0 }}
          >
            <Box
              sx={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: 'primary.main', color: 'primary.contrastText',
              }}
            >
              <StorefrontIcon fontSize="small" />
            </Box>
            <Typography
              variant="h6"
              noWrap
              sx={{ fontWeight: 700, fontSize: { xs: '1rem', sm: '1.15rem' }, letterSpacing: -0.2 }}
            >
              Anupama Home Foods
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {/* Desktop inline nav */}
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {navItems.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Button
                    key={item.to}
                    component={Link}
                    to={item.to}
                    startIcon={item.icon}
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      px: 1.5,
                      borderRadius: 2,
                      color: active ? 'primary.main' : 'text.primary',
                      bgcolor: active ? (t) => alpha(t.palette.primary.main, 0.1) : 'transparent',
                      '&:hover': { bgcolor: active ? (t) => alpha(t.palette.primary.main, 0.14) : 'action.hover' },
                    }}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Box>
          )}

          {/* Cart */}
          <IconButton
            component={Link}
            to="/cart"
            sx={{ ml: 0.5, color: 'text.primary', borderRadius: 2, '&:hover': { bgcolor: 'action.hover' } }}
          >
            <Badge
              badgeContent={cartCount}
              color="primary"
              sx={{ '& .MuiBadge-badge': { fontWeight: 700, fontSize: '0.68rem', minWidth: 18, height: 18 } }}
            >
              <ShoppingCartIcon />
            </Badge>
          </IconButton>

          {/* Desktop account / sign in */}
          {!isMobile && (
            user ? (
              <>
                <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ ml: 0.5 }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.9rem', fontWeight: 700 }}>
                    {initial}
                  </Avatar>
                </IconButton>
                <Menu
                  anchorEl={menuAnchor}
                  open={!!menuAnchor}
                  onClose={() => setMenuAnchor(null)}
                  PaperProps={{ sx: { mt: 1, minWidth: 200, borderRadius: 2 } }}
                >
                  <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {profile?.email || user.email}
                    </Typography>
                    {profile?.role && (
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                        {profile.role}
                      </Typography>
                    )}
                  </Box>
                  <Divider />
                  <MenuItem onClick={handleSignOut} sx={{ color: 'error.main' }}>
                    <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} /> Sign out
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                variant="contained"
                component={Link}
                to="/signin"
                sx={{ ml: 1, borderRadius: 2, px: 2.5, fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                Sign in
              </Button>
            )
          )}

          {/* Mobile hamburger */}
          {isMobile && (
            <IconButton onClick={() => setDrawerOpen(true)} sx={{ ml: 0.5, color: 'text.primary' }}>
              <MenuIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: 280 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2.5, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.25)' }}>{user ? initial : <PersonIcon fontSize="small" />}</Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700 }} noWrap>
              {user ? (profile?.email || user.email) : 'Guest'}
            </Typography>
            {profile?.role && (
              <Typography variant="caption" sx={{ opacity: 0.85, textTransform: 'capitalize' }}>
                {profile.role}
              </Typography>
            )}
          </Box>
        </Box>

        <List sx={{ py: 1 }}>
          <ListItemButton component={Link} to="/" onClick={() => setDrawerOpen(false)}>
            <ListItemIcon><HomeIcon /></ListItemIcon>
            <ListItemText primary="Home" />
          </ListItemButton>
          {navItems.map((item) => (
            <ListItemButton key={item.to} component={Link} to={item.to} onClick={() => setDrawerOpen(false)}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
        <Divider />
        <List>
          {user ? (
            <ListItemButton onClick={handleSignOut}>
              <ListItemIcon><LogoutIcon color="error" /></ListItemIcon>
              <ListItemText primary="Sign out" primaryTypographyProps={{ color: 'error.main' }} />
            </ListItemButton>
          ) : (
            <ListItemButton component={Link} to="/signin" onClick={() => setDrawerOpen(false)}>
              <ListItemIcon><PersonIcon /></ListItemIcon>
              <ListItemText primary="Sign in" />
            </ListItemButton>
          )}
        </List>
      </Drawer>

      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
        {children}
      </Container>
    </Box>
  );
}
