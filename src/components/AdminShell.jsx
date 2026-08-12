// Indimitra-style admin shell: persistent left sidebar with icon nav and a
// coral-gradient active state, on every screen size.
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CategoryIcon from '@mui/icons-material/Category';
import PeopleIcon from '@mui/icons-material/People';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import SettingsIcon from '@mui/icons-material/Settings';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import Inventory2Icon from '@mui/icons-material/Inventory2';

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/admin', icon: DashboardIcon, exact: true },
  { label: 'Seller Approvals', to: '/admin/approvals', icon: HowToRegIcon },
  { label: 'All Orders', to: '/admin/orders', icon: ReceiptLongIcon },
  { label: 'Categories', to: '/admin/categories', icon: CategoryIcon },
  { label: 'Stores & Products', to: '/admin/catalog', icon: Inventory2Icon },
  { label: 'Users & Roles', to: '/admin/users', icon: PeopleIcon },
  { label: 'Managers', to: '/admin/managers', icon: BusinessCenterIcon },
  { label: 'Platform Config', to: '/admin/config', icon: SettingsIcon },
  { label: 'Shipping Rates', to: '/admin/shipping-rates', icon: LocalShippingIcon },
];

function isActive(pathname, item) {
  return item.exact ? pathname === item.to : pathname.startsWith(item.to);
}

export default function AdminShell() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Box sx={{
      display: 'flex', mx: { xs: -2, sm: -3 },
      minHeight: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' },
    }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            position: 'sticky',
            top: { xs: 56, sm: 64 },
            height: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' },
            border: 'none',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <Toolbar variant="dense" sx={{ minHeight: '16px !important' }} />
        <List sx={{ px: 1.5, py: 2 }}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(location.pathname, item);
            return (
              <ListItemButton
                key={item.to}
                onClick={() => navigate(item.to)}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  minHeight: 44,
                  color: active ? 'primary.contrastText' : 'text.primary',
                  background: active ? (t) => t.palette.custom.gradientCoral : 'transparent',
                  '&:hover': {
                    background: active ? (t) => t.palette.custom.gradientCoralHover : 'action.hover',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: active ? 'inherit' : 'text.secondary' }}>
                  <item.icon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontWeight: active ? 700 : 500, fontSize: '0.9rem' }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Drawer>

      <Box sx={{ flex: 1, minWidth: 0, px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
        <Outlet />
      </Box>
    </Box>
  );
}
