// One-off, read-only: find products whose name matches a substring, across
// all stores, so we can see exactly what's live before editing anything.
// Usage: node inspect-products.js <name-substring>
const admin = require('firebase-admin');

admin.initializeApp();

async function main() {
  const [, , needle] = process.argv;
  if (!needle) {
    console.error('Usage: node inspect-products.js <name-substring>');
    process.exit(1);
  }

  const db = admin.firestore();
  const [productsSnap, storesSnap, categoriesSnap] = await Promise.all([
    db.collection('products').get(),
    db.collection('stores').get(),
    db.collection('categories').get(),
  ]);

  const storeNames = Object.fromEntries(storesSnap.docs.map((d) => [d.id, d.data().name]));
  const categoryNames = Object.fromEntries(categoriesSnap.docs.map((d) => [d.id, d.data().name]));

  const matches = productsSnap.docs.filter((d) =>
    (d.data().name || '').toLowerCase().includes(needle.toLowerCase())
  );

  if (matches.length === 0) {
    console.log(`No products found matching "${needle}".`);
  }
  matches.forEach((d) => {
    const p = d.data();
    console.log(JSON.stringify({
      id: d.id,
      name: p.name,
      storeId: p.storeId,
      storeName: storeNames[p.storeId] || '(unknown store)',
      categoryId: p.categoryId,
      categoryName: categoryNames[p.categoryId] || '(unknown category)',
      price: p.price,
      unit: p.unit,
      quantity: p.quantity,
      status: p.status,
      imageUrl: p.imageUrl || '(none)',
      description: p.description || '(none)',
    }, null, 2));
  });

  console.log('\nAll stores:');
  storesSnap.docs.forEach((d) => console.log(`  ${d.id}: ${d.data().name}`));
  console.log('\nAll categories:');
  categoriesSnap.docs.forEach((d) => console.log(`  ${d.id}: ${d.data().name}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
