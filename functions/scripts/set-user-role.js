// One-off admin utility: set a user's role by email, via the Admin SDK
// (bypasses Firestore rules, which is why this only runs from a trusted
// CI job using the deploy service account, never from the client).
// Usage: node set-user-role.js <email> <role>
const admin = require('firebase-admin');

admin.initializeApp();

async function main() {
  const [, , email, role] = process.argv;
  if (!email || !role) {
    console.error('Usage: node set-user-role.js <email> <role>');
    process.exit(1);
  }

  const db = admin.firestore();
  const snap = await db.collection('users').where('email', '==', email).get();
  if (snap.empty) {
    console.error(`No user found with email ${email}. They must sign in at least once first.`);
    process.exit(1);
  }

  const docRef = snap.docs[0].ref;
  const before = snap.docs[0].data();
  await docRef.update({ role });
  console.log(`Updated ${email} (uid ${docRef.id}): role "${before.role}" -> "${role}"`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
