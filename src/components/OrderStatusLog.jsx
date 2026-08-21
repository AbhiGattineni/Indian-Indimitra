// Compact "who changed this order's status, and when" audit trail.
// Admin/FDM-only visibility — only rendered from admin/FDM contexts, and
// independently gated by firestore.rules (orders/{id}/statusLog).
import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { listOrderStatusLog } from '../firebase/db';
import { orderStatusLabel } from '../lib/constants';
import { formatIST } from '../lib/datetime';

export default function OrderStatusLog({ orderId }) {
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    if (!orderId) return;
    setEntries(null);
    listOrderStatusLog(orderId).then(setEntries).catch(() => setEntries([]));
  }, [orderId]);

  if (!entries || entries.length === 0) return null;

  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        Status history
      </Typography>
      {entries.map((e) => (
        <Typography key={e.id} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {orderStatusLabel(e.status)} by {e.changedByName || e.changedByUid} ({e.changedByRole || 'unknown'}) · {formatIST(e.at)}
        </Typography>
      ))}
    </Box>
  );
}
