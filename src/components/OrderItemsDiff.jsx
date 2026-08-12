// Renders an order's line items, striking through anything a pre-acceptance
// customer edit changed (removed lines, old qty/weight/instructions) next to
// the current value — so whoever is reviewing the order (customer, seller,
// FDM, admin) can see exactly what changed at a glance.
import { Box, Typography, Chip } from '@mui/material';
import { diffOrderItems } from '../lib/orderDiff';
import { formatINR, formatWeight, lineTotal } from '../lib/calculations';

const strike = { textDecoration: 'line-through', color: 'text.secondary' };

function Was({ children }) {
  return <Box component="span" sx={strike}>{children}</Box>;
}

export default function OrderItemsDiff({ order }) {
  const rows = order.originalItems
    ? diffOrderItems(order.originalItems, order.items || [])
    : (order.items || []).map((it) => ({ lineId: it.lineId, kind: 'unchanged', before: it, after: it }));

  return (
    <Box>
      {rows.map((row) => {
        const it = row.after || row.before;
        return (
          <Box key={row.lineId} sx={{ mb: 0.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
              <Typography variant="body2" sx={row.kind === 'removed' ? strike : undefined}>
                {it.name} (
                {row.kind === 'changed' && row.before.grams !== row.after.grams
                  ? <><Was>{formatWeight(row.before.grams)}</Was> {formatWeight(row.after.grams)}</>
                  : formatWeight(it.grams)}
                ) ×{' '}
                {row.kind === 'changed' && row.before.qty !== row.after.qty
                  ? <><Was>{row.before.qty}</Was> {row.after.qty}</>
                  : it.qty}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
                {row.kind === 'removed' && <Chip size="small" label="Removed" color="error" variant="outlined" />}
                {row.kind === 'added' && <Chip size="small" label="Added" color="success" variant="outlined" />}
                {row.kind === 'changed' && <Chip size="small" label="Edited" color="warning" variant="outlined" />}
                {row.kind !== 'removed' && (
                  <Typography variant="body2">{formatINR(lineTotal(row.after))}</Typography>
                )}
              </Box>
            </Box>
            {row.kind === 'changed' && (row.before.instructions || '') !== (row.after.instructions || '') ? (
              <Typography variant="caption" color="text.secondary" display="block">
                Note: {row.before.instructions && <Was>{row.before.instructions}</Was>}
                {row.before.instructions && row.after.instructions ? ' ' : ''}
                {row.after.instructions}
              </Typography>
            ) : it.instructions && (
              <Typography variant="caption" color="text.secondary" display="block">
                Note: {it.instructions}
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
