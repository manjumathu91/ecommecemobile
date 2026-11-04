# Velora E-Commerce Backend (Django + DRF)

Django 4.2 · Django REST Framework · JWT · MySQL · Razorpay · Groq AI assistant · custom **Velora Admin** (`ShopAdminSite`).

## Local setup
```bash
python -m venv venv
venv\Scripts\activate            # Windows   (macOS/Linux: source venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env           # then fill in your own values (never commit .env)
python manage.py migrate         # applies only unapplied migrations; never deletes data
python manage.py setup_roles     # creates the staff groups (see below)
python manage.py createsuperuser
python manage.py runserver
```
Admin: http://127.0.0.1:8000/admin/ · API root: `/api/`

## Staff roles (`setup_roles`)
| Group | Access |
|---|---|
| Order Manager | view + update orders, view payments/customers |
| Catalog Manager | products, categories, banners, coupons |
| Support (read-only) | view orders, customers, payments |

Superusers can do everything. Give a staff member `is_staff` plus a group.

## Order management
Normal e-commerce customer orders only, built on the existing `Order` / `OrderItem` models and `orders.services`.
* **Admin > Orders**: customer name/email/phone, items, total, payment method/status, coloured order status, date;
  search (order no., customer, phone, product name); filters (status, payment method/status, date) plus date drill-down;
  the order page shows customer, shipping address, ordered products, amounts/GST, payment records, status history,
  a **status update form**, and a link to the customer's complete order history.
* **Admin > Customers** shows order counts and an order-history link.
* **Staff API** (`is_staff` + `view_order` / `change_order`): `GET /api/admin/orders/`
  (`?search= &status= &payment_status= &payment_method= &date_from=YYYY-MM-DD &date_to= &user=<id> &ordering=`),
  `GET /api/admin/orders/{id}/`, `POST /api/admin/orders/{id}/status/` with `{"status":"SHIPPED","note":""}`,
  `GET /api/admin/orders/{id}/history/`.
* **Customer API** (URLs unchanged): `/api/orders/` also accepts `?search= &status= &date_from= &date_to=`.
* Status changes always go through `orders/services.py` (`advance_status`, `cancel_order`, `revert_status`):
  forward-only flow for normal moves, stock and coupon restore on cancel, COD marked paid on delivery, customer notification.
* **Backward moves** (e.g. Shipped -> Processing): only authenticated admins (superusers, or staff with the
  `orders.change_order` permission); a **reason is mandatory**; any earlier status of the delivery flow is allowed;
  cancelled orders are final. Enforced in `revert_status` (so admin page, staff API and any caller share it). Customers
  and non-admin staff are refused (403). Moving a COD order back from Delivered reopens its cash payment as pending.
  API: `POST /api/admin/orders/{id}/status/` with `{"status":"PROCESSING","reason":"..."}`.
* Each status change is saved in the order status history with the admin's user ID, previous status, new status,
  reason/note and timestamp; the full history is shown on the Django admin order page. Customers never see the internal reason.

## Dashboard definitions
Sales = value of placed orders (excludes cancelled / awaiting payment). Revenue = orders with payment status **Paid**
(online payments received plus delivered COD). All numbers come from database queries (`core/dashboard.py`).

## Tests
```bash
DB_ENGINE=sqlite AUTH_THROTTLE=1000/min DJANGO_SECRET_KEY=test python manage.py test
```
(On Windows set those variables first.) Razorpay and Groq are mocked; no external service is called.

## Deploy on Render
1. Push the project to Git (`.env` is git-ignored).
2. Create a Web Service (or use `render.yaml`): Build `./build.sh`, Start `gunicorn config.wsgi:application`.
3. Set the variables from `.env.example` (`DJANGO_DEBUG=False`, `DJANGO_ALLOWED_HOSTS`,
   `CSRF_TRUSTED_ORIGINS=https://<your-app>.onrender.com`, DB_*, keys).
4. After the first deploy run `python manage.py setup_roles` and `createsuperuser` in the Render shell.
5. Once HTTPS works you may add `SECURE_SSL_REDIRECT=True` and `SECURE_HSTS_SECONDS=31536000`.

Uploaded images (`media/`) live on the instance disk; use a Render persistent disk or object storage to keep them.

## Safe migrations
Two migrations are new in this update; both only add optional columns and never touch existing rows:
* `addresses/0002_address_latitude_longitude` - GPS `latitude` / `longitude` on addresses (`DecimalField(9, 6)`, optional).
  It adds the columns only if they are missing, so a database that already has them (from an earlier version) is not
  changed and does not fail with a duplicate-column error.
* `orders/0003_orderstatushistory_previous_status` - optional `previous_status` column on the status history table.

If you already have your own address GPS migration file (a different name), delete
`addresses/0002_address_latitude_longitude.py` and keep yours so the history has one such migration only.
Back up the database first and only use `python manage.py migrate` (never `flush`, `reset_db` or `migrate <app> zero`).
