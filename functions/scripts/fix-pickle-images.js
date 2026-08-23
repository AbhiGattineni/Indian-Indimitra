// One-off: replace 3 inaccurate product images from the earlier pickle-image
// pass:
//  - Kakarakaya Pickle was uploaded with a photo of ivy gourd (dondakaya) —
//    "kakarakaya" is actually bitter gourd (Momordica charantia); fixed to
//    the correct vegetable.
//  - Ginger Pickle and Lemon Pickle were raw-ingredient / visually-mismatched
//    stand-ins; replaced with an actual photo of the finished pickle/achar.
// Same Firebase Storage upload scheme as set-pickle-images.js (already
// removed after use) — see src/firebase/storage.js.
// Usage: node fix-pickle-images.js
const admin = require('firebase-admin');
const crypto = require('crypto');
const https = require('https');

admin.initializeApp({ storageBucket: 'indimitra-95a12.firebasestorage.app' });

const STORE_ID = 'I5kafJCHeU6uVTnilrvT';
const USER_AGENT = 'IndianIndimitraCatalogBot/1.0 (one-off script; https://www.guestsmenu.com)';

const FIXES = [
  {
    id: '8l2DzqU7jv72gNnrBCgE',
    name: 'Ginger Pickle',
    file: 'Ginger and green chilli achar.JPG',
    staleObject: 'products/I5kafJCHeU6uVTnilrvT/1787465395637_8l2DzqU7jv72gNnrBCgE.jpg',
  },
  {
    id: 'hj1V8xyU2RrYiHq4o67y',
    name: 'Kakarakaya Pickle',
    file: 'Bitter gourd (Momordica charantia).jpg',
    staleObject: 'products/I5kafJCHeU6uVTnilrvT/1787465397923_hj1V8xyU2RrYiHq4o67y.jpg',
  },
  {
    id: 'nUtrGfdyHQJ01sGGk8hc',
    name: 'Lemon Pickle',
    file: 'Tasty Lemon Pickle.jpg',
    staleObject: 'products/I5kafJCHeU6uVTnilrvT/1787465404978_nUtrGfdyHQJ01sGGk8hc.jpg',
  },
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchBuffer(res.headers.location).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`GET ${url} -> ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] }));
    }).on('error', reject);
  });
}

async function getCommonsImageUrl(fileTitle) {
  const api = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(`File:${fileTitle}`)}&prop=imageinfo&iiprop=url&format=json`;
  const data = await fetchJson(api);
  const page = Object.values(data.query.pages)[0];
  if (!page.imageinfo) throw new Error(`No imageinfo for File:${fileTitle}`);
  return page.imageinfo[0].url;
}

async function main() {
  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  for (const p of FIXES) {
    await bucket.file(p.staleObject).delete({ ignoreNotFound: true });

    const sourceUrl = await getCommonsImageUrl(p.file);
    const { buffer, contentType } = await fetchBuffer(sourceUrl);
    const ext = (sourceUrl.split('?')[0].split('.').pop() || 'jpg').toLowerCase();
    const storagePath = `products/${STORE_ID}/${Date.now()}_${p.id}.${ext}`;
    const token = crypto.randomUUID();
    await bucket.file(storagePath).save(buffer, {
      metadata: { contentType: contentType || 'image/jpeg', metadata: { firebaseStorageDownloadTokens: token } },
    });
    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
    await db.collection('products').doc(p.id).update({ imageUrl: downloadUrl });
    console.log(`${p.name}: ${storagePath}  (source: ${sourceUrl})`);
  }
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
