// Server-side order email notifications.
//
// Two triggers, both over the EmailJS REST API. The EmailJS PRIVATE key is read
// from Secret Manager and never leaves the server — no email secret is ever
// shipped to the browser.
//   1. onNewOrderEmail   (order created) -> operators (seller + FDMs + admins)
//                                            AND an order confirmation to the customer.
//   2. onOrderStatusEmail(order updated) -> the customer, whenever status changes
//                                            (accepted / shipped / delivered / cancelled).
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
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

// Admin addresses that always receive a backup copy of every order, on top of
// the store's seller and any assigned Forward Deployment Managers.
const ADMIN_BACKUP = ['anddhensoftware@gmail.com', 'anddhenconsulting@gmail.com'];

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

function fullAddress(order) {
  const a = order.shippingAddress || {};
  return `${a.line || ''}, ${a.city || ''} - ${a.pincode || ''}`;
}

// Scalar template params shared by every email. `to_email`, `email_subject`
// and `order_details` are overridden per message.
function baseParams(order, orderId, customerEmail) {
  const a = order.shippingAddress || {};
  return {
    order_id: orderId,
    order_short_id: orderId.slice(0, 6),
    store_name: order.storeName || '',
    customer_email: customerEmail || '',
    customer_phone: a.phone || '',
    payment_method: paymentLabel(order.paymentMethod),
    order_total: inr(order.total),
    delivery_address: fullAddress(order),
  };
}

// The full operations-facing summary (includes customer contact + margins).
function operatorDetails(order, orderId, customerEmail) {
  const a = order.shippingAddress || {};
  return [
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
    `  Address: ${fullAddress(order)}`,
    '',
    `Order ID: ${orderId}`,
  ].join('\n');
}

// Customer-facing order summary block (no internal margins/contact dump).
function customerSummary(order, orderId) {
  return [
    'Order summary:',
    itemsText(order.items),
    '',
    `Total:     ${inr(order.total)}`,
    `Payment:   ${paymentLabel(order.paymentMethod)}`,
    `Delivery:  ${fullAddress(order)}`,
    '',
    `Order ID: ${orderId}`,
  ].join('\n');
}

// Confirmation sent to the customer the moment they place an order.
function customerConfirmation(order, orderId) {
  const store = order.storeName || 'the store';
  return [
    `Thank you for your order at ${store}!`,
    `We've received order #${orderId.slice(0, 6)} and will start preparing it.`,
    "We'll email you as it's accepted, shipped, and delivered.",
    '',
    customerSummary(order, orderId),
  ].join('\n');
}

// Per-status customer messaging. Keys mirror ORDER_STATUS in src/lib/constants.js.
const STATUS_WORD = {
  accepted: 'accepted',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
  placed: 'received',
};

function statusMessage(status, order) {
  const store = order.storeName || 'the store';
  switch (status) {
    case 'accepted':
      return `Good news! ${store} has accepted your order and is preparing it.`;
    case 'shipped': {
      const s = order.shipment || {};
      const bits = [`Your order from ${store} is on its way.`];
      if (s.courierName) bits.push(`Courier: ${s.courierName}`);
      if (s.trackingNumber) bits.push(`Tracking #: ${s.trackingNumber}`);
      if (s.trackingUrl) bits.push(`Track it: ${s.trackingUrl}`);
      return bits.join('\n');
    }
    case 'delivered':
      return `Your order from ${store} has been delivered. We hope you enjoy it!`;
    case 'cancelled':
      return `Your order from ${store} has been cancelled. If this is unexpected, please reply to this email or contact the store.`;
    default:
      return `Your order from ${store} has an update.`;
  }
}

// Body for a customer status-change email.
function customerStatusBody(status, order, orderId) {
  return [statusMessage(status, order), '', customerSummary(order, orderId)].join('\n');
}

// Resolve a user's email from their Firestore profile, falling back to Auth.
async function resolveEmail(uid) {
  if (!uid) return '';
  try {
    const doc = await admin.firestore().collection('users').doc(uid).get();
    const email = doc.exists ? doc.data().email : '';
    if (email) return email;
  } catch (e) {
    logger.warn(`Could not read profile for ${uid}`, e);
  }
  try {
    const u = await admin.auth().getUser(uid);
    return u.email || '';
  } catch (e) {
    logger.warn(`Could not resolve Auth email for ${uid}`, e);
    return '';
  }
}

// The customer's email: prefer what's stored on the order, else the Auth record.
async function resolveCustomerEmail(order) {
  if (order.customerEmail) return order.customerEmail;
  if (order.customerUid) {
    try {
      const u = await admin.auth().getUser(order.customerUid);
      return u.email || '';
    } catch (e) {
      logger.warn(`Could not resolve customer email for ${order.customerUid}`, e);
    }
  }
  return '';
}

// Operator recipients: seller (owner) + assigned FDMs + admin backups.
// De-duplicated; empty/unresolvable addresses are dropped.
async function operatorRecipients(order) {
  const emails = [...ADMIN_BACKUP];
  if (order.storeId) {
    try {
      const storeDoc = await admin.firestore().collection('stores').doc(order.storeId).get();
      if (storeDoc.exists) {
        const store = storeDoc.data();
        const uids = [store.ownerUid, ...(store.fdmUids || [])].filter(Boolean);
        const resolved = await Promise.all(uids.map(resolveEmail));
        emails.push(...resolved);
      }
    } catch (e) {
      logger.warn(`Could not resolve store recipients for ${order.storeId}`, e);
    }
  }
  const seen = new Set();
  return emails.filter((e) => {
    const key = (e || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Send one EmailJS message. `subject` drives the template's {{email_subject}}
// (set the template Subject field to {{email_subject}} for this to take effect;
// otherwise the template's own subject is used and this is ignored).
async function sendEmail({ toEmail, subject, details, order, orderId, customerEmail, tag }) {
  const body = {
    service_id: EMAILJS_SERVICE_ID.value(),
    template_id: EMAILJS_TEMPLATE_ID.value(),
    user_id: EMAILJS_PUBLIC_KEY.value(),
    accessToken: EMAILJS_PRIVATE_KEY.value(),
    template_params: {
      ...baseParams(order, orderId, customerEmail),
      to_email: toEmail,
      email_subject: subject,
      order_details: details,
    },
  };
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      logger.error(`EmailJS ${tag} to ${toEmail} failed (${res.status}): ${text}`);
    } else {
      logger.info(`${tag} email sent to ${toEmail} for ${orderId}`);
    }
  } catch (e) {
    logger.error(`EmailJS ${tag} error to ${toEmail} for ${orderId}`, e);
  }
}

// ---- Trigger 1: new order ----
exports.onNewOrderEmail = onDocumentCreated(
  { document: 'orders/{orderId}', secrets: [EMAILJS_PRIVATE_KEY] },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const order = snap.data();
    const orderId = event.params.orderId;

    const customerEmail = await resolveCustomerEmail(order);
    const store = order.storeName || 'the store';
    const short = orderId.slice(0, 6);

    // Operators: seller + FDMs + admin backups.
    const operators = await operatorRecipients(order);
    logger.info(`Order ${orderId}: operators = ${operators.join(', ')}; customer = ${customerEmail || '(none)'}`);
    for (const toEmail of operators) {
      await sendEmail({
        toEmail,
        subject: `New order ${short} at ${store}`,
        details: operatorDetails(order, orderId, customerEmail),
        order, orderId, customerEmail, tag: 'new-order(operator)',
      });
    }

    // Customer confirmation (skip if they're also an operator, to avoid a dupe).
    if (customerEmail && !operators.some((e) => e.toLowerCase() === customerEmail.toLowerCase())) {
      await sendEmail({
        toEmail: customerEmail,
        subject: `Order ${short} confirmed — ${store}`,
        details: customerConfirmation(order, orderId),
        order, orderId, customerEmail, tag: 'new-order(customer)',
      });
    }
  }
);

// ---- Trigger 2: status change ----
exports.onOrderStatusEmail = onDocumentUpdated(
  { document: 'orders/{orderId}', secrets: [EMAILJS_PRIVATE_KEY] },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;
    if (before.status === after.status) return; // only react to status changes

    const orderId = event.params.orderId;
    const status = after.status;
    const store = after.storeName || 'the store';
    const short = orderId.slice(0, 6);

    const customerEmail = await resolveCustomerEmail(after);
    if (!customerEmail) {
      logger.warn(`Order ${orderId} -> ${status}: no customer email to notify`);
      return;
    }

    logger.info(`Order ${orderId}: status ${before.status} -> ${status}; notifying ${customerEmail}`);
    await sendEmail({
      toEmail: customerEmail,
      subject: `Your order ${short} is ${STATUS_WORD[status] || status} — ${store}`,
      details: customerStatusBody(status, after, orderId),
      order: after, orderId, customerEmail, tag: `status(${status})`,
    });
  }
);
