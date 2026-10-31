# Shop - React Native (Expo + TypeScript) app - Phase 3

Talks only to the Django API in `../backend` (no hard-coded products, no fake responses).

## Run
```
cd mobile
npm install
npx expo install --fix            # aligns every Expo/React Native package to your installed SDK (package.json targets SDK 54)
cp .env.example .env              # set EXPO_PUBLIC_API_URL (Android emulator: http://10.0.2.2:8000/api, phone: http://<PC-LAN-IP>:8000/api)
npx expo run:android              # development build (needed for Razorpay); or `npx expo start` + Expo Go for everything except online payment
```
* **Expo Go** works for browsing, cart, wishlist, addresses, COD, orders, tracking. **Online payment needs a development build** because `react-native-razorpay` is a native module; in Expo Go the app says so and offers COD.
* Push notifications need an EAS project id (`eas init`, then `extra.eas.projectId` in app.json). Without it the app silently skips push; in-app notifications still work.
* Backend must be running and reachable from the device (`DJANGO_ALLOWED_HOSTS` includes your IP; `runserver 0.0.0.0:8000`).

## Structure
`src/api` (Axios client with token-refresh/retry interceptors + typed services) - `src/context` (auth, cart, wishlist, toast) - `src/hooks` - `src/navigation` - `src/screens` (auth, shop, account, orders) - `src/components` (reusable UI) - `src/services` (Razorpay flow, push) - `src/validation` (Zod) - `src/types` - `src/utils`.

## What is implemented (Phase 3)
Splash, onboarding (skip / get started), register/login/logout, forgot + reset password, session persistence (tokens in SecureStore), protected routes,
home (auto-sliding banners, categories, featured / offers / latest / best sellers / recommended / recently viewed), product list (sort, price + stock filters, pagination, pull-to-refresh),
search (debounced suggestions, recent searches, no-results), product detail (image gallery, accordions, reviews, write review, related), wishlist, cart (quantity, stock limits, totals),
address CRUD with default, checkout (address, payment method, coupon, summary), Razorpay + COD, payment success / failure / cancelled / pending / retry, order history + detail + cancel + invoice PDF + live tracking timeline,
notifications (list, read, unread badge), payment history, profile edit, change password.

## Payment flow (security)
The app never decides a payment succeeded: it opens Razorpay Checkout with data from the server, sends the result to `/payments/verify/`, and shows what the server confirms. The Razorpay secret is never in the app.

## NOT done yet (Phase 4)
Pinch-to-zoom gallery, swipe-to-remove, animated badge / price tick / checkout progress / bottom sheets, reduced-motion handling, skeletons on every screen, final documentation + screenshots + final ZIP.
Not verified: nothing has been run on a device or emulator (see root README "Verification").
