// Single-line rendering of a shippingAddress object, shared by every place
// an order's delivery address is displayed (My Orders, Seller/FDM orders,
// Admin order detail, invoice).
export function formatAddressLine(addr) {
  if (!addr) return '';
  const parts = [addr.apartmentName, addr.line, addr.city].filter(Boolean);
  return `${parts.join(', ')}${addr.pincode ? ` — ${addr.pincode}` : ''}`;
}
