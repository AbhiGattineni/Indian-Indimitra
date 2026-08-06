// Indimitra-style admin shell: persistent left sidebar with icon nav and a
// coral-gradient active state on desktop; a horizontal scrollable tab strip
// on narrow screens instead of squeezing a drawer into a phone width.
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar,
  useMediaQuery, Tabs, Tab,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CategoryIcon from '@mui/icons-material/Category';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/admin', icon: DashboardIcon, exact: true },
  { label: 'Seller Approvals', to: '/admin/approvals', icon: HowToRegIcon },
  { label: 'All Orders', to: '/admin/orders', icon: ReceiptLongIcon },
  { label: 'Categories', to: '/admin/categories', icon: CategoryIcon },
  { label: 'Users & Roles', to: '/admin/users', icon: PeopleIcon },
  { label: 'Platform Config', to: '/admin/config', icon: SettingsIcon },
  { label: 'Shipping Rates', to: '/admin/shipping-rates', icon: LocalShippingIcon },
];

function isActive(pathname, item) {
  return item.exact ? pathname === item.to : pathname.startsWith(item.to);
}

export default function AdminShell() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const location = useLocation();
  const navigate = useNavigate();

  const activeIndex = Math.max(
    0,
    NAV_ITEMS.findIndex((item) => isActive(location.pathname, item))
  );

  if (!isDesktop) {
    return (
      <Box>
        <Tabs
          value={activeIndex}
          onChange={(_, i) => navigate(NAV_ITEMS[i].to)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            mb: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 44 },
          }}
        >
          {NAV_ITEMS.map((item) => (
            <Tab key={item.to} icon={<item.icon fontSize="small" />} iconPosition="start" label={item.label} />
          ))}
        </Tabs>
        <Outlet />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', mx: -3, minHeight: 'calc(100vh - 64px)' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            position: 'sticky',
            top: 64,
            height: 'calc(100vh - 64px)',
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

      <Box sx={{ flex: 1, minWidth: 0, px: 3, py: 3 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
