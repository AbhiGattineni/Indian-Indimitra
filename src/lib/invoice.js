// Opens a clean, print-formatted invoice for an order in a new tab so an
// admin can "Save as PDF" (or print) it to send to the seller. Built as a
// standalone HTML document (own styles, no app CSS/dependencies) rather than
// printing the live page, so the layout stays predictable regardless of what
// else is on screen.
import { formatINR, formatWeight, cartWeightKg } from './calculations';
import { paymentLabel } from './constants';
import { formatIST as formatTimestamp } from './datetime';

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function buildInvoiceHtml(order, customer) {
  const addr = order.shippingAddress || {};
  const items = order.items || [];
  const rows = items.map((it) => `
    <tr>
      <td>${esc(it.name)}${it.instructions ? `<div class="note">Note: ${esc(it.instructions)}</div>` : ''}</td>
      <td>${esc(formatWeight(it.grams))}</td>
      <td class="num">${esc(it.qty)}</td>
      <td class="num">${esc(formatINR(it.price))}</td>
      <td class="num">${esc(formatINR(it.lineTotal))}</td>
    </tr>`).join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice - Order #${esc(order.id.slice(0, 6))}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #222; margin: 40px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #666; margin: 0 0 24px; }
  .grid { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
  .box h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: #888; margin: 0 0 6px; }
  .box p { margin: 0 0 2px; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #eee; font-size: 14px; }
  th { color: #888; text-transform: uppercase; font-size: 11px; letter-spacing: .04em; }
  td.num, th.num { text-align: right; }
  .note { color: #888; font-size: 12px; margin-top: 2px; }
  .totals { width: 280px; margin-left: auto; }
  .totals tr td { border: none; padding: 4px 6px; }
  .totals tr.grand td { border-top: 2px solid #222; font-weight: 700; font-size: 16px; }
  .footer { margin-top: 32px; color: #999; font-size: 12px; }
  @media print { body { margin: 15mm; } }
</style>
</head>
<body>
  <h1>INVOICE</h1>
  <p class="sub">Order #${esc(order.id.slice(0, 6))} &middot; Placed ${esc(formatTimestamp(order.createdAt))} &middot; Status: ${esc(order.status)}</p>

  <div class="grid">
    <div class="box">
      <h2>Seller / Store</h2>
      <p><strong>${esc(order.storeName)}</strong></p>
      <p>Store ID: ${esc(order.storeId)}</p>
    </div>
    <div class="box">
      <h2>Customer</h2>
      <p><strong>${esc(customer?.displayName || order.customerEmail)}</strong></p>
      <p>${esc(order.customerEmail)}</p>
      <p>${esc(addr.phone)}</p>
    </div>
    <div class="box">
      <h2>Ship to</h2>
      ${addr.apartmentName ? `<p>${esc(addr.apartmentName)}</p>` : ''}
      <p>${esc(addr.line)}</p>
      <p>${esc(addr.city)}</p>
      <p>${esc(addr.pincode)}, ${esc(addr.countryName || addr.country)}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Item</th><th>Weight</th><th class="num">Qty</th><th class="num">Price/kg</th><th class="num">Line total</th></tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <table class="totals">
    <tr><td>Total weight</td><td class="num">${esc(cartWeightKg(items).toFixed(2))} kg</td></tr>
    <tr><td>Subtotal</td><td class="num">${esc(formatINR(order.subtotal))}</td></tr>
    <tr><td>Shipping</td><td class="num">${esc(formatINR(order.shippingFee))}</td></tr>
    <tr><td>Tax</td><td class="num">${esc(formatINR(order.taxAmount))}</td></tr>
    <tr><td>Commission (platform)</td><td class="num">${esc(formatINR(order.commissionAmount))}</td></tr>
    <tr><td>Seller net</td><td class="num">${esc(formatINR(order.sellerNetAmount))}</td></tr>
    <tr class="grand"><td>Total</td><td class="num">${esc(formatINR(order.total))}</td></tr>
  </table>

  <p>Payment method: ${esc(paymentLabel(order.paymentMethod))}</p>

  <div class="footer">Generated ${esc(formatTimestamp(new Date()))}</div>
</body>
</html>`;
}

export function printInvoice(order, customer) {
  const html = buildInvoiceHtml(order, customer);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.addEventListener('load', () => {
      win.focus();
      win.print();
    });
    win.addEventListener('afterprint', () => URL.revokeObjectURL(url));
  }
}
