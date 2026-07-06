// One-click catalog seeder (admin-only). Writes the single demo store, its
// categories, and all products from src/data/seedCatalog.js into Firestore.
// Idempotent: reuses an existing store/category by name and skips products
// whose name already exists for the store, so re-running won't duplicate.
import {
  collection, addDoc, getDocs, query, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { SEED_STORE, SEED_CATEGORIES } from '../data/seedCatalog';
import { STORE_STATUS, PRODUCT_STATUS } from '../lib/constants';

export async function seedCatalog(adminUid) {
  const result = { storeId: null, categoriesAdded: 0, productsAdded: 0, skipped: 0 };

  // 1. Store — reuse if one with this name already exists, else create (approved).
  const storeSnap = await getDocs(
    query(collection(db, 'stores'), where('name', '==', SEED_STORE.name))
  );
  if (!storeSnap.empty) {
    result.storeId = storeSnap.docs[0].id;
  } else {
    const ref = await addDoc(collection(db, 'stores'), {
      ...SEED_STORE,
      ownerUid: adminUid,
      approvalStatus: STORE_STATUS.APPROVED,
      createdAt: serverTimestamp(),
    });
    result.storeId = ref.id;
  }
  const storeId = result.storeId;

  // 2. Existing categories (by name) and existing product names for this store.
  const catSnap = await getDocs(collection(db, 'categories'));
  const catIdByName = {};
  catSnap.docs.forEach((d) => { catIdByName[d.data().name] = d.id; });

  const prodSnap = await getDocs(
    query(collection(db, 'products'), where('storeId', '==', storeId))
  );
  const existingProductNames = new Set(prodSnap.docs.map((d) => d.data().name));

  // 3. Categories + products.
  for (const [catName, items] of Object.entries(SEED_CATEGORIES)) {
    let catId = catIdByName[catName];
    if (!catId) {
      const cRef = await addDoc(collection(db, 'categories'), {
        name: catName,
        createdAt: serverTimestamp(),
      });
      catId = cRef.id;
      catIdByName[catName] = catId;
      result.categoriesAdded += 1;
    }

    for (const item of items) {
      if (existingProductNames.has(item.name)) { result.skipped += 1; continue; }
      await addDoc(collection(db, 'products'), {
        storeId,
        ownerUid: adminUid,
        name: item.name,
        description: `${catName} — ${item.name}`,
        categoryId: catId,
        imageUrl: '',
        price: item.price,
        quantity: 50,
        unit: item.unit,
        status: PRODUCT_STATUS.ACTIVE,
        createdAt: serverTimestamp(),
      });
      result.productsAdded += 1;
    }
  }

  return result;
}
