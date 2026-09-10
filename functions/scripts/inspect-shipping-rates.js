// One-off, read-only: dump the current platformConfig/shippingRates doc, to
// check whether a buffer or old-format band data is currently saved before
// changing the shipping-rates calculation logic.
const admin = require('firebase-admin');

admin.initializeApp();

async function main() {
  const db = admin.firestore();
  const snap = await db.collection('platformConfig').doc('shippingRates').get();
  if (!snap.exists) {
    console.log('No platformConfig/shippingRates doc exists -- app is using the built-in code default.');
    return;
  }
  console.log(JSON.stringify(snap.data(), null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
