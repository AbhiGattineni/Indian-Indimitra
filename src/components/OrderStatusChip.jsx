import { Chip } from '@mui/material';
import { ORDER_STATUS } from '../lib/constants';

const COLORS = {
  [ORDER_STATUS.PLACED]: 'default',
  [ORDER_STATUS.ACCEPTED]: 'info',
  [ORDER_STATUS.SHIPPED]: 'warning',
  [ORDER_STATUS.DELIVERED]: 'success',
  [ORDER_STATUS.CANCELLED]: 'error',
};

export default function OrderStatusChip({ status }) {
  return <Chip size="small" label={status} color={COLORS[status] || 'default'} />;
}
