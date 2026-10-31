"""Phase 2 tests (orders, coupons, Razorpay, webhooks, notifications, reviews, admin dashboard).
Run: DB_ENGINE=sqlite AUTH_THROTTLE=1000/min DJANGO_SECRET_KEY=test python manage.py test
Razorpay's network API is replaced by a fake client; signatures are computed with the real HMAC algorithm."""
import hashlib
import hmac
import json
from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from addresses.models import Address
from categories.models import Category
from coupons.models import Coupon
from notifications.models import Notification
from orders.models import Order, OrderStatus, PaymentStatus, StockMovement
from orders.services import advance_status
from payments.models import Payment, PaymentRecordStatus, WebhookEvent
from products.models import Product

User = get_user_model()
PW = "Str0ng!Passw0rd"
KEY_SECRET, WH_SECRET = "test_key_secret", "test_webhook_secret"
RZP = dict(RAZORPAY_KEY_ID="rzp_test_x", RAZORPAY_KEY_SECRET=KEY_SECRET, RAZORPAY_WEBHOOK_SECRET=WH_SECRET)


def sign(order_id, payment_id):
    return hmac.new(KEY_SECRET.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()


class FakeRazorpay:
    def __init__(self, payment=None):
        self.payment_data = payment or {}
        self.order = mock.Mock()
        self.order.create.side_effect = lambda d: {"id": "order_" + d["receipt"]}
        self.payment = mock.Mock()
        self.payment.fetch.side_effect = lambda pid: dict(self.payment_data, id=pid)




class Base(APITestCase):
    def setUp(self):
        cat = Category.objects.create(name="Phones")

        self.p1 = Product.objects.create(
            category=cat,
            name="Alpha",
            price=Decimal("1000"),
            discount_price=Decimal("800"),
            stock=5,
        )

        self.p2 = Product.objects.create(
            category=cat,
            name="Cheap",
            price=Decimal("100"),
            stock=10,
        )

        self.user = User.objects.create_user(
            "a@x.com",
            PW,
            first_name="A",
            email_verified=True,
        )

        self.addr = Address.objects.create(
            user=self.user,
            full_name="A B",
            phone="9876543210",
            house_number="1",
            street="Main",
            city="Chennai",
            state="TN",
            postal_code="600001",
            is_default=True,
        )

        self.login(self.user)

    def login(self, user):
        self.client.credentials()

        if not user.email_verified:
            user.email_verified = True
            user.save(update_fields=["email_verified"])

        response = self.client.post(
            "/api/auth/login/",
            {
                "email": user.email,
                "password": PW,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
            f"Login failed: {response.data}",
        )

        self.assertIn("access", response.data)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['access']}"
        )

    def add(self, product, qty=1):
        self.client.post(
            "/api/cart/add/",
            {
                "product_id": product.id,
                "quantity": qty,
            },
        )

    def checkout(self, method="COD", **extra):
        return self.client.post(
            "/api/checkout/",
            {
                "address_id": self.addr.id,
                "payment_method": method,
                **extra,
            },
        )


class CouponTests(Base):
    def coupon(self, **kw):
        now = timezone.now()
        d = dict(code="SAVE10", discount_type="PERCENT", value=10, valid_from=now - timedelta(days=1), valid_to=now + timedelta(days=1))
        return Coupon.objects.create(**{**d, **kw})

    def test_validate_percent_with_cap(self):
        self.coupon(max_discount=Decimal("50"))
        self.add(self.p1, 2)  # 1600
        r = self.client.post("/api/coupons/validate/", {"code": "save10"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["discount"], Decimal("50.00"))  # 10% = 160, capped at 50

    def test_invalid_expired_min_order(self):
        self.add(self.p2, 1)
        self.assertEqual(self.client.post("/api/coupons/validate/", {"code": "NOPE"}).status_code, 400)
        self.coupon(code="OLD", valid_to=timezone.now() - timedelta(hours=1))
        self.assertEqual(self.client.post("/api/coupons/validate/", {"code": "OLD"}).status_code, 400)
        self.coupon(code="BIG", min_order_amount=Decimal("5000"))
        self.assertEqual(self.client.post("/api/coupons/validate/", {"code": "BIG"}).status_code, 400)

    def test_per_user_limit_and_restore_on_cancel(self):
        c = self.coupon()
        self.add(self.p1, 1)
        order = self.checkout(coupon_code="SAVE10").data
        c.refresh_from_db()
        self.assertEqual(c.used_count, 1)
        self.add(self.p1, 1)
        self.assertEqual(self.client.post("/api/coupons/validate/", {"code": "SAVE10"}).status_code, 400)
        self.client.post(f"/api/orders/{order['id']}/cancel/")
        c.refresh_from_db()
        self.assertEqual(c.used_count, 0)
        self.assertEqual(self.client.post("/api/coupons/validate/", {"code": "SAVE10"}).status_code, 200)


class CheckoutCodTests(Base):
    def test_cod_order_totals_stock_cart_and_notification(self):
        self.add(self.p1, 2)  # 1600 -> free delivery
        r = self.checkout("COD")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual((r.data["status"], r.data["payment_status"], r.data["total_amount"]), ("PLACED", "PENDING", "1600.00"))
        self.p1.refresh_from_db()
        self.assertEqual((self.p1.stock, self.p1.sold_count), (3, 2))
        self.assertEqual(self.client.get("/api/cart/").data["item_count"], 0)
        self.assertTrue(Notification.objects.filter(user=self.user, type="ORDER").exists())
        self.assertTrue(StockMovement.objects.filter(product=self.p1, change=-2).exists())

    def test_delivery_charge_below_threshold(self):
        self.add(self.p2, 1)  # 100 < 500
        self.assertEqual(self.client.post("/api/checkout/summary/", {}).data["delivery_charge"], Decimal("40"))

    def test_price_snapshot_survives_price_change(self):
        self.add(self.p1, 1)
        oid = self.checkout().data["id"]
        Product.objects.filter(pk=self.p1.pk).update(price=Decimal("9999"), discount_price=None)
        item = self.client.get(f"/api/orders/{oid}/").data["items"][0]
        self.assertEqual(item["unit_price"], "800.00")

    def test_empty_cart_and_foreign_address_rejected(self):
        self.assertEqual(self.checkout().status_code, 400)
        other = User.objects.create_user("b@x.com", PW, first_name="B")
        foreign = Address.objects.create(user=other, full_name="B", phone="9876543210", house_number="1", street="S", city="C", state="S", postal_code="600001")
        self.add(self.p2, 1)
        r = self.client.post("/api/checkout/", {"address_id": foreign.id, "payment_method": "COD"})
        self.assertEqual(r.status_code, 400)

    def test_stock_changed_after_adding_to_cart(self):
        self.add(self.p1, 4)
        Product.objects.filter(pk=self.p1.pk).update(stock=2)
        self.assertEqual(self.checkout().status_code, 400)

    def test_cancel_restores_stock_and_blocks_after_shipping(self):
        self.add(self.p1, 2)
        oid = self.checkout().data["id"]
        r = self.client.post(f"/api/orders/{oid}/cancel/")
        self.assertEqual(r.data["status"], "CANCELLED")
        self.p1.refresh_from_db()
        self.assertEqual((self.p1.stock, self.p1.sold_count), (5, 0))
        self.assertEqual(self.client.post(f"/api/orders/{oid}/cancel/").status_code, 400)  # already cancelled
        self.add(self.p1, 1)
        oid2 = self.checkout().data["id"]
        advance_status(oid2, "CONFIRMED"); advance_status(oid2, "PROCESSING"); advance_status(oid2, "SHIPPED")
        self.assertEqual(self.client.post(f"/api/orders/{oid2}/cancel/").status_code, 400)

    def test_tracking_timeline_and_forward_only_flow(self):
        self.add(self.p1, 1)
        oid = self.checkout().data["id"]
        advance_status(oid, "CONFIRMED")
        t = self.client.get(f"/api/orders/{oid}/tracking/").data
        self.assertEqual([s["completed"] for s in t["stages"]], [True, True, False, False, False, False])
        with self.assertRaises(Exception):
            advance_status(oid, "PLACED")
        advance_status(oid, "DELIVERED")
        order = Order.objects.get(pk=oid)
        self.assertEqual(order.payment_status, PaymentStatus.PAID)  # COD collected on delivery
        self.assertTrue(Notification.objects.filter(user=self.user, type="DELIVERY").exists())

    def test_orders_are_isolated_between_users(self):
        self.add(self.p1, 1)
        oid = self.checkout().data["id"]
        other = User.objects.create_user("b@x.com", PW, first_name="B")
        self.login(other)
        self.assertEqual(self.client.get(f"/api/orders/{oid}/").status_code, 404)
        self.assertEqual(self.client.post(f"/api/orders/{oid}/cancel/").status_code, 404)
        self.assertEqual(self.client.get("/api/orders/").data["count"], 0)

    def test_invoice_pdf(self):
        self.add(self.p1, 1)
        oid = self.checkout().data["id"]
        r = self.client.get(f"/api/orders/{oid}/invoice/")
        self.assertEqual((r.status_code, r["Content-Type"]), (200, "application/pdf"))
        self.assertTrue(r.content.startswith(b"%PDF"))


@override_settings(**RZP)
class RazorpayTests(Base):
    def start(self):
        self.add(self.p1, 1)
        order = self.checkout("RAZORPAY").data
        self.assertEqual(order["status"], "PENDING_PAYMENT")
        with mock.patch("payments.services.razorpay_client", return_value=FakeRazorpay()):
            r = self.client.post("/api/payments/create-order/", {"order_id": order["id"]})
        self.assertEqual(r.status_code, 200, r.content)
        return order, r.data

    def gateway(self, rp_order, amount, status="captured", **kw):
        return FakeRazorpay({"order_id": rp_order, "amount": amount, "currency": "INR", "status": status, "method": "upi", **kw})

    def verify(self, rp_order, pid="pay_1", signature=None, gw=None):
        with mock.patch("payments.services.razorpay_client", return_value=gw):
            return self.client.post("/api/payments/verify/", {
                "razorpay_order_id": rp_order, "razorpay_payment_id": pid, "razorpay_signature": signature or sign(rp_order, pid)})

    def test_create_order_never_exposes_secret(self):
        _, data = self.start()
        self.assertEqual(data["amount"], 80000)  # paise
        self.assertNotIn(KEY_SECRET, json.dumps(data))
        self.assertEqual(data["key_id"], "rzp_test_x")

    def test_successful_payment(self):
        order, data = self.start()
        r = self.verify(data["razorpay_order_id"], gw=self.gateway(data["razorpay_order_id"], 80000))
        self.assertEqual((r.status_code, r.data["status"]), (200, "success"))
        o = Order.objects.get(pk=order["id"])
        self.assertEqual((o.status, o.payment_status), (OrderStatus.PLACED, PaymentStatus.PAID))
        self.assertTrue(Notification.objects.filter(user=self.user, type="PAYMENT").exists())

    def test_invalid_signature_changes_nothing(self):
        order, data = self.start()
        r = self.verify(data["razorpay_order_id"], signature="0" * 64, gw=self.gateway(data["razorpay_order_id"], 80000))
        self.assertEqual(r.status_code, 400)
        self.assertEqual(Order.objects.get(pk=order["id"]).status, OrderStatus.PENDING_PAYMENT)

    def test_amount_mismatch_rejected(self):
        order, data = self.start()
        r = self.verify(data["razorpay_order_id"], gw=self.gateway(data["razorpay_order_id"], 100))  # paid only Rs 1
        self.assertEqual(r.status_code, 400)
        self.assertEqual(Order.objects.get(pk=order["id"]).payment_status, PaymentStatus.PENDING)

    def test_duplicate_callback_is_idempotent(self):
        order, data = self.start()
        gw = self.gateway(data["razorpay_order_id"], 80000)
        self.verify(data["razorpay_order_id"], gw=gw)
        r = self.verify(data["razorpay_order_id"], gw=gw)
        self.assertEqual((r.status_code, r.data["status"]), (200, "success"))
        self.assertEqual(Notification.objects.filter(user=self.user, type="PAYMENT").count(), 1)

    def test_pending_then_gateway_failed_then_retry(self):
        order, data = self.start()
        rp = data["razorpay_order_id"]
        self.assertEqual(self.verify(rp, gw=self.gateway(rp, 80000, status="authorized")).status_code, 202)
        r = self.verify(rp, pid="pay_2", gw=self.gateway(rp, 80000, status="failed", error_description="Card declined"))
        self.assertEqual(r.data["status"], "failed")
        self.assertEqual(Order.objects.get(pk=order["id"]).payment_status, PaymentStatus.FAILED)
        with mock.patch("payments.services.razorpay_client", return_value=FakeRazorpay()):
            retry = self.client.post("/api/payments/create-order/", {"order_id": order["id"]}).data
        self.assertEqual(retry["razorpay_order_id"], rp)  # same Razorpay order is reused
        self.assertEqual(Payment.objects.filter(order_id=order["id"]).count(), 1)
        self.assertEqual(self.verify(rp, pid="pay_3", gw=self.gateway(rp, 80000)).data["status"], "success")

    def test_client_cannot_mark_paid_via_report_endpoint(self):
        order, data = self.start()
        r = self.client.post("/api/payments/report/", {"razorpay_order_id": data["razorpay_order_id"], "outcome": "cancelled"})
        self.assertEqual(r.data["status"], PaymentRecordStatus.CANCELLED)
        self.assertEqual(Order.objects.get(pk=order["id"]).payment_status, PaymentStatus.PENDING)

    def test_cannot_verify_another_users_payment(self):
        order, data = self.start()
        self.login(User.objects.create_user("b@x.com", PW, first_name="B"))
        r = self.verify(data["razorpay_order_id"], gw=self.gateway(data["razorpay_order_id"], 80000))
        self.assertEqual(r.status_code, 404)

    def test_cancel_unpaid_online_order_restores_stock(self):
        order, _ = self.start()
        self.client.post(f"/api/orders/{order['id']}/cancel/")
        self.p1.refresh_from_db()
        self.assertEqual(self.p1.stock, 5)

    def test_expire_command_cancels_stale_unpaid_orders(self):
        from django.core.management import call_command
        order, _ = self.start()
        Order.objects.filter(pk=order["id"]).update(created_at=timezone.now() - timedelta(hours=1))
        call_command("expire_pending_orders", minutes=30)
        self.assertEqual(Order.objects.get(pk=order["id"]).status, OrderStatus.CANCELLED)

    def test_paid_order_cancel_flags_refund(self):
        order, data = self.start()
        self.verify(data["razorpay_order_id"], gw=self.gateway(data["razorpay_order_id"], 80000))
        r = self.client.post(f"/api/orders/{order['id']}/cancel/")
        self.assertEqual(r.data["payment_status"], PaymentStatus.REFUND_PENDING)

    # ---- webhooks
    def post_webhook(self, body, signature=None, event_id="evt_1"):
        raw = json.dumps(body).encode()
        sig = signature or hmac.new(WH_SECRET.encode(), raw, hashlib.sha256).hexdigest()
        self.client.credentials()  # webhook carries no JWT
        return self.client.generic("POST", "/api/payments/webhook/", raw, content_type="application/json",
                                   HTTP_X_RAZORPAY_SIGNATURE=sig, HTTP_X_RAZORPAY_EVENT_ID=event_id)

    def event(self, rp, amount, name="payment.captured", status="captured"):
        return {"event": name, "payload": {"payment": {"entity": {"id": "pay_w1", "order_id": rp, "amount": amount, "currency": "INR", "status": status, "method": "card"}}}}

    def test_webhook_bad_signature_rejected(self):
        order, data = self.start()
        r = self.post_webhook(self.event(data["razorpay_order_id"], 80000), signature="bad")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(Order.objects.get(pk=order["id"]).payment_status, PaymentStatus.PENDING)

    def test_webhook_confirms_payment_and_duplicate_is_ignored(self):
        order, data = self.start()
        ev = self.event(data["razorpay_order_id"], 80000)
        self.assertEqual(self.post_webhook(ev).data["result"], "success")
        self.assertEqual(self.post_webhook(ev).data["result"], "duplicate")
        self.assertEqual(WebhookEvent.objects.count(), 1)
        self.assertEqual(Order.objects.get(pk=order["id"]).status, OrderStatus.PLACED)
        self.assertEqual(Notification.objects.filter(user=self.user, type="PAYMENT").count(), 1)

    def test_webhook_amount_mismatch_not_applied(self):
        order, data = self.start()
        r = self.post_webhook(self.event(data["razorpay_order_id"], 1))
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["result"].startswith("rejected"))
        self.assertEqual(Order.objects.get(pk=order["id"]).payment_status, PaymentStatus.PENDING)

    def test_late_payment_after_expiry_flags_refund(self):
        order, data = self.start()
        self.client.post(f"/api/orders/{order['id']}/cancel/")
        self.login(self.user)
        self.post_webhook(self.event(data["razorpay_order_id"], 80000), event_id="evt_late")
        o = Order.objects.get(pk=order["id"])
        self.assertEqual((o.status, o.payment_status), (OrderStatus.CANCELLED, PaymentStatus.REFUND_PENDING))

    def test_webhook_payment_failed_event(self):
        order, data = self.start()
        self.post_webhook(self.event(data["razorpay_order_id"], 80000, "payment.failed", "failed"))
        self.assertEqual(Order.objects.get(pk=order["id"]).payment_status, PaymentStatus.FAILED)


class NotificationReviewTests(Base):
    def deliver(self):
        self.add(self.p1, 1)
        oid = self.checkout().data["id"]
        for s in ("CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"):
            advance_status(oid, s)

    def test_notification_list_read_and_isolation(self):
        self.add(self.p1, 1)
        self.checkout()
        r = self.client.get("/api/notifications/")
        self.assertEqual((r.data["count"], r.data["unread_count"]), (1, 1))
        nid = r.data["results"][0]["id"]
        self.client.post(f"/api/notifications/{nid}/read/")
        self.assertEqual(self.client.get("/api/notifications/").data["unread_count"], 0)
        self.login(User.objects.create_user("b@x.com", PW, first_name="B"))
        self.assertEqual(self.client.post(f"/api/notifications/{nid}/read/").status_code, 404)

    def test_device_token_validation(self):
        self.assertEqual(self.client.post("/api/notifications/device-token/", {"token": "junk"}).status_code, 400)
        self.assertEqual(self.client.post("/api/notifications/device-token/", {"token": "ExponentPushToken[abc]"}).status_code, 201)

    def test_review_requires_delivery_and_updates_rating(self):
        url = f"/api/products/{self.p1.id}/reviews/"
        self.assertEqual(self.client.post(url, {"rating": 5}).status_code, 403)
        self.deliver()
        self.assertEqual(self.client.post(url, {"rating": 6}).status_code, 400)
        self.assertEqual(self.client.post(url, {"rating": 4, "comment": "ok"}).status_code, 201)
        self.assertEqual(self.client.post(url, {"rating": 5, "comment": "great"}).status_code, 200)  # update, not duplicate
        self.p1.refresh_from_db()
        self.assertEqual((self.p1.avg_rating, self.p1.review_count), (Decimal("5.00"), 1))
        self.client.credentials()
        self.assertEqual(self.client.get(url).data["count"], 1)  # public read
        self.login(self.user)
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.p1.refresh_from_db()
        self.assertEqual(self.p1.review_count, 0)


class AdminDashboardTests(Base):
    def test_dashboard_renders_with_sales_data(self):
        self.add(self.p1, 1)
        self.checkout()
        admin = User.objects.create_superuser("admin@x.com", PW, first_name="Admin")
        self.client.credentials()
        self.client.force_login(admin)
        r = self.client.get("/admin/")
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, "Total sales")
        self.assertContains(r, "Best-selling products")
        self.assertEqual(r.context["stats"]["total_orders"], 1)

    def test_admin_requires_staff(self):
        self.client.credentials()
        self.client.force_login(self.user)
        self.assertEqual(self.client.get("/admin/").status_code, 302)  # redirected to admin login
