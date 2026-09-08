// Full timestamped history of item edits on an order — who, when, and
// exactly what changed in that one edit. Unlike OrderItemsDiff (which only
// shows the net change between as-placed and current), this shows every
// edit as its own step, so two edits in a row don't collapse into one.
// Visible to the order's own customer as well as admin/FDM (see
// firestore.rules — this is the order's own history, not internal ops data).
import { useEffect, useState } from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { listOrderItemsEditLog } from '../firebase/db';
import { diffOrderItems } from '../lib/orderDiff';
import { DiffRows } from './OrderItemsDiff';
import { formatIST } from '../lib/datetime';

export default function OrderItemsEditLog({ orderId }) {
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    if (!orderId) return;
    setEntries(null);
    listOrderItemsEditLog(orderId).then(setEntries).catch(() => setEntries([]));
  }, [orderId]);

  if (!entries || entries.length === 0) return null;

  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        Edit history
      </Typography>
      {entries.map((e, i) => (
        <Box key={e.id} sx={{ mb: 1 }}>
          {i > 0 && <Divider sx={{ mb: 1 }} />}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
            Edited by {e.changedByName || e.changedByUid} ({e.changedByRole || 'unknown'}) · {formatIST(e.at)}
          </Typography>
          <DiffRows rows={diffOrderItems(e.itemsBefore || [], e.itemsAfter || [])} />
        </Box>
      ))}
    </Box>
  );
}
