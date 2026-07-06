// Authentication helpers: Google + Email/Password sign-in.
// On first sign-in we create the user's Firestore profile with role "customer".
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from './config';
import { ROLES, SUPER_ADMIN_EMAIL } from '../lib/constants';

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

export async function signInWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserProfile(cred.user);
  return cred.user;
}

export async function registerWithEmail(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) await updateProfile(cred.user, { displayName });
  await ensureUserProfile(cred.user);
  return cred.user;
}

export function signOut() {
  return fbSignOut(auth);
}
