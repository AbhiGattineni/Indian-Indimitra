// Floating "chat with support" button on customer pages: opens WhatsApp
// (app on phones, WhatsApp Web on desktop) to the support number, with a
// message pre-filled with the store and page the customer was on.
import { Box, Tooltip } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useLocation } from 'react-router-dom';
import { SUPPORT_WHATSAPP } from '../lib/constants';
import { useStoreSelection } from '../store/useStoreSelection';

export default function WhatsAppSupportButton() {
  const location = useLocation();
  const storeName = useStoreSelection((s) => s.selectedStore?.name);
  const text = [
    'Hi, I need help.',
    storeName && `Store: ${storeName}`,
    `Page: ${window.location.origin}${location.pathname}`,
  ].filter(Boolean).join('\n');
  const href = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}`;

  return (
    <Tooltip title="Chat with support on WhatsApp" placement="left">
      <Box
        component="a"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with support on WhatsApp"
        sx={{
          position: 'fixed',
          right: { xs: 16, sm: 24 },
          bottom: { xs: 'calc(16px + env(safe-area-inset-bottom))', sm: 24 },
          zIndex: (t) => t.zIndex.speedDial,
          width: 56, height: 56, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: (t) => t.palette.custom?.whatsapp?.main || '#25D366',
          color: '#fff',
          boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
          transition: 'transform .15s, box-shadow .15s',
          '&:hover': { transform: 'scale(1.06)', boxShadow: '0 8px 20px rgba(0,0,0,0.3)' },
        }}
      >
        <WhatsAppIcon sx={{ fontSize: 32 }} />
      </Box>
    </Tooltip>
  );
}
