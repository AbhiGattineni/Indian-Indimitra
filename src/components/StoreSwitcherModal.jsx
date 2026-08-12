// Modal to pick which business to shop. Lists all available (approved) stores;
// selecting one loads its storefront and closes.
import {
  Dialog, DialogTitle, DialogContent, Box, Typography, IconButton, Stack, Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router-dom';
import { useStoreSelection } from '../store/useStoreSelection';

export default function StoreSwitcherModal({ open, onClose }) {
  const { stores, selectedStore, setStore } = useStoreSelection();
  const navigate = useNavigate();

  const choose = (store) => {
    setStore(store);
    onClose();
    navigate('/');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 0.5 }}>
        Choose a business
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Pick a store to browse and order from.
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {stores.length === 0 ? (
          <Typography color="text.secondary">No businesses available yet.</Typography>
        ) : (
          <Stack spacing={1.25}>
            {stores.map((s) => {
              const active = s.id === selectedStore?.id;
              return (
                <Box
                  key={s.id}
                  role="button"
                  onClick={() => choose(s)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, p: 1.75,
                    border: '1.5px solid',
                    borderColor: active ? 'primary.main' : 'divider',
                    bgcolor: active ? (t) => t.palette.custom.primarySoft : 'background.paper',
                    borderRadius: 2, cursor: 'pointer',
                    transition: 'border-color .12s, background-color .12s',
                    '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' },
                  }}
                >
                  <Box sx={{
                    width: 40, height: 40, borderRadius: 1.5, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: active ? 'primary.main' : 'grey.100',
                    color: active ? 'primary.contrastText' : 'text.secondary',
                  }}>
                    <StorefrontIcon fontSize="small" />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={600} noWrap>{s.name}</Typography>
                    {s.pickupAddress && (
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {s.pickupAddress}
                      </Typography>
                    )}
                  </Box>
                  {active
                    ? <CheckCircleIcon color="primary" fontSize="small" />
                    : <Chip label="Shop" size="small" variant="outlined" />}
                </Box>
              );
            })}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
