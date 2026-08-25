// Firestore data-access helpers, grouped by collection.
// Keep all direct Firestore calls here so pages stay declarative.
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './config';
import { ROLES, STORE_STATUS, PRODUCT_STATUS, ORDER_STATUS, PAYMENT_METHOD } from '../lib/constants';
import { defaultShippingRates } from '../lib/shipping';

/* ---------------- Users ---------------- */
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Admin-only (enforced by rules): change a user's role.
export async function setUserRole(uid, role) {
  await updateDoc(doc(db, 'users', uid), { role });
}

export async function getUserByEmail(email) {
  const snap = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function listUsersByRole(role) {
  const snap = await getDocs(query(collection(db, 'users'), where('role', '==', role)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* ---------------- Platform config ---------------- */
export async function getPlatformConfig() {
  const snap = await getDoc(doc(db, 'platformConfig', 'global'));
  return snap.exists() ? snap.data() : { commissionRate: 0, taxRate: 0, currency: 'INR' };
}

export async function setPlatformConfig(data) {
  await setDoc(doc(db, 'platformConfig', 'global'), data, { merge: true });
}

/* ---------------- Shipping rates (international, per-country weight bands) --- */
export async function getShippingRates() {
  const snap = await getDoc(doc(db, 'platformConfig', 'shippingRates'));
  return snap.exists() ? { ...defaultShippingRates(), ...snap.data() } : defaultShippingRates();
}

export async function setShippingRates(data, updatedByEmail) {
  await setDoc(doc(db, 'platformConfig', 'shippingRates'), {
    ...data,
    updatedAt: serverTimestamp(),
    updatedBy: updatedByEmail || '',
  }, { merge: true });
}

/* ---------------- Categories ---------------- */
export async function listCategories() {
  const snap = await getDocs(query(collection(db, 'categories'), orderBy('name')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function createCategory(name) {
  return addDoc(collection(db, 'categories'), { name, createdAt: serverTimestamp() });
}
export async function deleteCategory(id) {
  return deleteDoc(doc(db, 'categories', id));
}

/* ---------------- Stores (seller storefronts) ---------------- */
export async function createStore(ownerUid, data) {
  return addDoc(collection(db, 'stores'), {
    ownerUid,
    approvalStatus: STORE_STATUS.PENDING,
    fdmUids: [],
    createdAt: serverTimestamp(),
    ...data,
  });
}
// Stores assigned to a Forward Deployment Manager.
export async function listStoresByFdm(uid) {
  const snap = await getDocs(
    query(collection(db, 'stores'), where('fdmUids', 'array-contains', uid))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
// Replace a store's assigned-FDM list (admin only, enforced by rules).
export async function setStoreFdmUids(storeId, fdmUids) {
  return updateDoc(doc(db, 'stores', storeId), { fdmUids });
}
export async function getStore(storeId) {
  const snap = await getDoc(doc(db, 'stores', storeId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function getStoreByOwner(ownerUid) {
  const snap = await getDocs(query(collection(db, 'stores'), where('ownerUid', '==', ownerUid)));
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}
export async function listStores(statusFilter) {
  const base = collection(db, 'stores');
  const q = statusFilter ? query(base, where('approvalStatus', '==', statusFilter)) : base;
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function updateStore(storeId, data) {
  return updateDoc(doc(db, 'stores', storeId), data);
}

/* ---------------- Products (listings) ---------------- */
export async function createProduct(data) {
  return addDoc(collection(db, 'products'), {
    status: PRODUCT_STATUS.ACTIVE,
    createdAt: serverTimestamp(),
    ...data,
  });
}
export async function updateProduct(id, data) {
  return updateDoc(doc(db, 'products', id), data);
}
export async function deleteProduct(id) {
  return deleteDoc(doc(db, 'products', id));
}
export async function listAllProducts() {
  const snap = await getDocs(collection(db, 'products'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function listActiveProducts() {
  const snap = await getDocs(
    query(collection(db, 'products'), where('status', '==', PRODUCT_STATUS.ACTIVE))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function listProductsByStore(storeId) {
  const snap = await getDocs(query(collection(db, 'products'), where('storeId', '==', storeId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* ---------------- Orders ---------------- */
export async function createOrder(data) {
  return addDoc(collection(db, 'orders'), {
    paymentMethod: PAYMENT_METHOD.COD,
    status: ORDER_STATUS.PLACED,
    // Immutable snapshot of items as placed, kept alongside the (editable)
    // `items` field so a later pre-acceptance edit can be diffed against it.
    originalItems: data.items,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...data,
  });
}
// Customer edits an order's items (and recomputed totals) while it's still
// `placed` — enforced by firestore.rules. Stamps `editedAt` so the UI knows
// to show the before/after diff.
export async function updateOrderItems(orderId, patch) {
  return updateDoc(doc(db, 'orders', orderId), {
    ...patch,
    editedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
export async function listOrdersByCustomer(uid) {
  const snap = await getDocs(query(collection(db, 'orders'), where('customerUid', '==', uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function listOrdersByStore(storeId) {
  const snap = await getDocs(query(collection(db, 'orders'), where('storeId', '==', storeId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function listAllOrders() {
  const snap = await getDocs(collection(db, 'orders'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function updateOrder(orderId, data) {
  return updateDoc(doc(db, 'orders', orderId), { ...data, updatedAt: serverTimestamp() });
}

// Audit trail of order status changes — who changed it and when. Admin/FDM
// visibility only (enforced by firestore.rules).
export async function logOrderStatusChange(orderId, entry) {
  return addDoc(collection(db, 'orders', orderId, 'statusLog'), { ...entry, at: serverTimestamp() });
}
export async function listOrderStatusLog(orderId) {
  const snap = await getDocs(query(collection(db, 'orders', orderId, 'statusLog'), orderBy('at', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Fetches (currently mocked — see functions/index.js) live carrier tracking
// for an order's shipment and stores it on the order doc server-side.
const refreshUpsTrackingFn = httpsCallable(functions, 'refreshUpsTracking');
export async function refreshUpsTracking(orderId) {
  const res = await refreshUpsTrackingFn({ orderId });
  return res.data;
}

/* ---------------- Reviews (one per product+customer, doc id `${productId}_${uid}`) --- */
export async function getReview(id) {
  const snap = await getDoc(doc(db, 'reviews', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function listAllReviews() {
  const snap = await getDocs(collection(db, 'reviews'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function listReviewsByProduct(productId) {
  const snap = await getDocs(query(collection(db, 'reviews'), where('productId', '==', productId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function listReviewsByStore(storeId) {
  const snap = await getDocs(query(collection(db, 'reviews'), where('storeId', '==', storeId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function upsertReview(id, data) {
  return setDoc(doc(db, 'reviews', id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}
export async function deleteReview(id) {
  return deleteDoc(doc(db, 'reviews', id));
}

/* ---------------- Order feedback (one per order; doc id = orderId; --- */
/* covers anything other than the items themselves — delivery, service, etc; */
/* admin/FDM-only visibility, enforced by firestore.rules) --------------- */
export async function getOrderFeedback(orderId) {
  const snap = await getDoc(doc(db, 'orderFeedback', orderId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function upsertOrderFeedback(orderId, data) {
  return setDoc(doc(db, 'orderFeedback', orderId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}
export async function deleteOrderFeedback(orderId) {
  return deleteDoc(doc(db, 'orderFeedback', orderId));
}

/* ---------------- Addresses (subcollection of user) ---------------- */
export async function listAddresses(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'addresses'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function addAddress(uid, data) {
  return addDoc(collection(db, 'users', uid, 'addresses'), data);
}
export async function deleteAddress(uid, addressId) {
  return deleteDoc(doc(db, 'users', uid, 'addresses', addressId));
}

/* ---------------- Cart (subcollection of user; single active cart per user) --- */
// A cart is always scoped to one store at a time (client-side rule), so it's
// stored as a single doc rather than one-per-store — lets a signed-in user
// pick up the exact same cart on any other browser/device after logging in.
export async function getCart(uid) {
  const snap = await getDoc(doc(db, 'users', uid, 'cart', 'current'));
  return snap.exists() ? snap.data() : null;
}
export async function saveCart(uid, cart) {
  return setDoc(doc(db, 'users', uid, 'cart', 'current'), {
    ...cart,
    updatedAt: serverTimestamp(),
  });
}
export async function clearCart(uid) {
  return deleteDoc(doc(db, 'users', uid, 'cart', 'current'));
}
