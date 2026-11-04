"""Customer order management (admin panel + staff API). Uses the existing Order/OrderItem models."""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command

from orders.models import Order, OrderStatus, OrderStatusHistory
from tests.test_phase2 import PW, Base

User = get_user_model()


class OrderManagementTests(Base):
    def setUp(self):
        super().setUp()
        self.add(self.p1, 2)
        self.order_id = self.checkout().data["id"]
        self.staff = User.objects.create_superuser("boss@x.com", PW, first_name="Boss")
        self.other = User.objects.create_user("b@x.com", PW, first_name="Bee")

    def as_staff(self):
        self.client.credentials()
        self.login(self.staff)

    # ---- staff API ----
    def test_api_requires_staff(self):
        self.assertEqual(self.client.get("/api/admin/orders/").status_code, 403)  # normal customer
        self.client.credentials()
        self.assertEqual(self.client.get("/api/admin/orders/").status_code, 401)

    def test_list_has_customer_totals_and_filters(self):
        self.as_staff()
        r = self.client.get("/api/admin/orders/")
        self.assertEqual(r.status_code, 200, r.data)
        row = r.data["results"][0]
        self.assertEqual(row["customer"]["email"], "a@x.com")
        self.assertEqual((row["status"], row["payment_method"], row["item_count"]), ("PLACED", "COD", 2))
        for q, n in [("?status=PLACED", 1), ("?status=SHIPPED", 0), ("?search=Alpha", 1), ("?search=nomatch", 0),
                     ("?search=a@x.com", 1), ("?payment_method=COD", 1), ("?payment_status=PAID", 0),
                     ("?date_from=2000-01-01", 1), ("?date_to=2000-01-01", 0), (f"?user={self.user.id}", 1),
                     (f"?user={self.other.id}", 0)]:
            self.assertEqual(self.client.get("/api/admin/orders/" + q).data["count"], n, q)
        self.assertEqual(self.client.get("/api/admin/orders/?date_from=bad").status_code, 400)

    def test_detail_shows_everything_and_hides_secrets(self):
        self.as_staff()
        d = self.client.get(f"/api/admin/orders/{self.order_id}/").data
        self.assertEqual(d["shipping_name"], "A B")
        self.assertIn("Chennai", d["shipping_address"])
        self.assertEqual(d["items"][0]["product_name"], "Alpha")
        self.assertEqual(d["items"][0]["quantity"], 2)
        self.assertEqual(d["history"][0]["status"], "PLACED")
        self.assertIn("SHIPPED", d["allowed_next_statuses"])
        self.assertNotIn("razorpay_signature", str(d))

    def test_status_update_forward_only_and_history(self):
        self.as_staff()
        url = f"/api/admin/orders/{self.order_id}/status/"
        r = self.client.post(url, {"status": "SHIPPED", "note": "Handed to courier"}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["status"], "SHIPPED")
        self.assertEqual(Order.objects.get(pk=self.order_id).status, OrderStatus.SHIPPED)
        h = OrderStatusHistory.objects.filter(order_id=self.order_id).last()
        self.assertEqual((h.status, h.changed_by_id, h.note), ("SHIPPED", self.staff.id, "Handed to courier"))
        self.assertEqual(self.client.post(url, {"status": "CONFIRMED"}, format="json").status_code, 400)  # backwards
        self.assertEqual(self.client.post(url, {"status": "NOPE"}, format="json").status_code, 400)
        self.assertEqual(len(self.client.get(f"/api/admin/orders/{self.order_id}/history/").data), 2)

    def test_delivered_cod_becomes_paid_and_cancel_restores_stock(self):
        self.as_staff()
        url = f"/api/admin/orders/{self.order_id}/status/"
        self.assertEqual(self.client.post(url, {"status": "DELIVERED"}, format="json").data["payment_status"], "PAID")
        # second order: cancel
        self.login(self.user)
        self.add(self.p1, 1)
        oid = self.checkout().data["id"]
        self.p1.refresh_from_db()
        before = self.p1.stock
        self.as_staff()
        r = self.client.post(f"/api/admin/orders/{oid}/status/", {"status": "CANCELLED"}, format="json")
        self.assertEqual(r.data["status"], "CANCELLED")
        self.p1.refresh_from_db()
        self.assertEqual(self.p1.stock, before + 1)

    def test_order_manager_role_can_update_but_support_cannot(self):
        call_command("setup_roles", verbosity=0)
        mgr = User.objects.create_user("mgr@x.com", PW, is_staff=True)
        mgr.groups.add(Group.objects.get(name="Order Manager"))
        sup = User.objects.create_user("sup@x.com", PW, is_staff=True)
        sup.groups.add(Group.objects.get(name="Support (read-only)"))
        self.client.credentials()
        self.login(sup)
        self.assertEqual(self.client.get("/api/admin/orders/").status_code, 200)
        self.assertEqual(self.client.post(f"/api/admin/orders/{self.order_id}/status/", {"status": "CONFIRMED"}, format="json").status_code, 403)
        self.client.credentials()
        self.login(mgr)
        self.assertEqual(self.client.post(f"/api/admin/orders/{self.order_id}/status/", {"status": "CONFIRMED"}, format="json").status_code, 200)

    # ---- customer API order history ----
    def test_customer_history_filters_and_isolation(self):
        self.assertEqual(self.client.get("/api/orders/").data["count"], 1)
        self.assertEqual(self.client.get("/api/orders/?status=CANCELLED").data["count"], 0)
        self.assertEqual(self.client.get("/api/orders/?search=Alpha").data["count"], 1)
        self.client.credentials()
        self.login(self.other)
        self.assertEqual(self.client.get("/api/orders/").data["count"], 0)
        self.assertEqual(self.client.get(f"/api/orders/{self.order_id}/").status_code, 404)

    # ---- Django admin ----
    def test_admin_pages(self):
        self.client.credentials()
        self.client.force_login(self.staff)
        r = self.client.get("/admin/orders/order/")
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, "a@x.com")
        for q in ("?q=Alpha", "?status__exact=PLACED", f"?user__id__exact={self.user.id}", "?q=9876543210"):
            self.assertEqual(self.client.get("/admin/orders/order/" + q).status_code, 200, q)
        r = self.client.get(f"/admin/orders/order/{self.order_id}/change/")
        self.assertEqual(r.status_code, 200)
        for text in ("Update order status", "Alpha", "Chennai", "a@x.com", "View all 1 order"):
            self.assertContains(r, text)

    def test_admin_status_form(self):
        self.client.credentials()
        self.client.force_login(self.staff)
        url = f"/admin/orders/order/{self.order_id}/update-status/"
        self.assertEqual(self.client.get(url).status_code, 302)  # POST only
        r = self.client.post(url, {"status": "CONFIRMED", "note": "ok"}, follow=True)
        self.assertContains(r, "is now")
        self.assertEqual(Order.objects.get(pk=self.order_id).status, "CONFIRMED")
        r = self.client.post(url, {"status": "PLACED"}, follow=True)  # backwards -> error message, no change
        self.assertEqual(Order.objects.get(pk=self.order_id).status, "CONFIRMED")
        self.assertContains(r, "forward")


class BackwardStatusTests(Base):
    """Backward moves: admins only, mandatory reason, full audit trail; forward flow unchanged."""

    def setUp(self):
        super().setUp()
        self.add(self.p1, 1)
        self.oid = self.checkout().data["id"]
        self.staff = User.objects.create_superuser("boss@x.com", PW)
        self.url = f"/api/admin/orders/{self.oid}/status/"
        self.client.credentials()
        self.login(self.staff)
        self.client.post(self.url, {"status": "SHIPPED"}, format="json")  # forward still works

    def back(self, status, reason=None):
        body = {"status": status}
        if reason is not None:
            body["reason"] = reason
        return self.client.post(self.url, body, format="json")

    def test_reason_is_mandatory(self):
        for r in (None, "", "   "):
            self.assertEqual(self.back("PROCESSING", r).status_code, 400)
        self.assertEqual(Order.objects.get(pk=self.oid).status, "SHIPPED")

    def test_backward_move_is_recorded_completely(self):
        r = self.back("PLACED", "Wrong courier, repacking")  # any earlier status
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["status"], "PLACED")
        h = OrderStatusHistory.objects.filter(order_id=self.oid).last()
        self.assertEqual((h.previous_status, h.status, h.note, h.changed_by_id), ("SHIPPED", "PLACED", "Wrong courier, repacking", self.staff.id))
        self.assertIsNotNone(h.created_at)
        last = r.data["history"][-1]
        self.assertEqual((last["previous_status"], last["status"], last["reason"], last["changed_by_id"]),
                         ("SHIPPED", "PLACED", "Wrong courier, repacking", self.staff.id))
        self.assertEqual(self.back("SHIPPED", "").status_code, 200)  # going forward again needs no reason

    def test_invalid_targets(self):
        self.assertEqual(self.back("DELIVERED", "x").status_code, 200)  # forward path ignores reason
        self.assertEqual(self.back("SHIPPED", "x").status_code, 200)
        self.assertEqual(self.back("SHIPPED", "x").status_code, 400)  # same status is not a backward move
        Order.objects.filter(pk=self.oid).update(status="CANCELLED")
        self.assertEqual(self.back("PLACED", "x").status_code, 400)  # cancelled orders are final

    def test_cod_payment_reopened_when_delivered_order_moves_back(self):
        self.client.post(self.url, {"status": "DELIVERED"}, format="json")
        self.assertEqual(Order.objects.get(pk=self.oid).payment_status, "PAID")
        self.back("OUT_FOR_DELIVERY", "Delivery attempt failed")
        self.assertEqual(Order.objects.get(pk=self.oid).payment_status, "PENDING")

    def test_customers_and_non_admin_staff_cannot(self):
        self.client.credentials()
        self.login(self.user)  # regular customer
        self.assertEqual(self.back("PLACED", "x").status_code, 403)
        sup = User.objects.create_user("sup@x.com", PW, is_staff=True)  # staff without change_order
        self.client.credentials()
        self.login(sup)
        self.assertEqual(self.back("PLACED", "x").status_code, 403)
        self.client.credentials()
        self.assertEqual(self.back("PLACED", "x").status_code, 401)
        self.assertEqual(Order.objects.get(pk=self.oid).status, "SHIPPED")
        # the service itself also refuses, whoever calls it
        from rest_framework.exceptions import PermissionDenied
        from orders import services
        with self.assertRaises(PermissionDenied):
            services.revert_status(self.oid, "PLACED", by=self.user, reason="x")
        with self.assertRaises(PermissionDenied):
            services.revert_status(self.oid, "PLACED", by=None, reason="x")

    def test_customer_cannot_see_reason_and_tracking_still_works(self):
        self.back("PROCESSING", "Internal: stock mismatch")
        self.client.credentials()
        self.login(self.user)
        d = self.client.get(f"/api/orders/{self.oid}/").data
        self.assertNotIn("stock mismatch", str(d))
        t = self.client.get(f"/api/orders/{self.oid}/tracking/").data
        self.assertEqual(t["status"], "PROCESSING")
        shipped = [s for s in t["stages"] if s["status"] == "SHIPPED"][0]
        self.assertFalse(shipped["completed"])
        self.assertIsNone(shipped["timestamp"])

    def test_django_admin_form_and_history(self):
        self.client.credentials()
        self.client.force_login(self.staff)
        url = f"/admin/orders/order/{self.oid}/update-status/"
        r = self.client.post(url, {"status": "CONFIRMED", "reason": ""}, follow=True)  # no reason
        self.assertContains(r, "reason is required")
        self.assertEqual(Order.objects.get(pk=self.oid).status, "SHIPPED")
        r = self.client.post(url, {"status": "CONFIRMED", "reason": "Customer changed address"}, follow=True)
        self.assertEqual(Order.objects.get(pk=self.oid).status, "CONFIRMED")
        page = self.client.get(f"/admin/orders/order/{self.oid}/change/")
        for text in ("Customer changed address", "boss@x.com", "Move backward", "Previous status"):
            self.assertContains(page, text)
        # non-admin staff: backward option is not offered and the POST is refused
        sup = User.objects.create_user("sup@x.com", PW, is_staff=True)
        self.client.force_login(sup)
        self.assertEqual(self.client.post(url, {"status": "PLACED", "reason": "x"}).status_code, 302)  # no perm
        self.assertEqual(Order.objects.get(pk=self.oid).status, "CONFIRMED")


class AddressGpsTests(Base):
    """GPS (latitude/longitude) on addresses is optional, validated and returned by the API."""

    def payload(self, **extra):
        return {"full_name": "A B", "phone": "9876543210", "house_number": "1", "street": "Main Rd", "city": "Madurai",
                "state": "Tamil Nadu", "postal_code": "625001", **extra}

    def test_gps_saved_returned_and_updatable(self):
        r = self.client.post("/api/addresses/", self.payload(latitude="9.919300", longitude="78.119800"), format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual((r.data["latitude"], r.data["longitude"]), ("9.919300", "78.119800"))
        r2 = self.client.patch(f"/api/addresses/{r.data['id']}/", {"latitude": "10.000000", "longitude": "78.000000"}, format="json")
        self.assertEqual(r2.data["latitude"], "10.000000")
        mine = [a for a in self.client.get("/api/addresses/").data if a["id"] == r.data["id"]][0]
        self.assertEqual(mine["longitude"], "78.000000")

    def test_gps_optional_and_validated(self):
        r = self.client.post("/api/addresses/", self.payload(), format="json")
        self.assertEqual(r.status_code, 201)
        self.assertIsNone(r.data["latitude"])
        for bad in ({"latitude": "91", "longitude": "10"}, {"latitude": "10", "longitude": "181"}, {"latitude": "abc"}):
            self.assertEqual(self.client.post("/api/addresses/", self.payload(**bad), format="json").status_code, 400, bad)
