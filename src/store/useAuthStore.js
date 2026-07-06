// Global auth state. Subscribes to Firebase auth and loads the Firestore
// profile (which carries the role). Call initAuthListener() once at app start.
import { create } from 'zustand';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';
import { getUserProfile } from '../firebase/db';

export const useAuthStore = create((set) => ({
  user: null, // Firebase auth user
  profile: null, // Firestore users/{uid} doc (has role)
  loading: true,

  setProfile: (profile) => set({ profile }),

  initAuthListener: () => {
    return onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const profile = await getUserProfile(fbUser.uid);
        set({ user: fbUser, profile, loading: false });
      } else {
        set({ user: null, profile: null, loading: false });
      }
    });
  },

  refreshProfile: async () => {
    const fbUser = auth.currentUser;
    if (!fbUser) return null;
    const profile = await getUserProfile(fbUser.uid);
    set({ profile });
    return profile;
  },
}));
