// Single-line rendering of a shippingAddress object, shared by every place
// an order's delivery address is displayed (My Orders, Seller/FDM orders,
// Admin order detail, invoice).
function apartmentPart(addr) {
  if (!addr || addr.notApartment) return '';
  return [addr.apartmentName, addr.apartmentNumber ? `#${addr.apartmentNumber}` : ''].filter(Boolean).join(' ');
}

export function formatAddressLine(addr) {
  if (!addr) return '';
  const parts = [apartmentPart(addr), addr.line, addr.city].filter(Boolean);
  return `${parts.join(', ')}${addr.pincode ? ` — ${addr.pincode}` : ''}`;
}
