// Shared enums/constants mirrored in firestore.rules where relevant.

// The one account auto-promoted to admin on first sign-in — no manual
// Firebase console step needed. Mirrored in firestore.rules as SUPER_ADMIN_EMAIL.
export const SUPER_ADMIN_EMAIL = 'anddhensoftware@gmail.com';

export const ROLES = {
  CUSTOMER: 'customer',
  SELLER: 'seller',
  // Forward Deployment Manager — Indimitra-side rep who fully runs one or more
  // assigned businesses (assigned by admin via store.fdmUids).
  FDM: 'fdm',
  ADMIN: 'admin',
};

// Human labels for roles (used in admin UI + menus).
export const ROLE_LABELS = {
  customer: 'Customer',
  seller: 'Seller',
  fdm: 'Forward Deployment Manager',
  admin: 'Admin',
};

export const STORE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const PRODUCT_STATUS = {
  ACTIVE: 'active',
  UNLISTED: 'unlisted',
};

// Order lifecycle: placed -> accepted -> shipped -> delivered (or cancelled).
export const ORDER_STATUS = {
  PLACED: 'placed',
  ACCEPTED: 'accepted',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

export const ORDER_STATUS_FLOW = [
  ORDER_STATUS.PLACED,
  ORDER_STATUS.ACCEPTED,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
];

export const PAYMENT_METHOD = {
  COD: 'COD', // stored value kept as 'COD' for data continuity
};

// User-facing labels for stored payment-method values.
export const PAYMENT_LABELS = {
  COD: 'Cash payment',
};

export function paymentLabel(method) {
  return PAYMENT_LABELS[method] || method || 'Cash payment';
}

export const CURRENCY = 'INR';
