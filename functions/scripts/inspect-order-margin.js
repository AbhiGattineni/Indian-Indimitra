// One-off, read-only: check whether orders actually have marginAmount
// populated, and how it compares to commissionAmount in aggregate --
// diagnosing a report that "Total profit" on the dashboard looks like it
// only reflects commission, not the per-kg platform margin.
const admin = require('firebase-admin');

admin.initializeApp();

async function main() {
  const db = admin.firestore();
  const snap = await db.collection('orders').get();

  let withMargin = 0;
  let withoutMargin = 0;
  let marginTotal = 0;
  let commissionTotal = 0;
  let cancelled = 0;

  snap.docs.forEach((d) => {
    const o = d.data();
    if (o.status === 'cancelled') { cancelled += 1; return; }
    const margin = Number(o.marginAmount) || 0;
    if (o.marginAmount != null && margin > 0) withMargin += 1;
    else withoutMargin += 1;
    marginTotal += margin;
    commissionTotal += Number(o.commissionAmount) || 0;
  });

  console.log(`Total orders: ${snap.size} (cancelled: ${cancelled})`);
  console.log(`Live orders with marginAmount > 0: ${withMargin}`);
  console.log(`Live orders with marginAmount missing/0: ${withoutMargin}`);
  console.log(`Sum marginAmount (live orders): ${marginTotal.toFixed(2)}`);
  console.log(`Sum commissionAmount (live orders): ${commissionTotal.toFixed(2)}`);

  console.log('\nSample of the 5 most recent live orders:');
  const live = snap.docs
    .filter((d) => d.data().status !== 'cancelled')
    .sort((a, b) => (b.data().createdAt?.toMillis?.() || 0) - (a.data().createdAt?.toMillis?.() || 0))
    .slice(0, 5);
  live.forEach((d) => {
    const o = d.data();
    console.log(JSON.stringify({
      id: d.id,
      status: o.status,
      createdAt: o.createdAt?.toDate?.()?.toISOString() || o.createdAt,
      subtotal: o.subtotal,
      sellerSubtotal: o.sellerSubtotal,
      marginAmount: o.marginAmount,
      commissionAmount: o.commissionAmount,
      itemCount: o.items?.length,
      firstItem: o.items?.[0] && {
        name: o.items[0].name,
        price: o.items[0].price,
        sellerPrice: o.items[0].sellerPrice,
        grams: o.items[0].grams,
        qty: o.items[0].qty,
      },
    }));
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
