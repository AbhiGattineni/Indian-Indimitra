// Firebase initialization. Reads config from .env (VITE_* vars).
// See .env.example for the keys you need to supply from the Firebase console.
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  // GA4 Measurement ID. Not secret (it ships in the client bundle for every
  // GA-enabled site), so we keep a hardcoded fallback to guarantee analytics
  // works in production even if the CI build doesn't inject the env var.
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-7WKWLDE7NN',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Google Analytics (GA4). Guarded by isSupported() so it no-ops in environments
// that can't run it (SSR, some in-app browsers). With enhanced measurement on
// the GA4 web stream, this auto-collects page_view + SPA route changes.
export let analytics = null;
isSupported()
  .then((ok) => { if (ok) analytics = getAnalytics(app); })
  .catch(() => {});

export default app;
