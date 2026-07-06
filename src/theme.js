import { createTheme, alpha } from '@mui/material/styles';

// ============================================================================
// Design tokens ported 1:1 from the Indimitra app so this marketplace shares
// its exact look. Coral primary + teal secondary, orange brand gradient.
// ============================================================================

const CORAL = { main: '#FF6B6B', light: '#FF8E8E', dark: '#FF4848', contrastText: '#FFFFFF' };
const TEAL = { main: '#4ECDC4', light: '#71D7D0', dark: '#2BC4B8', contrastText: '#FFFFFF' };

const ERROR = { main: '#E53935', light: '#EF5350', dark: '#C62828', contrastText: '#FFFFFF' };
const WARNING = { main: '#F9A825', light: '#FFCA28', dark: '#F57F17', contrastText: '#FFFFFF' };
const SUCCESS = { main: '#25D366', light: '#4CE38A', dark: '#128C7E', contrastText: '#FFFFFF' };
const INFO = { main: '#1976D2', light: '#42A5F5', dark: '#1565C0', contrastText: '#FFFFFF' };

const GREY = {
  50: '#FAFAFA', 100: '#F5F5F5', 200: '#EEEEEE', 300: '#E0E0E0', 400: '#BDBDBD',
  500: '#9E9E9E', 600: '#757575', 700: '#616161', 800: '#424242', 900: '#212121',
};

const TEXT = { primary: '#212121', secondary: '#616161', disabled: '#9E9E9E' };
const BACKGROUND = { default: '#F7F7F7', paper: '#FFFFFF', subtle: '#FAFAFA' };

const CUSTOM = {
  gradientPrimary: 'linear-gradient(108.73deg, #F9881F 23.73%, #FF774C 79.34%)',
  gradientCoral: `linear-gradient(45deg, ${CORAL.main} 30%, #FF8E53 90%)`,
  gradientCoralHover: `linear-gradient(45deg, #FF8E53 30%, ${CORAL.main} 90%)`,
  primarySoft: alpha(CORAL.main, 0.08),
  primarySoftHover: alpha(CORAL.main, 0.12),
  primarySoftActive: alpha(CORAL.main, 0.16),
  primaryGlow: `0 4px 14px ${alpha(CORAL.main, 0.4)}`,
  primaryGlowHover: `0 6px 20px ${alpha(CORAL.main, 0.5)}`,
  whatsapp: { main: '#25D366', dark: '#128C7E', contrastText: '#FFFFFF' },
  menuHover: 'rgba(145, 127, 179, 0.1)',
};

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: CORAL,
    secondary: TEAL,
    error: ERROR,
    warning: WARNING,
    success: SUCCESS,
    info: INFO,
    grey: GREY,
    text: TEXT,
    background: BACKGROUND,
    divider: GREY[300],
    custom: CUSTOM,
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 500 },
    h6: { fontWeight: 500 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, textTransform: 'none', fontWeight: 500 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 12, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
      },
    },
  },
});

export default theme;
