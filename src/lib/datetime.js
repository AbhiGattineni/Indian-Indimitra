// Shared timestamp formatting. All order/shipment/status timings are shown
// in IST (India Standard Time) with an explicit label, rather than each
// viewer's device-local time zone — this app and its stores/customers are
// India-based, and status logs/tracking need one unambiguous shared clock
// regardless of who's viewing them or from where.
export function formatIST(value) {
  const d = value?.toDate ? value.toDate() : new Date(value);
  if (!d || Number.isNaN(d.getTime())) return '—';
  const formatted = d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${formatted} IST`;
}
