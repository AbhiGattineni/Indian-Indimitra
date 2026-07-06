// Server-side new-order email notifications.
//
// Triggered whenever a new order document is created. Sends a full order
// summary to the store operators via the EmailJS REST API. The EmailJS
// PRIVATE key is read from Secret Manager and never leaves the server — no
// email secret is ever shipped to the browser.
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret, defineString } = require('firebase-functions/params');
const { setGlobalOptions } = require('firebase-functions/v2');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

admin.initializeApp();
setGlobalOptions({ region: 'us-central1', maxInstances: 5 });

// Only the private key is a real secret -> Secret Manager. The service id,
// public key and template id are not sensitive (public key is public by
// design), so they live in functions/.env as plain params.
const EMAILJS_PRIVATE_KEY = defineSecret('EMAILJS_PRIVATE_KEY');
const EMAILJS_SERVICE_ID = defineString('EMAILJS_SERVICE_ID');
const EMAILJS_PUBLIC_KEY = defineString('EMAILJS_PUBLIC_KEY');
const EMAILJS_TEMPLATE_ID = defineString('EMAILJS_TEMPLATE_ID');

// Who is notified on every new order.
const RECIPIENTS = 'anddhenconsulting@gmail.com';

const inr = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

const grams = (i) => Number(i.grams) || 1000;
const weightLabel = (g) => (g >= 1000 ? `${g / 1000} kg` : `${g} g`);

function itemsText(items = []) {
  return items
    .map((i) => {
      const total = i.lineTotal ?? i.price * (grams(i) / 1000) * i.qty;
      return `  - ${i.name} (${weightLabel(grams(i))}) x ${i.qty}  =  ${inr(total)}`;
    })
    .join('\n');
}

// Human label for a stored payment-method value.
const paymentLabel = (m) => (m === 'COD' ? 'Cash payment' : m || 'Cash payment');

function buildParams(order, orderId, customerEmail) {
  const a = order.shippingAddress || {};
  const address = `${a.line || ''}, ${a.city || ''} - ${a.pincode || ''}`;

  const order_details = [
    `New order #${orderId.slice(0, 6)} placed at ${order.storeName || 'the store'}.`,
    '',
    'Items:',
    itemsText(order.items),
    '',
    `Subtotal:  ${inr(order.subtotal)}`,
    `Shipping:  ${inr(order.shippingFee)}`,
    `Tax:       ${inr(order.taxAmount)}`,
    `Total:     ${inr(order.total)}`,
    `Payment:   ${paymentLabel(order.paymentMethod)}`,
    '',
    'Customer:',
    `  Email:   ${customerEmail || '-'}`,
    `  Phone:   ${a.phone || '-'}`,
    `  Address: ${address}`,
    '',
    `Order ID: ${orderId}`,
  ].join('\n');

  return {
    to_email: RECIPIENTS,
    order_id: orderId,
    order_short_id: orderId.slice(0, 6),
    store_name: order.storeName || '',
    customer_email: customerEmail || '',
    customer_phone: a.phone || '',
    payment_method: paymentLabel(order.paymentMethod),
    order_total: inr(order.total),
    delivery_address: address,
    order_details,
  };
}

exports.onNewOrderEmail = onDocumentCreated(
  { document: 'orders/{orderId}', secrets: [EMAILJS_PRIVATE_KEY] },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const order = snap.data();
    const orderId = event.params.orderId;

    // Prefer the email stored on the order; fall back to the Auth record.
    let customerEmail = order.customerEmail || '';
    if (!customerEmail && order.customerUid) {
      try {
        const u = await admin.auth().getUser(order.customerUid);
        customerEmail = u.email || '';
      } catch (e) {
        logger.warn(`Could not resolve customer email for ${order.customerUid}`, e);
      }
    }

    const body = {
      service_id: EMAILJS_SERVICE_ID.value(),
      template_id: EMAILJS_TEMPLATE_ID.value(),
      user_id: EMAILJS_PUBLIC_KEY.value(),
      accessToken: EMAILJS_PRIVATE_KEY.value(),
      template_params: buildParams(order, orderId, customerEmail),
    };

    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        logger.error(`EmailJS send failed (${res.status}): ${text}`);
        return;
      }
      logger.info(`New-order email sent for ${orderId}`);
    } catch (e) {
      logger.error(`New-order email error for ${orderId}`, e);
    }
  }
);
