// Syncs the cart to the signed-in user's Firestore doc so it follows them
// across browsers/devices: loads their saved cart once on login (the
// account's cart wins over whatever was in a guest session), persists every
// change while signed in, and clears the in-memory cart on sign-out so it
// doesn't leak into the next person's session on a shared device.
import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import { getCart, saveCart } from '../firebase/db';

export function useCartSync() {
  const { user, loading } = useAuthStore();
  const { storeId, storeName, items, hydrate, clear } = useCartStore();
  const readyForUid = useRef(null);
  const prevUid = useRef(undefined);

  useEffect(() => {
    if (loading) return;
    if (user) {
      if (readyForUid.current !== user.uid) {
        let cancelled = false;
        (async () => {
          const cart = await getCart(user.uid);
          if (cancelled) return;
          if (cart) hydrate(cart);
          readyForUid.current = user.uid;
        })();
        prevUid.current = user.uid;
        return () => { cancelled = true; };
      }
    } else {
      if (prevUid.current) clear(); // was signed in, now signed out
      readyForUid.current = null;
      prevUid.current = null;
    }
  }, [user, loading, hydrate, clear]);

  useEffect(() => {
    if (!user || readyForUid.current !== user.uid) return;
    saveCart(user.uid, { storeId, storeName, items }).catch(() => {});
  }, [user, storeId, storeName, items]);
}
