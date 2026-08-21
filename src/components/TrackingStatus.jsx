// Live shipment tracking, visible to everyone viewing the order (customer,
// seller, FDM, admin). Renders nothing until a tracking number exists.
// Refreshing (an authenticated call to the refreshUpsTracking Cloud
// Function, currently mocked — see functions/index.js) is gated to
// admin/FDM via the `canRefresh` prop.
import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Link, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { refreshUpsTracking } from '../firebase/db';
import { formatIST } from '../lib/datetime';

export default function TrackingStatus({ order, canRefresh, onChanged }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const shipment = order?.shipment || {};

  if (!shipment.trackingNumber) return null;

  const tracking = shipment.upsTracking;

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      await refreshUpsTracking(order.id);
      onChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="body2">
        {shipment.courierName || 'Carrier'} · Tracking #: {shipment.trackingNumber}
        {shipment.trackingUrl && (
          <> · <Link href={shipment.trackingUrl} target="_blank" rel="noopener">Track</Link></>
        )}
      </Typography>

      {tracking && (
        <Typography variant="body2" sx={{ mt: 0.25 }}>
          Status: <strong>{tracking.statusDescription}</strong>
          {tracking.lastCheckedAt && (
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              (checked {formatIST(tracking.lastCheckedAt)})
            </Typography>
          )}
        </Typography>
      )}
      {tracking?.mocked && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Demo data — connect real UPS API credentials to show live tracking.
        </Typography>
      )}

      {canRefresh && (
        <Button
          size="small"
          startIcon={loading ? <CircularProgress size={14} /> : <RefreshIcon fontSize="small" />}
          onClick={refresh}
          disabled={loading}
          sx={{ mt: 0.5 }}
        >
          Refresh tracking
        </Button>
      )}
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
    </Box>
  );
}
