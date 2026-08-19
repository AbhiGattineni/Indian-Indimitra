import { Chip } from '@mui/material';
import { ORDER_STATUS, orderStatusLabel } from '../lib/constants';

const COLORS = {
  [ORDER_STATUS.PLACED]: 'default',
  [ORDER_STATUS.ACCEPTED]: 'info',
  [ORDER_STATUS.SHIPPED]: 'warning',
  [ORDER_STATUS.IN_TRANSIT]: 'warning',
  [ORDER_STATUS.DELIVERED]: 'success',
  [ORDER_STATUS.CANCELLED]: 'error',
};

export default function OrderStatusChip({ status }) {
  return <Chip size="small" label={orderStatusLabel(status)} color={COLORS[status] || 'default'} />;
}
