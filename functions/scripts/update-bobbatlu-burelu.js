// One-off: add a shelf-life warning to Bobbattlu/Kova Bobbattlu, and rename
// Burelu to Kobbari Burelu — applied to both Anupama Home Foods (production)
// and the internal Test store clone, so they stay in sync.
// Usage: node update-bobbatlu-burelu.js
const admin = require('firebase-admin');

admin.initializeApp();

const STORE_IDS = ['I5kafJCHeU6uVTnilrvT', '6gX4Fb5fVxgDRMOrqX5T']; // Anupama Home Foods, Test
const SHELF_LIFE_WARNING = 'Shelf life: 3 days, including travel.';

const WARNING_TARGETS = new Set(['Bobbattlu', 'Kova Bobbattlu']);
const RENAME = { from: 'Burelu', to: 'Kobbari Burelu' };

async function main() {
  const db = admin.firestore();

  for (const storeId of STORE_IDS) {
    const snap = await db.collection('products').where('storeId', '==', storeId).get();
    for (const doc of snap.docs) {
      const p = doc.data();
      if (WARNING_TARGETS.has(p.name)) {
        await doc.ref.update({ warning: SHELF_LIFE_WARNING });
        console.log(`[${storeId}] ${doc.id}: "${p.name}" — set warning`);
      } else if (p.name === RENAME.from) {
        await doc.ref.update({ name: RENAME.to });
        console.log(`[${storeId}] ${doc.id}: renamed "${RENAME.from}" -> "${RENAME.to}"`);
      }
    }
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
