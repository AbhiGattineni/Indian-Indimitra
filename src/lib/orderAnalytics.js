// Pure functions that turn a list of order docs into the numbers shown on
// the Admin/FDM analytics dashboards -- financial summary, status counts,
// per-stage timing, and a day-by-day revenue series. Kept storage-agnostic
// (plain objects in, plain objects out) so it's easy to unit-test and reuse
// between the Admin (all orders) and FDM (their assigned stores) views.
import { ORDER_STATUS } from './constants';

function toMs(ts) {
  if (!ts) return null;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function durationHours(fromTs, toTs) {
  const a = toMs(fromTs);
  const b = toMs(toTs);
  if (a == null || b == null || b < a) return null;
  return (b - a) / 3600000;
}

// Human-readable duration: minutes under an hour, hours under 2 days, else days.
export function formatDuration(hours) {
  if (hours == null) return '—';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export function filterOrdersByDateRange(orders, from, to) {
  const fromMs = from ? new Date(`${from}T00:00:00`).getTime() : null;
  const toMs_ = to ? new Date(`${to}T23:59:59.999`).getTime() : null;
  if (fromMs == null && toMs_ == null) return orders;
  return orders.filter((o) => {
    const created = toMs(o.createdAt);
    if (created == null) return true;
    if (fromMs != null && created < fromMs) return false;
    if (toMs_ != null && created > toMs_) return false;
    return true;
  });
}

// Revenue/margin/commission/payout are meaningless for a cancelled order (no
// money actually changed hands), so they're excluded from the money totals
// but still counted in orderCount/cancelledCount for context.
export function computeFinancialSummary(orders) {
  const live = orders.filter((o) => o.status !== ORDER_STATUS.CANCELLED);
  const sum = (key) => live.reduce((s, o) => s + (Number(o[key]) || 0), 0);
  const totalRevenue = sum('total');
  const shippingRevenue = sum('shippingFee');
  const marginTotal = sum('marginAmount');
  const commissionTotal = sum('commissionAmount');
  const sellerPayout = sum('sellerNetAmount');
  const taxTotal = sum('taxAmount');
  // marginAmount = the flat ₹200/kg markup baked into every item's customer
  // price at checkout (calculations.js MARGIN_PER_KG), scaled by that item's
  // own weight -- ₹50 at 250g, ₹100 at 500g, ₹200 at 1kg. commissionAmount is
  // the separate seller-side % cut, currently 0 unless platformConfig sets a
  // commission rate. Shipping is charged at cost and deliberately excluded --
  // packaging/shipping weight contributes no profit.
  const profit = marginTotal + commissionTotal;
  const orderCount = live.length;
  return {
    totalRevenue,
    shippingRevenue,
    marginTotal,
    commissionTotal,
    sellerPayout,
    taxTotal,
    profit,
    orderCount,
    avgOrderValue: orderCount ? totalRevenue / orderCount : 0,
    totalOrders: orders.length,
    cancelledCount: orders.length - live.length,
  };
}

export function computeStatusCounts(orders) {
  const counts = {};
  Object.values(ORDER_STATUS).forEach((s) => { counts[s] = 0; });
  orders.forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1; });
  return counts;
}

// Each stage's `from`/`to` are the order-doc fields stamped by
// updateOrderStatus() (see firebase/db.js). Orders placed before that field
// existed simply have no value there and are skipped for that stage --
// they still count everywhere else.
export const ORDER_STAGES = [
  { key: 'toAccepted', label: 'Placed → Accepted', from: 'createdAt', to: 'acceptedAt' },
  { key: 'toShipped', label: 'Accepted → Shipped', from: 'acceptedAt', to: 'shippedAt' },
  { key: 'toInTransit', label: 'Shipped → In transit', from: 'shippedAt', to: 'inTransitAt' },
  { key: 'toDelivered', label: 'In transit → Delivered', from: 'inTransitAt', to: 'deliveredAt' },
  { key: 'total', label: 'Placed → Delivered', from: 'createdAt', to: 'deliveredAt' },
];

export function computeStageDurations(orders) {
  return ORDER_STAGES.map((stage) => {
    const samples = orders
      .map((o) => durationHours(o[stage.from], o[stage.to]))
      .filter((h) => h != null);
    const avgHours = samples.length
      ? samples.reduce((s, h) => s + h, 0) / samples.length
      : null;
    return { ...stage, avgHours, sampleSize: samples.length };
  });
}

// Which duration cell an order is *currently* sitting in and still waiting
// on, keyed by its live status -- e.g. an "accepted" order hasn't shipped
// yet, so it's still accumulating time in the Accepted→Shipped cell.
// Delivered/cancelled orders are terminal -- nothing is still "waiting".
const CURRENT_STAGE_BY_STATUS = {
  [ORDER_STATUS.PLACED]: 'toAccepted',
  [ORDER_STATUS.ACCEPTED]: 'toShipped',
  [ORDER_STATUS.SHIPPED]: 'toInTransit',
  [ORDER_STATUS.IN_TRANSIT]: 'toDelivered',
};

// A duration cell for a completed transition is {hours, current: false}. A
// stage the order hasn't reached yet, but is presently sitting in, is
// {hours: <elapsed so far, ticking>, current: true} instead of null -- the
// UI marks these with a "still waiting" indicator rather than showing a
// dash for an in-progress order.
function stageCell(fromTs, toTs, isLive) {
  const done = durationHours(fromTs, toTs);
  if (done != null) return { hours: done, current: false };
  if (isLive && fromTs) {
    const elapsed = durationHours(fromTs, Date.now());
    if (elapsed != null) return { hours: elapsed, current: true };
  }
  return { hours: null, current: false };
}

// Per-order breakdown, newest first, for the drill-down table.
export function computeOrderTimings(orders) {
  return orders
    .map((o) => {
      const currentStage = CURRENT_STAGE_BY_STATUS[o.status];
      const stillOpen = o.status !== ORDER_STATUS.DELIVERED && o.status !== ORDER_STATUS.CANCELLED;
      return {
        id: o.id,
        storeName: o.storeName,
        status: o.status,
        createdAt: o.createdAt,
        toAccepted: stageCell(o.createdAt, o.acceptedAt, currentStage === 'toAccepted'),
        toShipped: stageCell(o.acceptedAt, o.shippedAt, currentStage === 'toShipped'),
        toInTransit: stageCell(o.shippedAt, o.inTransitAt, currentStage === 'toInTransit'),
        toDelivered: stageCell(o.inTransitAt, o.deliveredAt, currentStage === 'toDelivered'),
        // Placed→Delivered as a whole: once delivered, the final duration;
        // otherwise (still open) the running total since the order was placed.
        total: stageCell(o.createdAt, o.deliveredAt, stillOpen),
      };
    })
    .sort((a, b) => (toMs(b.createdAt) || 0) - (toMs(a.createdAt) || 0));
}

// Day-by-day revenue/profit/order-count series for the trend chart.
export function groupRevenueByDay(orders) {
  const map = new Map();
  orders
    .filter((o) => o.status !== ORDER_STATUS.CANCELLED)
    .forEach((o) => {
      const ms = toMs(o.createdAt);
      if (ms == null) return;
      const day = new Date(ms).toISOString().slice(0, 10);
      const entry = map.get(day) || { day, revenue: 0, profit: 0, orders: 0 };
      entry.revenue += Number(o.total) || 0;
      entry.profit += (Number(o.marginAmount) || 0) + (Number(o.commissionAmount) || 0);
      entry.orders += 1;
      map.set(day, entry);
    });
  return [...map.values()].sort((a, b) => a.day.localeCompare(b.day));
}
