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
import { db } from './config';
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
    createdAt: serverTimestamp(),
    ...data,
  });
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...data,
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

/* ---------------- Cart (subcollection of user, one doc per store) ---------------- */
export async function getCart(uid, storeId) {
  const snap = await getDoc(doc(db, 'users', uid, 'cart', storeId));
  return snap.exists() ? snap.data() : null;
}
export async function saveCart(uid, storeId, items) {
  return setDoc(doc(db, 'users', uid, 'cart', storeId), {
    items,
    updatedAt: serverTimestamp(),
  });
}
export async function clearCart(uid, storeId) {
  return deleteDoc(doc(db, 'users', uid, 'cart', storeId));
}
