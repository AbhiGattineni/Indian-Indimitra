// Authentication helpers: Google + Email/Password sign-in.
// On first sign-in we create the user's Firestore profile with role "customer".
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from './config';
import { ROLES, SUPER_ADMIN_EMAIL } from '../lib/constants';
import { isSuspiciousEmail } from '../lib/emailSafety';

// Thrown for addresses that look like bot sign-ups (see lib/emailSafety).
function rejectSuspicious(email) {
  if (isSuspiciousEmail(email)) {
    const e = new Error('This email address cannot be used here.');
    e.code = 'app/suspicious-email';
    throw e;
  }
}

// Ensure a users/{uid} document exists. Self-created profiles are always
// "customer" EXCEPT the hardcoded super-admin email, which self-promotes to
// "admin" on first sign-in — mirrored (and enforced) in firestore.rules, not
// just here, so this isn't a client-trust shortcut.
export async function ensureUserProfile(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;

  if (!snap.exists()) {
    const role = isSuperAdmin ? ROLES.ADMIN : ROLES.CUSTOMER;
    await setDoc(ref, {
      email: user.email || '',
      displayName: user.displayName || '',
      phone: user.phoneNumber || '',
      role,
      createdAt: serverTimestamp(),
    });
    return { email: user.email, displayName: user.displayName, role };
  }

  // Repair path: if the super-admin account was created before this email was
  // hardcoded (or was demoted by mistake), promote it back on next sign-in.
  const data = snap.data();
  if (isSuperAdmin && data.role !== ROLES.ADMIN) {
    await updateDoc(ref, { role: ROLES.ADMIN });
    return { ...data, role: ROLES.ADMIN };
  }
  return data;
}

export async function signInWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  await ensureUserProfile(cred.user);
  return cred.user;
}

// Phone keyboards often capitalise the first letter or add a trailing space.
const cleanEmail = (email) => (email || '').trim().toLowerCase();

export async function signInWithEmail(email, password) {
  rejectSuspicious(email);
  const cred = await signInWithEmailAndPassword(auth, cleanEmail(email), password);
  await ensureUserProfile(cred.user);
  return cred.user;
}

export async function registerWithEmail(email, password, displayName) {
  rejectSuspicious(email);
  const cred = await createUserWithEmailAndPassword(auth, cleanEmail(email), password);
  if (displayName) await updateProfile(cred.user, { displayName });
  // Orders need a verified email (firestore.rules) -- send the link now.
  try { await sendEmailVerification(cred.user); } catch (e) { console.warn('Verification email failed', e); }
  await ensureUserProfile(cred.user);
  return cred.user;
}

// Also how someone who signed up with Google sets a password for email login.
export function resetPassword(email) {
  return sendPasswordResetEmail(auth, cleanEmail(email));
}

export function resendVerificationEmail() {
  return auth.currentUser ? sendEmailVerification(auth.currentUser) : Promise.resolve();
}

// After the customer clicks the link: reload the account and refresh the ID
// token so the new email_verified flag reaches the security rules.
export async function refreshEmailVerified() {
  const u = auth.currentUser;
  if (!u) return false;
  await u.reload();
  if (auth.currentUser.emailVerified) await auth.currentUser.getIdToken(true);
  return auth.currentUser.emailVerified;
}

export function signOut() {
  return fbSignOut(auth);
}
