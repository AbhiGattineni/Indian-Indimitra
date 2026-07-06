# Seller Marketplace (React + Firebase, COD-only)

A listing + coordination marketplace: sellers list products, customers order (Cash on Delivery),
sellers ship via any courier and enter a tracking number. Admin approves sellers and sets commission.
No custom backend — the app talks to **Firebase** (Auth + Firestore + Storage) directly, and
**Firestore Security Rules** are the enforcement layer.

## Tech
React (Vite) · Material-UI · React Router · Zustand · Firebase Auth (Google + Email/Password) ·
Cloud Firestore · Firebase Storage.

## 1. Install
```bash
npm install
```

## 2. Create a Firebase project
1. Go to <https://console.firebase.google.com> → **Add project**.
2. **Build → Authentication → Get started** → enable **Google** and **Email/Password** providers.
3. **Build → Firestore Database → Create database** (start in production mode).
4. **Build → Storage → Get started**.
5. **Project settings → General → Your apps → Web app (</>)** → register an app and copy the
   `firebaseConfig` values.

## 3. Configure env
```bash
cp .env.example .env
```
Fill `.env` with the values from step 2's `firebaseConfig`.

## 4. Deploy security rules
Install the CLI once (`npm i -g firebase-tools`), then:
```bash
firebase login
firebase use --add            # pick your project
firebase deploy --only firestore:rules,storage
```
> Until you deploy `firestore.rules`, the default rules will block all reads/writes.

## 5. Run
```bash
npm run dev
```
Open <http://localhost:3000>.

## 6. Make yourself admin (one-time bootstrap)
There is no backend to set roles, so bootstrap the first admin by hand:
1. Sign in once (Google or email) — this creates `users/{your-uid}` with `role: "customer"`.
2. In the Firebase console → **Firestore → users → your doc**, change `role` to `admin`.
3. Refresh the app. You now see the **Admin** menu.

From then on, admins approve sellers and can change any user's role in the UI.

## Roles & flow
- **Customer** → browse → cart → checkout (COD) → track orders. Can apply to **become a seller**.
- **Seller** (a customer whose store an admin approved) → create listings → receive orders →
  accept → ship (enter courier + tracking) → mark delivered.
- **Admin** → approve/reject sellers, manage categories, set commission/tax, view all orders & users.

## Data model (Firestore)
`users/{uid}` (+ `addresses`, `cart` subcollections) · `stores/{id}` · `categories/{id}` ·
`products/{id}` · `orders/{id}` · `platformConfig/global`. See `../Firebase_React_Implementation_Plan.md`.

## Local testing without a cloud project (optional)
```bash
npm run emulators   # requires firebase-tools; runs Auth+Firestore+Storage locally
```
(You'd then point the SDK at the emulators — not wired by default.)

## Notes / next steps
- **Payments are intentionally omitted** — every order is Cash on Delivery.
- Email notifications are deferred (would require Cloud Functions, i.e. a backend).
- Security rules are v1 — review `firestore.rules` before any real launch and test with the emulator.
