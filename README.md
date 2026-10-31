# E-Commerce Mobile App - Backend (Phases 1 + 2)

**Status:** backend code complete for Phases 1-2. The mobile app (React Native) is Phase 3-4 and is **not included yet**.
**Nothing here has been executed by the author** (no Django/MySQL/Razorpay in the authoring sandbox): code compiles and the
invoice PDF renderer was run, but the test-suite, migrations and the Razorpay flow must be run by you. See "Verification checklist".

## Setup
```
cd backend
python -m venv venv && source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                    # DB credentials, DJANGO_SECRET_KEY, Razorpay keys
# MySQL:  CREATE DATABASE ecommerce_db CHARACTER SET utf8mb4;
python manage.py makemigrations accounts categories products cart wishlist addresses coupons orders payments notifications reviews
python manage.py migrate
python manage.py setup_roles          # creates Catalog Manager / Order Manager / Support groups
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```
Migrations are not shipped (could not be generated without Django). Commit them after generating.

## Verification checklist (do this before Phase 3)
1. `DB_ENGINE=sqlite AUTH_THROTTLE=1000/min DJANGO_SECRET_KEY=test python manage.py test`  -> report any failure.
2. `makemigrations` + `migrate` against MySQL succeed.
3. Log in to `/admin/`, add a category, a product with an image, a coupon; open the dashboard.
4. Razorpay test mode (below): one successful, one failed, one cancelled payment.

## API summary
| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register/ login/ logout/ token/refresh/ forgot-password/ reset-password/ change-password/`, `GET/PATCH /api/auth/profile/` |
| Catalog | `GET /api/products/` (`search, category, min_price, max_price, in_stock, featured, ordering, page`), `/api/products/<id>/`, `/api/categories/`, `/api/banners/` |
| Wishlist | `GET /api/wishlist/`, `POST add/ remove/` |
| Cart | `GET /api/cart/`, `POST add/ update/ remove/ merge/` |
| Addresses | CRUD `/api/addresses/`, `/api/addresses/<id>/` |
| Coupons | `POST /api/coupons/validate/ {code}` |
| Checkout | `POST /api/checkout/summary/ {coupon_code?}`, `POST /api/checkout/ {address_id, payment_method: COD|RAZORPAY, coupon_code?}` |
| Orders | `GET /api/orders/`, `/api/orders/<id>/`, `POST .../cancel/`, `GET .../tracking/`, `GET .../invoice/` (PDF) |
| Payments | `POST /api/payments/create-order/ {order_id}`, `POST verify/`, `POST report/ {razorpay_order_id, outcome}`, `POST webhook/`, `GET /api/payments/` |
| Notifications | `GET /api/notifications/` (+`unread_count`), `POST <id>/read/`, `POST read-all/`, `POST device-token/` |
| Reviews | `GET/POST/DELETE /api/products/<id>/reviews/` (POST only after the product was delivered to you) |

Errors always look like `{"success": false, "error": {"code", "message", "details"}}`.

## Order & payment design
* **Checkout** runs in one DB transaction: locks product rows, re-validates stock/coupon, snapshots address and prices, decrements stock (logged in `StockMovement`), clears the cart.
* **COD** -> order `PLACED`. Payment is marked paid automatically when the admin marks the order `DELIVERED`.
* **Razorpay** -> order `PENDING_PAYMENT` (stock is held) -> `create-order` -> app opens Razorpay Checkout -> app sends the result to `verify`.
  The server checks the HMAC signature, then **fetches the payment from Razorpay** and checks order id, amount, currency and `captured` status. The client is never trusted.
  `report` can only mark an attempt cancelled/failed, never paid. Retry reuses the same Razorpay order.
* **Webhook** (`payment.captured`, `order.paid`, `payment.failed`): raw-body HMAC check, de-duplicated by event id (`WebhookEvent`), amount-validated.
* **Unpaid orders** hold stock; cancel them with `python manage.py expire_pending_orders --minutes 30` (run from cron every 5 min).
* **Late payment on a cancelled/expired order** keeps it cancelled and sets `REFUND_PENDING`; staff use the admin action "Refund via Razorpay".
* Cancelling is allowed up to `PROCESSING`; it restocks items and releases the coupon use.

## Razorpay setup (test mode)
1. Razorpay Dashboard -> Test Mode -> Settings -> API Keys -> generate. Put `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `backend/.env` only.
2. Webhooks -> add `https://<public-url>/api/payments/webhook/` (use ngrok locally), secret = `RAZORPAY_WEBHOOK_SECRET`, events: `payment.captured`, `payment.failed`, `order.paid`.
3. The mobile app receives only `key_id`; the secret never leaves the server.

## Admin panel
`/admin/` -> dashboard (sales, revenue, orders by state, customers, low stock, recent orders, daily/weekly/monthly sales, best sellers).
Orders are read-only; change state with actions (confirm -> ... -> delivered, cancel, refund) so stock, history and notifications stay consistent.
Roles: run `setup_roles`, then add staff users to a group. Sales figures are shown only to users who can view orders.
Definitions: *sales* = placed orders not cancelled; *revenue* = orders with payment received.

## Known limitations
* Push notifications use Expo's push service from a background thread (best effort); in-app notifications are the source of truth.
* Dashboard buckets sales in Python over the last ~190 days (avoids MySQL time-zone tables); fine for a demo, would need DB aggregation at scale.
* Password-reset email goes to the console backend by default; configure SMTP via `EMAIL_BACKEND` settings for real emails.
* Refund action and live Razorpay calls are unverified against the real gateway.
