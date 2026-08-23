// One-off: fetch freely-licensed representative photos from Wikimedia Commons
// for the 9 pickle products (no real seller photos exist yet) and upload them
// to Firebase Storage, using the same products/{storeId}/{fileName} path +
// download-token URL scheme the app's own upload flow uses
// (see src/firebase/storage.js). File titles are resolved to their current
// URL via the Commons API at run time rather than hardcoding a CDN path.
// Usage: node set-pickle-images.js
const admin = require('firebase-admin');
const crypto = require('crypto');
const https = require('https');

admin.initializeApp({ storageBucket: 'indimitra-95a12.firebasestorage.app' });

const STORE_ID = 'I5kafJCHeU6uVTnilrvT';
const USER_AGENT = 'IndianIndimitraCatalogBot/1.0 (one-off script; https://www.guestsmenu.com)';

// Direct photos of the finished pickle where a freely-licensed one exists;
// otherwise a photo of the raw ingredient (per product decision — no
// pickle-specific photo was found on Commons for these).
const PRODUCTS = [
  { id: 'L1jkizS683tKQBC3ZoY4', name: 'Tomato Pickle', file: 'Tomatoes.jpg' },
  { id: '8l2DzqU7jv72gNnrBCgE', name: 'Ginger Pickle', file: 'Fresh ginger.jpg' },
  { id: 'CVRS5hggLatJHkoqrZxc', name: 'Gongura Pickle', file: 'Gongura Pickle.jpg' },
  { id: 'hj1V8xyU2RrYiHq4o67y', name: 'Kakarakaya Pickle', file: 'Ivy gourd (Coccinia grandis) fruits.jpg' },
  { id: 'PYVSvsDkbcDZlMLE2Edb', name: 'Mango Pickle', file: 'North Indian mango pickle marinated in mustard oil and mixed with Indian spices.JPG' },
  { id: 'ZNw3ATTd2lVKF6HgGe2w', name: 'Amla Pickle', file: 'Amla (1).jpg' },
  { id: 'eKuEfAZWG5k49v0AOWsK', name: 'Mixed Vegetable Pickle', file: 'Vegetables 3.jpg' },
  { id: 'aa3l8Bq3KKFK1JUOtNfm', name: 'Mixed Leafy Pickle', file: 'Green Leafy Vegetables.jpg' },
  { id: 'nUtrGfdyHQJ01sGGk8hc', name: 'Lemon Pickle', file: 'Kagati Ko Nimki.jpg' },
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

  for (const p of PRODUCTS) {
    const sourceUrl = await getCommonsImageUrl(p.file);
    const { buffer, contentType } = await fetchBuffer(sourceUrl);
    const ext = (sourceUrl.split('.').pop() || 'jpg').split('?')[0].toLowerCase();
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
