// One-off: create an internal "Test" store (visible only to Admin/FDM in the
// store switcher, via the `internal: true` flag — see useStoreSelection.js /
// StoreSwitcherModal.jsx) and clone Anupama Home Foods' currently-active
// products into it, so Admin/FDM can place test orders without touching
// production customer-facing data.
// Usage: node create-test-store.js
const admin = require('firebase-admin');

admin.initializeApp();

const SOURCE_STORE_ID = 'I5kafJCHeU6uVTnilrvT'; // Anupama Home Foods

async function main() {
  const db = admin.firestore();

  const sourceSnap = await db.collection('stores').doc(SOURCE_STORE_ID).get();
  if (!sourceSnap.exists) throw new Error(`Source store ${SOURCE_STORE_ID} not found`);
  const source = sourceSnap.data();

  const storeRef = await db.collection('stores').add({
    ownerUid: 'test-seed-owner',
    name: 'Test',
    description: 'Internal test store for Admin/FDM QA — not visible to customers.',
    pickupAddress: source.pickupAddress || '',
    shippingFlatFee: source.shippingFlatFee || 0,
    freeShippingThreshold: source.freeShippingThreshold || 0,
    approvalStatus: 'approved',
    fdmUids: [],
    images: [],
    internal: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`Created store ${storeRef.id}: Test`);

  const productsSnap = await db.collection('products')
    .where('storeId', '==', SOURCE_STORE_ID)
    .where('status', '==', 'active')
    .get();

  for (const doc of productsSnap.docs) {
    const p = doc.data();
    const ref = await db.collection('products').add({
      storeId: storeRef.id,
      ownerUid: 'test-seed-owner',
      name: p.name,
      description: p.description || '',
      categoryId: p.categoryId,
      price: p.price,
      quantity: p.quantity,
      unit: p.unit,
      imageUrl: p.imageUrl || '',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`Cloned ${ref.id}: ${p.name}`);
  }

  console.log(`Done. ${productsSnap.size} product(s) cloned into store ${storeRef.id}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
