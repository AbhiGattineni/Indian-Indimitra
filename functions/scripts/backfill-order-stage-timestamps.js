// One-off: populate the per-stage timestamp fields (acceptedAt/shippedAt/
// inTransitAt/deliveredAt/cancelledAt) that the analytics dashboard's
// "Avg time per stage" and "Order timing detail" read, for orders that
// transitioned status BEFORE that tracking was added to updateOrderStatus().
//
// Those orders already have the real transition timestamps recorded in
// their orders/{id}/statusLog subcollection (logged on every status change
// since long before this feature existed) -- this just copies the earliest
// logged timestamp for each status onto the order doc's dedicated field, so
// existing history shows up immediately instead of only new transitions
// counting. Never overwrites a field that's already set (e.g. an order that
// transitioned after this feature shipped).
const admin = require('firebase-admin');

admin.initializeApp();

const STATUS_TO_FIELD = {
  accepted: 'acceptedAt',
  shipped: 'shippedAt',
  in_transit: 'inTransitAt',
  delivered: 'deliveredAt',
  cancelled: 'cancelledAt',
};

async function main() {
  const db = admin.firestore();
  const ordersSnap = await db.collection('orders').get();

  let updated = 0;
  let skipped = 0;
  let noLog = 0;

  for (const orderDoc of ordersSnap.docs) {
    const order = orderDoc.data();
    const logSnap = await db.collection('orders').doc(orderDoc.id).collection('statusLog')
      .orderBy('at', 'asc').get();

    if (logSnap.empty) { noLog += 1; continue; }

    const patch = {};
    const seen = new Set();
    logSnap.docs.forEach((d) => {
      const entry = d.data();
      const field = STATUS_TO_FIELD[entry.status];
      // orderBy('at','asc') + skip-if-seen gives the *earliest* logged
      // timestamp for each status, matching how updateOrderStatus() would
      // have stamped it the first time that transition happened.
      if (field && !seen.has(field) && !order[field] && entry.at) {
        patch[field] = entry.at;
        seen.add(field);
      }
    });

    if (Object.keys(patch).length === 0) { skipped += 1; continue; }

    await orderDoc.ref.update(patch);
    updated += 1;
    console.log(`Updated ${orderDoc.id}: ${Object.keys(patch).join(', ')}`);
  }

  console.log(`\nDone. Updated: ${updated}, already had fields: ${skipped}, no statusLog: ${noLog}, total orders: ${ordersSnap.size}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
