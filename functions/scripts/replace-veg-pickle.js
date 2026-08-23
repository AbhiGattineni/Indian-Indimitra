// One-off: replace the generic "Veg Pickle (all types)" listing with the
// seller's actual named pickle products (no real photos yet, so these use
// the app's placeholder image fallback until the seller uploads real ones
// via Admin > Catalog). Usage: node replace-veg-pickle.js
const admin = require('firebase-admin');

admin.initializeApp();

const OLD_PRODUCT_ID = 'ZN2lBgZkqvtAouDe2I55';
const STORE_ID = 'I5kafJCHeU6uVTnilrvT';
const CATEGORY_ID = '8nZsg6BCv9FCMqEANazj';

const NEW_PRODUCTS = [
  { name: 'Tomato Pickle', price: 500 },
  { name: 'Ginger Pickle', price: 500 },
  { name: 'Gongura Pickle', price: 500 },
  { name: 'Kakarakaya Pickle', price: 600 },
  { name: 'Mango Pickle', price: 600 },
  { name: 'Amla Pickle', price: 600 },
  { name: 'Mixed Vegetable Pickle', price: 600 },
  { name: 'Mixed Leafy Pickle', price: 600 },
  { name: 'Lemon Pickle', price: 500 },
];

async function main() {
  const db = admin.firestore();

  const storeDoc = await db.collection('stores').doc(STORE_ID).get();
  if (!storeDoc.exists) {
    throw new Error(`Store ${STORE_ID} not found`);
  }
  const ownerUid = storeDoc.data().ownerUid;
  console.log(`Store: ${storeDoc.data().name} (ownerUid: ${ownerUid})`);

  await db.collection('products').doc(OLD_PRODUCT_ID).update({ status: 'unlisted' });
  console.log(`Unlisted old product ${OLD_PRODUCT_ID} (Veg Pickle (all types))`);

  for (const p of NEW_PRODUCTS) {
    const ref = await db.collection('products').add({
      storeId: STORE_ID,
      ownerUid,
      name: p.name,
      description: `${p.name} — homemade`,
      categoryId: CATEGORY_ID,
      price: p.price,
      quantity: 50,
      unit: 'kg',
      imageUrl: '',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`Created ${ref.id}: ${p.name} @ ₹${p.price}/kg`);
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
